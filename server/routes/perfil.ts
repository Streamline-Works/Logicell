import { Router } from "express";
import prisma from "../lib/prisma.server";
import { createSupabaseServerClient } from "../services/supabase.server";
import { getUser, getCookieHeader, type AuthedResponse } from "../middlewares/auth";
import { applySupabaseHeaders } from "../lib/http";

export const perfilRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID de importação inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

perfilRouter.get("/", async (_req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    const totalPlanilhas = await prisma.importacao.count();
    const ultimasImportacoes = await prisma.importacao.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({ user, ultimasImportacoes, stats: { totalPlanilhas } });
  } catch (err) {
    next(err);
  }
});

perfilRouter.patch("/", async (req, res: AuthedResponse, next) => {
  try {
    const user = getUser(res);
    const cookieHeader = getCookieHeader(req);
    const nome = String(req.body?.nome || "").trim();
    if (!nome) {
      res.status(400).json({ error: "Nome não pode estar vazio" });
      return;
    }

    const { supabase, response } = await createSupabaseServerClient(cookieHeader);
    const { error } = await supabase.auth.updateUser({
      data: { nome, nickname: nome },
    });

    applySupabaseHeaders(res, response.headers);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, user: { ...user, user_metadata: { ...user.user_metadata, nome } } });
  } catch (err) {
    next(err);
  }
});

perfilRouter.post("/importacoes/:id/desfazer", async (req, res: AuthedResponse, next) => {
  try {
    getUser(res);
    const importacaoId = parseId(req.params.id);
    const { OperacaoImportService } = await import("../services/operacao-import.server");
    await OperacaoImportService.desfazerImportacao(importacaoId);
    res.json({ success: true, message: "Importação desfeita com sucesso!" });
  } catch (err: any) {
    next(err);
  }
});
