import { Router } from "express";
import { AutomacaoService } from "../services/automacao.server";

export const automacoesRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

automacoesRouter.get("/", async (_req, res, next) => {
  try {
    const pastas = await AutomacaoService.listarRegrasPorPasta();
    res.json({ pastas });
  } catch (err) {
    next(err);
  }
});

automacoesRouter.post("/regras", async (req, res, next) => {
  try {
    const pastaId = parseId(req.body?.pastaId);
    const tipo = String(req.body?.tipo || "");
    const valor = String(req.body?.valor || "").trim().toUpperCase();

    if (!pastaId || !tipo || !valor) {
      res.status(400).json({ error: "Preencha todos os campos." });
      return;
    }

    await AutomacaoService.adicionarRegra(pastaId, tipo as "agencia" | "cliente" | "produto", valor);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

automacoesRouter.delete("/regras/:id", async (req, res, next) => {
  try {
    const regraId = parseId(req.params.id);
    await AutomacaoService.removerRegra(regraId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
