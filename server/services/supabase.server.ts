import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { getSession } from "./session.server";

export async function createSupabaseServerClient(
  cookieHeader?: string | null,
  options?: { skipSessionSync?: boolean }
) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
  }

  const response = {
    headers: new Headers(),
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return (cookieHeader ? parseCookieHeader(cookieHeader) : []).map((c) => ({
          name: c.name,
          value: c.value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.headers.append("Set-Cookie", serializeCookieHeader(name, value, options))
        );
      },
    },
  });

  // SINCRONIZAÇÃO: Carrega os tokens do nosso cookie de sessão corporativo
  const session = getSession(cookieHeader);
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;

  if (accessToken && !options?.skipSessionSync) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });
  }

  return { supabase, response };
}
