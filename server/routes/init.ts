import { Router } from "express";
import { PastaService } from "../services/pasta.server";
import { OperacaoService } from "../services/operacao.server";
import { OrdemColunasService } from "../services/config.server";
import { getUser, type AuthedResponse } from "../middlewares/auth";

export const initRouter = Router();

//Dados de boot do cliente: pastas, contador da caixa de entrada e ordem de colunas.
initRouter.get("/", async (_req, res: AuthedResponse) => {
  const user = getUser(res);
  const [pastas, totalInbox, columnOrder] = await Promise.all([
    PastaService.listar().catch(() => []),
    OperacaoService.contarInbox().catch(() => 0),
    OrdemColunasService.get().catch(() => null),
  ]);
  res.json({ user, pastas, totalInbox, columnOrder });
});
