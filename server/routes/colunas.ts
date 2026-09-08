import { Router } from "express";
import { OrdemColunasService } from "../services/config.server";

export const colunasRouter = Router();

colunasRouter.get("/", async (_req, res, next) => {
  try {
    const order = await OrdemColunasService.get();
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

colunasRouter.put("/", async (req, res, next) => {
  try {
    const order = req.body?.order;
    if (!order) {
      res.status(400).json({ error: "Informe a ordem das colunas." });
      return;
    }
    await OrdemColunasService.set(order);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
