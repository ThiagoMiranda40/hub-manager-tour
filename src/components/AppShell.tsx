import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null | undefined;
}) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-180">
      <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            to="/"
            className="font-sans font-bold text-base sm:text-lg leading-none tracking-tight transition-nocturne hover:opacity-85 touch-nav"
          >
            HUB MANAGER TOUR<span className="text-primary font-black">.</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Link
              to="/"
              className="rounded-md px-2.5 py-1.5 transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav"
              activeProps={{ className: "text-foreground font-semibold bg-accent/60" }}
            >
              Agenda
            </Link>
            <Link
              to={"/people" as any}
              className="rounded-md px-2.5 py-1.5 transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav"
              activeProps={{ className: "text-foreground font-semibold bg-accent/60" }}
            >
              Pessoas & Equipe
            </Link>
            <Link
              to="/settings"
              className="rounded-md px-2.5 py-1.5 transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav"
              activeProps={{ className: "text-foreground font-semibold bg-accent/60" }}
            >
              Configurações
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {email ? (
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                {email}
              </span>
            ) : null}
            <button
              onClick={signOut}
              className="rounded-md border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-nocturne hover:bg-primary hover:text-primary-foreground hover:border-primary touch-feedback cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 animate-fade-slide-up">
        {children}
      </main>
    </div>
  );
}
