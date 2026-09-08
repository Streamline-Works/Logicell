import { Router } from "express";
import { PastaService } from "../services/pasta.server";

export const pastasRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

pastasRouter.post("/", async (req, res, next) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const pasta = await PastaService.criar(nome, cor);
    res.json({ success: true, pasta });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

pastasRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const nome = String(req.body?.nome || "").trim();
    const cor = req.body?.cor ? String(req.body.cor) : undefined;
    if (!nome) {
      res.status(400).json({ error: "Informe o nome da pasta." });
      return;
    }
    const pasta = await PastaService.atualizar(id, nome, cor);
    res.json({ success: true, pasta });
  } catch (err: any) {
    if (!err?.status) err.status = 400;
    next(err);
  }
});

pastasRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await PastaService.excluir(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
