import { Navigate, useParams } from "react-router";
import { useInit } from "~/lib/query";
import { OperacoesView } from "~/views/OperacoesView";

export function OperacoesPage() {
  const { nome } = useParams();
  const { data: init } = useInit();

  // Rota de pasta (/pastas/:nome)
  if (nome) {
    const pasta = (init?.pastas || []).find((p: any) => p.nome === decodeURIComponent(nome));
    if (init && !pasta) return <Navigate to="/caixa-de-entrada" replace />;
    if (!pasta) return <GridLoading />;
    return <OperacoesView pastaId={pasta.id} nomePasta={pasta.nome} showImport={false} />;
  }

  // Caixa de entrada (/caixa-de-entrada)
  return <OperacoesView pastaId={null} nomePasta="Caixa de Entrada" showImport />;
}

function GridLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-bg">
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Carregando...</p>
    </div>
  );
}
