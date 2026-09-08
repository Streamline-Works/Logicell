import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "~/lib/api";
import { formatarData } from "~/utils/formatters";

function processarDatas(dados: any[]) {
  if (!dados) return [];
  return dados.map((o) => ({
    ...o,
    dt_emissao_: o.dt_emissao_ && !(typeof o.dt_emissao_ === "string" && o.dt_emissao_.includes("/"))
      ? formatarData(o.dt_emissao_)
      : o.dt_emissao_,
    data_status: o.data_status && !(typeof o.data_status === "string" && o.data_status.includes("/"))
      ? formatarData(o.data_status)
      : o.data_status,
    dt_quitacao_saldo: o.dt_quitacao_saldo && !(typeof o.dt_quitacao_saldo === "string" && o.dt_quitacao_saldo.includes("/"))
      ? formatarData(o.dt_quitacao_saldo)
      : o.dt_quitacao_saldo,
  }));
}

function isFilterEmpty(filter: any) {
  if (!filter) return true;
  if (filter.type === "blank" || filter.type === "notBlank") return false;
  if (filter.type === "period") return filter.value.split(";").every((d: string) => !d);
  return filter.value === "";
}

export interface GridMeta {
  total: number;
  totalVl: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_META: GridMeta = { total: 0, totalVl: 0, page: 0, limit: 200, totalPages: 0 };

// Cache cliente da primeira página por pasta+filtros. O gargalo é a latência de
// rede (VPS/DB na Europa), então voltar a uma pasta já visitada deve ser
// instantâneo — os dados antigos aparecem na hora e revalidam em background.
const GRID_CACHE_TTL = 60_000;
const gridCache = new Map<string, { dados: any[]; meta: GridMeta; ts: number }>();

function cacheKeyOf(pastaId: number | null, filtersKey: string) {
  return `${pastaId ?? "inbox"}|${filtersKey}`;
}

function buildPage1Params(pastaId: number | null, limit = "200") {
  const p = new URLSearchParams();
  if (pastaId != null) p.set("pastaId", String(pastaId));
  p.set("page", "1");
  p.set("limit", limit);
  return p.toString();
}

//Prefetch leve usado no hover da sidebar para pré-carregar a primeira página
//da pasta antes mesmo do usuário clicar.
export async function prefetchOperacoes(pastaId: number | null) {
  const key = cacheKeyOf(pastaId, "{}");
  const cached = gridCache.get(key);
  if (cached && Date.now() - cached.ts < GRID_CACHE_TTL) return;

  try {
    const res = await api.get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildPage1Params(pastaId)}`);
    gridCache.set(key, { dados: res.data, meta: res.meta, ts: Date.now() });
  } catch {
    // prefetch falhou — a navegação normal resolve
  }
}

export function useOperacoesGridData({
  pastaId,
  columnFilters,
  sortColumns,
  enabled = true,
}: {
  pastaId: number | null;
  columnFilters: Record<string, any>;
  sortColumns: any[];
  enabled?: boolean;
}) {
  const [dados, setDados] = useState<any[]>([]);
  const [meta, setMeta] = useState<GridMeta>(EMPTY_META);
  const [status, setStatus] = useState<"idle" | "loading" | "loadingMore" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const seqRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const filtersKey = useMemo(
    () => JSON.stringify({ columnFilters, sortColumns }),
    [columnFilters, sortColumns]
  );

  const buildParams = useCallback(
    (page: number) => {
      const p = new URLSearchParams();
      if (pastaId != null) p.set("pastaId", String(pastaId));
      p.set("page", String(page));
      p.set("limit", searchParams.get("limit") || "200");
      const sort = sortColumns?.[0];
      if (sort) {
        p.set("sortCol", String(sort.columnKey));
        p.set("sortDir", sort.direction === "DESC" ? "desc" : "asc");
      }
      for (const [key, filter] of Object.entries(columnFilters)) {
        if (isFilterEmpty(filter)) continue;
        p.set(`colFilter_${key}`, `${(filter as any).type}:${(filter as any).value}`);
      }
      return p.toString();
    },
    [pastaId, sortColumns, columnFilters, searchParams]
  );

  // Carrega a primeira página. Se já existe cache fresco, mostra na hora e
  // revalida em background; senão busca com um debounce curto (200ms).
  useEffect(() => {
    if (!enabled) return;
    const seq = ++seqRef.current;
    const key = cacheKeyOf(pastaId, filtersKey);
    const cached = gridCache.get(key);
    const url = `/operacoes?${buildParams(1)}`;

    const storeResult = (raw: { data: any[]; meta: GridMeta }) => {
      gridCache.set(key, { dados: raw.data, meta: raw.meta, ts: Date.now() });
    };

    const fetchSilently = async () => {
      try {
        const res = await api.get<{ data: any[]; meta: GridMeta }>(url);
        if (seq !== seqRef.current) return;
        storeResult(res);
        setDados(processarDatas(res.data));
        setMeta(res.meta);
        setStatus("idle");
      } catch {
        // mantém os dados em cache mesmo se o refresh falhar
      }
    };

    const fetchFresh = async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await api.get<{ data: any[]; meta: GridMeta }>(url);
        if (seq !== seqRef.current) return;
        storeResult(res);
        setDados(processarDatas(res.data));
        setMeta(res.meta);
        setStatus("idle");
      } catch (err: any) {
        if (seq !== seqRef.current) return;
        setStatus("error");
        setError(err?.message || "Erro ao carregar operações.");
      }
    };

    if (cached && Date.now() - cached.ts < GRID_CACHE_TTL) {
      setDados(processarDatas(cached.dados));
      setMeta(cached.meta);
      setStatus("idle");
      setError(null);
      const t = setTimeout(() => fetchSilently(), 250);
      return () => clearTimeout(t);
    }

    setStatus("loading");
    const t = setTimeout(() => fetchFresh(), 200);
    return () => clearTimeout(t);
  }, [pastaId, filtersKey, enabled, buildParams]);

  // Recarrega a primeira página (após mutações), ignorando o cache.
  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    setStatus("loading");
    try {
      const res = await api.get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildParams(1)}`);
      if (seq !== seqRef.current) return;
      gridCache.set(cacheKeyOf(pastaId, filtersKey), { dados: res.data, meta: res.meta, ts: Date.now() });
      setDados(processarDatas(res.data));
      setMeta(res.meta);
      setStatus("idle");
    } catch (err: any) {
      if (seq !== seqRef.current) return;
      setStatus("error");
      setError(err?.message || "Erro ao recarregar operações.");
    }
  }, [buildParams, pastaId, filtersKey]);

  // Scroll infinito: carrega a próxima página e faz append sem duplicar
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, clientHeight, scrollHeight } = target;
      if (scrollHeight > 0 && scrollHeight - scrollTop - clientHeight < 400) {
        if (status === "idle" && meta.page < meta.totalPages && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setStatus("loadingMore");
          const page = meta.page + 1;
          api
            .get<{ data: any[]; meta: GridMeta }>(`/operacoes?${buildParams(page)}`)
            .then((res) => {
              setDados((prev) => {
                const existingIds = new Set(prev.map((d) => d.id));
                const toAdd = processarDatas(res.data).filter((o: any) => !existingIds.has(o.id));
                return [...prev, ...toAdd];
              });
              setMeta(res.meta);
            })
            .catch(() => {
              // mantém os dados atuais em caso de falha no scroll
            })
            .finally(() => {
              loadingMoreRef.current = false;
              setStatus("idle");
            });
        }
      }
    },
    [status, meta.page, meta.totalPages, buildParams]
  );

  return { dados, setDados, meta, status, error, handleScroll, refresh };
}