import { useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "~/context/AuthContext";
import { errorMessage } from "~/lib/api";
import { LoginView } from "~/views/LoginView";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/caixa-de-entrada" replace />;

  const handleSubmit = async (email: string, password: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const from = (location.state as any)?.from?.pathname;
      const redirectTo = from && from !== "/login" ? from : "/caixa-de-entrada";
      await signIn(email, password, redirectTo);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível entrar."));
      setSubmitting(false);
    }
  };

  return <LoginView onSubmit={handleSubmit} isSubmitting={submitting} error={error || undefined} />;
}
