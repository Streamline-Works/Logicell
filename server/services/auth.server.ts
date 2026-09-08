import { getSession } from "./session.server";
import { createSupabaseServerClient } from "./supabase.server";

export interface AuthedUser {
  id: string;
  aud?: string;
  role?: string;
  email?: string;
  app_metadata?: any;
  user_metadata?: any;
  created_at?: string;
}

function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isAdmin(user: any) {
  return user?.app_metadata?.role === "admin";
}

//Validação local ultra-rápida (0ms de rede): decodifica o JWT do cookie.
//Enquanto o token ainda não expirou, retorna o usuário SEM chamar o Supabase
//— isso evita gastar o rate-limit de auth a cada request.
export function getUserFromJwt(cookieHeader?: string | null): AuthedUser | null {
  const session = getSession(cookieHeader);
  const accessToken = session.access_token;
  if (!accessToken) return null;

  const decoded = parseJwt(accessToken);
  const now = Math.floor(Date.now() / 1000);

  if (decoded && decoded.exp > now) {
    return {
      id: decoded.sub,
      aud: decoded.aud || "authenticated",
      role: decoded.role || "authenticated",
      email: decoded.email,
      app_metadata: decoded.app_metadata || {},
      user_metadata: decoded.user_metadata || {},
      created_at: "",
    };
  }
  return null;
}

//Cache em memória da validação remota por access token. Quando o token expira,
//o refresh do Supabase é caro (rede) e rotaciona o refresh_token — sem cache,
//vários requests paralelos tentavam renovar ao mesmo tempo, estourando o
//rate-limit de auth (429). Com cache, renovamos no máximo 1x a cada 30s.
const remoteUserCache = new Map<string, { user: AuthedUser | null; ts: number }>();
const REMOTE_CACHE_TTL = 30_000;

//Resolve o usuário da requisição e retorna também os headers gerados pelo
//Supabase (ex.: Set-Cookie com o refresh_token rotacionado). O middleware de
//auth deve aplicar esses headers na resposta para NÃO repetir o refresh em
//todo request.
export async function resolveAuth(
  cookieHeader?: string | null
): Promise<{ user: AuthedUser | null; headers: Headers }> {
  const local = getUserFromJwt(cookieHeader);
  if (local) return { user: local, headers: new Headers() };

  const session = getSession(cookieHeader);
  const accessToken = session.access_token;

  if (accessToken) {
    const cached = remoteUserCache.get(accessToken);
    if (cached && Date.now() - cached.ts < REMOTE_CACHE_TTL) {
      return { user: cached.user, headers: new Headers() };
    }
  }

  try {
    const { supabase, response } = await createSupabaseServerClient(cookieHeader);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const result = (user as AuthedUser) ?? null;
    if (!error && accessToken) {
      remoteUserCache.set(accessToken, { user: result, ts: Date.now() });
    }
    return { user: result, headers: response.headers };
  } catch {
    // Falha de rede / rate-limit transitório: não derruba a sessão se ainda
    // existe um token local minimamente válido.
    return { user: getUserFromJwt(cookieHeader), headers: new Headers() };
  }
}

//Verifica se há um usuário sem disparar redirect.
export async function getUserByCookie(cookieHeader?: string | null): Promise<AuthedUser | null> {
  const { user } = await resolveAuth(cookieHeader);
  return user;
}

//Validação REMOTA (getUser) para que rebaixamentos e bloqueios de cargo
//tenham efeito imediato no acesso. Também aplica a rotação do refresh token.
export async function requireAdminByCookie(
  cookieHeader?: string | null
): Promise<{ user: AuthedUser; headers: Headers }> {
  const { supabase, response } = await createSupabaseServerClient(cookieHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const err: any = new Error("Não autenticado");
    err.status = 401;
    throw err;
  }

  if (!isAdmin(user)) {
    const err: any = new Error("Acesso restrito a administradores");
    err.status = 403;
    throw err;
  }

  return { user: user as AuthedUser, headers: response.headers };
}