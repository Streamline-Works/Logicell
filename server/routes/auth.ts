import { Router } from "express";
import { createSupabaseServerClient } from "../services/supabase.server";
import { sessionStorage } from "../services/session.server";
import { resolveAuth } from "../services/auth.server";
import { getCookieHeader } from "../middlewares/auth";
import { applySupabaseHeaders } from "../lib/http";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      res.status(400).json({ error: "Informe e-mail e senha." });
      return;
    }

    const cookieHeader = getCookieHeader(req);
    const { supabase, response } = await createSupabaseServerClient(cookieHeader);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    const session = sessionStorage.getSession(cookieHeader);
    session.access_token = data.session?.access_token;
    session.refresh_token = data.session?.refresh_token;

    applySupabaseHeaders(res, response.headers);
    res.append("Set-Cookie", sessionStorage.commitSession(session));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const cookieHeader = getCookieHeader(req);
    const { supabase, response } = await createSupabaseServerClient(cookieHeader, {
      skipSessionSync: true,
    });
    await supabase.auth.signOut().catch(() => null);

    applySupabaseHeaders(res, response.headers);
    res.append("Set-Cookie", sessionStorage.destroySession());
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

//Retorna o usuário autenticado ou null (200) — o cliente decide o redirect.
authRouter.get("/me", async (req, res, next) => {
  try {
    const { user, headers } = await resolveAuth(getCookieHeader(req));
    applySupabaseHeaders(res, headers);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
