import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Acesso do administrador do Hub Manager Tour para gerenciar shows, elenco e documentos de turnê.",
      },
      { property: "og:title", content: "Entrar — Hub Manager Tour" },
      {
        property: "og:description",
        content: "Acesso do administrador do Hub Manager Tour para gerenciar a logística de turnê.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.navigate({ to: "/" });
  }, [session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      setBusy(false);
      return;
    }
    setInfo("Conta criada! Verifique seu e-mail para confirmar o acesso antes de entrar.");
    setMode("signin");
    setBusy(false);
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError("Não foi possível entrar com o Google.");
    // Em caso de sucesso, o navegador é redirecionado pro Google agora —
    // nenhum código depois daqui roda nessa página.
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center flex flex-col items-center">
          {/* Logo oficial da marca */}
          <div className="mb-4 sm:mb-5 flex items-center justify-center w-full">
            <img
              src="/branding/logo-completo-fundo-claro.png"
              alt="Hub Manager Tour"
              className="h-24 sm:h-28 w-auto max-w-[290px] sm:max-w-[320px] object-contain dark:hidden -mb-3 sm:-mb-4"
            />
            <img
              src="/branding/logo-card-fundo-escuro.png"
              alt="Hub Manager Tour"
              className="h-16 sm:h-[74px] w-auto max-w-[270px] sm:max-w-[300px] object-contain hidden dark:block my-1.5 sm:my-2"
            />
          </div>
          <p className="label-mono">Acesso de administração</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O seu Hub de Gerenciamento de Turnês
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4 border border-line p-5">
          <div>
            <label className="label-mono" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-signal"
            />
          </div>
          <div>
            <label className="label-mono" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-signal"
            />
          </div>

          {error ? <p className="font-mono text-[11px] text-destructive">{error}</p> : null}
          {info ? <p className="font-mono text-[11px] text-ok">{info}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-foreground py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition-colors hover:bg-signal disabled:opacity-50 select-none touch-manipulation active:scale-[0.97] active:opacity-90 duration-120"
          >
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={google}
            className="w-full border border-line py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:bg-accent select-none touch-manipulation active:scale-[0.97] active:bg-accent duration-120"
          >
            Entrar com Google
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setInfo(null);
              setMode((m) => (m === "signin" ? "signup" : "signin"));
            }}
            className="w-full pt-1 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground select-none touch-manipulation active:opacity-70 duration-120"
          >
            {mode === "signin" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
