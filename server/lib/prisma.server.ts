import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  try {
    const url = new URL(base);
    // Cap no pool para não esgotar o pooler do Supabase e timeout para não
    // deixar request travado esperando conexão (o gargalo é latência EU).
    url.searchParams.set("connection_limit", "10");
    url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return base;
  }
}

const prisma = global.__prisma ?? new PrismaClient({
  log: ["warn", "error"],
  datasourceUrl: buildDatasourceUrl(),
});

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
