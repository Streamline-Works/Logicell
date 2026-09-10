import type { NextFunction, Request, Response } from "express";
import {
  requireAdminByCookie,
  resolveAuth,
  type AuthedUser,
} from "../services/auth.server";
import { applySupabaseHeaders } from "../lib/http";

export interface AuthedResponse extends Response {
  locals: { user?: AuthedUser; [key: string]: any };
}

export function getCookieHeader(req: Request): string | null {
  return req.headers.cookie ?? null;
}

export function getUser(res: AuthedResponse): AuthedUser {
  if (!res.locals.user) {
    const err: any = new Error("Não autenticado");
    err.status = 401;
    throw err;
  }
  return res.locals.user;
}

export async function requireUser(req: Request, res: AuthedResponse, next: NextFunction) {
  try {
    const { user, headers } = await resolveAuth(getCookieHeader(req));
    if (!user) {
      const err: any = new Error("Não autenticado");
      err.status = 401;
      throw err;
    }
    // Aplica cookies de rotação do refresh_token — sem isso, o Supabase renova
    // o token a cada request e estoura o rate-limit de auth (429).
    applySupabaseHeaders(res, headers);
    res.locals.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdmin(req: Request, res: AuthedResponse, next: NextFunction) {
  try {
    const { user, headers } = await requireAdminByCookie(getCookieHeader(req));
    applySupabaseHeaders(res, headers);
    res.locals.user = user;
    next();
  } catch (err) {
    next(err);
  }
}