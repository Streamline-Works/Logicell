import { QueryClient, useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  init: ["init"] as const,
  automacoes: ["automacoes"] as const,
  usuarios: (page: number) => ["usuarios", page] as const,
  perfil: ["perfil"] as const,
  faturistas: ["faturistas"] as const,
  prazos: ["prazos"] as const,
};

export interface InitData {
  user: any;
  pastas: any[];
  totalInbox: number;
  columnOrder: string[] | null;
  // Contagem de emissões antigas por pasta (chave "inbox" = Caixa de Entrada).
  emissaoAntigasPorPasta: Record<string, number>;
}

// Dados de boot (sidebar + ordem de colunas). Mantidos frescos com polling
// leve apenas com a aba em foco — é o que dá o "tempo real" dos contadores
// da sidebar sem custo quando o usuário não está olhando.
export function useInit() {
  return useQuery({
    queryKey: queryKeys.init,
    queryFn: () => api.get<InitData>("/init"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });
}

export interface Faturista {
  id: string;
  nome: string;
  email: string;
}

// Lista de usuários ativos que podem ser atribuídos como faturista de uma pasta.
export function useFaturistas() {
  return useQuery({
    queryKey: queryKeys.faturistas,
    queryFn: () => api.get<{ faturistas: Faturista[] }>("/pastas/faturistas"),
    staleTime: 60_000,
  });
}

export interface PrazoClienteItem {
  id: number;
  cliente: string;
  prazoDias: number;
}

// Regras de "emissão antiga": prazo padrão global + exceções por cliente.
export function usePrazos() {
  return useQuery({
    queryKey: queryKeys.prazos,
    queryFn: () => api.get<{ padrao: number; clientes: PrazoClienteItem[] }>("/prazos"),
    staleTime: 60_000,
  });
}