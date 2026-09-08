import { Link, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigationMode } from "@/hooks/useNavigationMode";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Agenda", icon: Calendar },
  { to: "/people", label: "Pessoas & Equipe", icon: Users },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null | undefined;
}) {
  const router = useRouter();
  const { isSidebar, isCollapsed, toggleCollapsed } = useNavigationMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-180">
      {/* ───────────────────────────────────────────────────────────────────
          1. NAVEGAÇÃO MOBILE (< 640px / breakpoint sm:)
          Comportamento obrigatório: Sempre menu hambúrguer no topo (RF-13 / TC-13.5)
         ─────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md sm:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center transition-nocturne hover:opacity-85 touch-nav"
          >
            <img
              src="/branding/logo-completo-fundo-claro.png"
              alt="Hub Manager Tour"
              className="h-8 w-auto object-contain dark:hidden"
            />
            <img
              src="/branding/logo-card-fundo-escuro.png"
              alt="Hub Manager Tour"
              className="h-8 w-auto object-contain hidden dark:block"
            />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              className="flex size-9 items-center justify-center rounded-md border border-line text-muted-foreground transition-nocturne hover:text-foreground hover:bg-accent/40 active:scale-[0.97] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Menu Hambúrguer Suspenso Mobile */}
        {mobileMenuOpen ? (
          <div className="border-t border-line bg-card/95 backdrop-blur-lg px-4 py-4 space-y-3 animate-fade-slide-up sm:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav"
                    activeProps={{ className: "text-foreground font-semibold bg-accent/60 text-primary" }}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-line pt-3 flex items-center justify-between">
              {email ? (
                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                  {email}
                </span>
              ) : <div />}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-nocturne hover:bg-primary hover:text-primary-foreground hover:border-primary touch-feedback cursor-pointer"
              >
                <LogOut className="size-3" />
                Sair
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          2. NAVEGAÇÃO DESKTOP / TABLET (>= 640px / sm:)
          Modo A: Barra Lateral (Sidebar) com 240px ou 76px (RF-13)
         ─────────────────────────────────────────────────────────────────── */}
      {isSidebar ? (
        <div className="hidden sm:flex min-h-screen">
          <aside
            className={cn(
              "sticky top-0 h-screen flex flex-col justify-between border-r border-line bg-card/60 backdrop-blur-md transition-all duration-200 ease-in-out shrink-0 z-20",
              isCollapsed ? "w-[76px]" : "w-[240px]"
            )}
          >
            {/* Topo da Sidebar: Logo + Botão de Recolher/Expandir */}
            <div>
              <div
                className={cn(
                  "flex h-16 items-center border-b border-line px-3",
                  isCollapsed ? "justify-center relative" : "justify-between px-4"
                )}
              >
                <Link
                  to="/"
                  className="flex items-center transition-nocturne hover:opacity-85 touch-nav"
                >
                  {isCollapsed ? (
                    <>
                      <img
                        src="/branding/marca-simbolo-colorido.png"
                        alt="Hub Manager Tour"
                        className="size-8 object-contain dark:hidden"
                      />
                      <img
                        src="/branding/marca-simbolo-branco.png"
                        alt="Hub Manager Tour"
                        className="size-8 object-contain hidden dark:block"
                      />
                    </>
                  ) : (
                    <>
                      <img
                        src="/branding/logo-completo-fundo-claro.png"
                        alt="Hub Manager Tour"
                        className="h-8 w-auto object-contain dark:hidden"
                      />
                      <img
                        src="/branding/logo-card-fundo-escuro.png"
                        alt="Hub Manager Tour"
                        className="h-8 w-auto object-contain hidden dark:block"
                      />
                    </>
                  )}
                </Link>

                {/* Botão de alternância recolher/expandir */}
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  title={isCollapsed ? "Expandir barra lateral (240px)" : "Recolher barra lateral (76px)"}
                  aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md border border-line text-muted-foreground transition-nocturne hover:text-foreground hover:bg-accent/40 active:scale-[0.97] cursor-pointer",
                    isCollapsed ? "absolute -right-3.5 top-5 bg-card shadow-sm z-30" : ""
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3.5" />
                  ) : (
                    <ChevronLeft className="size-3.5" />
                  )}
                </button>
              </div>

              {/* Links de Navegação */}
              <nav className="flex flex-col gap-1.5 p-3">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-md font-mono text-xs uppercase tracking-wider transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav",
                        isCollapsed
                          ? "justify-center p-2.5 text-muted-foreground"
                          : "gap-3 px-3 py-2 text-muted-foreground"
                      )}
                      activeProps={{
                        className: cn(
                          "text-foreground font-semibold bg-accent/60 text-primary",
                          !isCollapsed ? "border-l-2 border-primary" : ""
                        ),
                      }}
                    >
                      <Icon className={isCollapsed ? "size-5 shrink-0" : "size-4 shrink-0"} />
                      {!isCollapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé da Sidebar: Alternador de Tema + Sessão + Sair (RF-12 & RF-13) */}
            <div className="border-t border-line p-3 space-y-3">
              <div
                className={cn(
                  "flex items-center",
                  isCollapsed ? "justify-center" : "justify-between px-1"
                )}
              >
                {!isCollapsed ? (
                  <span className="label-mono text-[10px] text-muted-foreground">Tema</span>
                ) : null}
                <ThemeToggle />
              </div>

              {!isCollapsed && email ? (
                <p className="label-mono text-[10px] text-muted-foreground truncate px-1">
                  {email}
                </p>
              ) : null}

              {isCollapsed ? (
                <button
                  type="button"
                  onClick={signOut}
                  title="Sair da plataforma"
                  aria-label="Sair"
                  className="flex size-9 w-full items-center justify-center rounded-md border border-line text-muted-foreground transition-nocturne hover:bg-destructive/10 hover:text-destructive hover:border-destructive active:scale-[0.97] cursor-pointer"
                >
                  <LogOut className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-line py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-nocturne hover:bg-primary hover:text-primary-foreground hover:border-primary touch-feedback cursor-pointer"
                >
                  <LogOut className="size-3" />
                  Sair
                </button>
              )}
            </div>
          </aside>

          {/* Área de Conteúdo Principal na Sidebar */}
          <div className="flex-1 min-w-0 flex flex-col min-h-screen">
            <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 animate-fade-slide-up flex-1">
              {children}
            </main>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────────────
           2. NAVEGAÇÃO DESKTOP / TABLET (>= 640px / sm:)
           Modo B: Cabeçalho Superior Padrão (RF-13 / TC-13.3)
          ─────────────────────────────────────────────────────────────────── */
        <>
          <header className="hidden sm:block sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-6">
              <Link
                to="/"
                className="flex items-center transition-nocturne hover:opacity-85 touch-nav"
              >
                {/* Tema claro */}
                <img
                  src="/branding/logo-completo-fundo-claro.png"
                  alt="Hub Manager Tour"
                  className="h-9 sm:h-11 w-auto object-contain dark:hidden"
                />
                {/* Tema escuro */}
                <img
                  src="/branding/logo-card-fundo-escuro.png"
                  alt="Hub Manager Tour"
                  className="h-9 sm:h-11 w-auto object-contain hidden dark:block"
                />
              </Link>
              <nav className="flex items-center gap-1 sm:gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-md px-2.5 py-1.5 transition-nocturne hover:text-foreground hover:bg-accent/40 touch-nav"
                    activeProps={{ className: "text-foreground font-semibold bg-accent/60" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                {email ? (
                  <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                    {email}
                  </span>
                ) : null}
                <button
                  type="button"
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
        </>
      )}
    </div>
  );
}
