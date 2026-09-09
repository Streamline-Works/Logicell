import { Router } from "express";
import { PrazoService } from "../services/prazo.server";
import { OperacaoService } from "../services/operacao.server";

export const prazosRouter = Router();

function parseId(value: any): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    const err: any = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return id;
}

function parsePrazoDias(value: any): number {
  const dias = Number(value);
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    const err: any = new Error("Prazo deve ser um número inteiro entre 1 e 3650 dias.");
    err.status = 400;
    throw err;
  }
  return dias;
}

// Regras atuais: prazo padrão global + exceções por cliente.
prazosRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await PrazoService.listar());
  } catch (err) {
    next(err);
  }
});

// Autocomplete de clientes que existem nas operações.
prazosRouter.get("/clientes/sugestoes", async (req, res, next) => {
  try {
    const q = String(req.query.q || "");
    res.json({ clientes: await PrazoService.sugerirClientes(q) });
  } catch (err) {
    next(err);
  }
});

prazosRouter.put("/padrao", async (req, res, next) => {
  try {
    const prazoDias = parsePrazoDias(req.body?.prazoDias);
    await PrazoService.atualizarPadrao(prazoDias);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

prazosRouter.post("/clientes", async (req, res, next) => {
  try {
    const cliente = String(req.body?.cliente || "").trim();
    const prazoDias = parsePrazoDias(req.body?.prazoDias);
    if (!cliente) {
      res.status(400).json({ error: "Informe o nome do cliente." });
      return;
    }
    await PrazoService.adicionarCliente(cliente, prazoDias);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

prazosRouter.patch("/clientes/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const prazoDias = parsePrazoDias(req.body?.prazoDias);
    await PrazoService.atualizarCliente(id, prazoDias);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

prazosRouter.delete("/clientes/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await PrazoService.removerCliente(id);
    OperacaoService.invalidarCache();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
