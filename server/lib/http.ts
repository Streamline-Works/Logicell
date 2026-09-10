import type { Response } from "express";

//Aplica os headers (ex.: Set-Cookie gerado pelo Supabase ao renovar tokens)
//produzidos pelo client SSR nas rotas do Express.
export function applySupabaseHeaders(res: Response, headers: Headers): void {
  const anyHeaders = headers as any;
  const setCookies: string[] =
    typeof anyHeaders.getSetCookie === "function" ? (anyHeaders.getSetCookie() as string[]) : [];

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });

  setCookies.forEach((cookie) => res.append("Set-Cookie", cookie));
}
