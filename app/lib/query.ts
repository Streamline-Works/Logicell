import { QueryClient, useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  init: ["init"] as const,
  automacoes: ["automacoes"] as const,
  usuarios: (page: number) => ["usuarios", page] as const,
  perfil: ["perfil"] as const,
};

export interface InitData {
  user: any;
  pastas: any[];
  totalInbox: number;
  columnOrder: string[] | null;
}

// Dados de boot (sidebar + ordem de colunas). Mantidos frescos com polling
// leve apenas com a aba em foco — é o que dá o "tempo real" dos contadores
// da sidebar sem custo quando o usuário não está olhando.
export function useInit() {
  return useQuery({
    queryKey: queryKeys.init,
    queryFn: () => api.get<InitData>("/init"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });
}