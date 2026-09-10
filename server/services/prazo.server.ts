import prisma from "../lib/prisma.server";

export interface PrazoClienteItem {
  id: number;
  cliente: string;
  prazoDias: number;
}

export interface PrazoRegras {
  padraoDias: number;
  // Mapa cliente normalizado (trim + uppercase) -> prazoDias
  porCliente: Record<string, number>;
}

interface CacheShape {
  padraoDias: number;
  clientes: PrazoClienteItem[];
}

//PrazoService
//Responsabilidade: Regras de "emissão antiga" — prazo padrão global
//(Configuracao id=1) + exceções por cliente (nm_pessoa_pagador).
export class PrazoService {
  private static cache: CacheShape | null = null;
  private static cacheTime = 0;
  private static readonly TTL = 1000 * 60; // 1 minuto

  static invalidarCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  static async listar(): Promise<{ padrao: number; clientes: PrazoClienteItem[] }> {
    if (!this.cache || Date.now() - this.cacheTime >= this.TTL) {
      const [config, clientes] = await Promise.all([
        prisma.configuracao.findUnique({ where: { id: 1 } }),
        prisma.prazoCliente.findMany({ orderBy: { cliente: "asc" } }),
      ]);
      this.cache = {
        padraoDias: config?.prazoPadraoDias ?? 10,
        clientes,
      };
      this.cacheTime = Date.now();
    }
    return { padrao: this.cache.padraoDias, clientes: this.cache.clientes };
  }

  // Regras prontas para consulta em cada linha de operação (chave normalizada).
  static async regras(): Promise<PrazoRegras> {
    const { padrao, clientes } = await this.listar();
    const porCliente: Record<string, number> = {};
    for (const c of clientes) {
      porCliente[this.normalizar(c.cliente)] = c.prazoDias;
    }
    return { padraoDias: padrao, porCliente };
  }

  static normalizar(valor: string): string {
    return valor.trim().toUpperCase();
  }

  static async atualizarPadrao(prazoDias: number) {
    this.invalidarCache();
    await prisma.configuracao.upsert({
      where: { id: 1 },
      update: { prazoPadraoDias: prazoDias },
      create: { id: 1, prazoPadraoDias: prazoDias },
    });
  }

  static async adicionarCliente(cliente: string, prazoDias: number) {
    this.invalidarCache();
    const nome = this.normalizar(cliente);
    if (!nome) throw new Error("Informe o nome do cliente.");

    const existe = await prisma.prazoCliente.findFirst({
      where: { cliente: { equals: nome, mode: "insensitive" } },
    });
    if (existe) {
      throw new Error("Já existe um prazo configurado para este cliente.");
    }

    return prisma.prazoCliente.create({ data: { cliente: nome, prazoDias } });
  }

  static async atualizarCliente(id: number, prazoDias: number) {
    this.invalidarCache();
    return prisma.prazoCliente.update({ where: { id }, data: { prazoDias } });
  }

  static async removerCliente(id: number) {
    this.invalidarCache();
    await prisma.prazoCliente.delete({ where: { id } });
  }

  // Sugestões de clientes existentes nas operações (para o autocomplete).
  static async sugerirClientes(q: string, limite = 20) {
    const busca = `%${this.normalizar(q || "").replace(/[%_]/g, "")}%`;
    if (!busca.replace(/%/g, "")) return [];
    const rows = await prisma.$queryRaw<{ cliente: string }[]>`
      SELECT UPPER(TRIM(nm_pessoa_pagador)) AS cliente
      FROM "Operacao"
      WHERE nm_pessoa_pagador IS NOT NULL AND TRIM(nm_pessoa_pagador) <> ''
        AND UPPER(nm_pessoa_pagador) ILIKE ${busca}
      GROUP BY UPPER(TRIM(nm_pessoa_pagador))
      ORDER BY COUNT(*) DESC
      LIMIT ${limite}
    `;
    return rows.map((r) => r.cliente);
  }
}
