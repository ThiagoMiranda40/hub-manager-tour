import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, activeProps, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

import { AppShell } from "./AppShell";

describe("T-15 / RF-13: AppShell Adaptive Navigation Component", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};

    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: () => null,
      length: 0,
    } as unknown as Storage;

    globalThis.document = {
      documentElement: {
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
        } as unknown as DOMTokenList,
      } as unknown as HTMLElement,
    } as unknown as Document;

    globalThis.window = {
      matchMedia: (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  });

  it("TC-13.3: renderiza modo cabeçalho horizontal por padrão quando sem preferência", () => {
    const html = renderToStaticMarkup(
      <AppShell email="produtor@hub.com">
        <div>Conteúdo de teste</div>
      </AppShell>
    );

    // Deve conter os links de navegação principais
    expect(html).toContain("Agenda");
    expect(html).toContain("Pessoas &amp; Equipe");
    expect(html).toContain("Configurações");
    expect(html).toContain("produtor@hub.com");
    expect(html).toContain("Conteúdo de teste");

    // Cabeçalho desktop visível e sidebar oculta
    expect(html).toContain("header class=\"hidden sm:block sticky top-0");
  });

  it("TC-13.1: renderiza barra lateral (sidebar) expandida com 240px quando navigation_mode=sidebar", () => {
    storage["navigation_mode"] = "sidebar";
    storage["sidebar_collapsed"] = "false";

    const html = renderToStaticMarkup(
      <AppShell email="produtor@hub.com">
        <div>Conteúdo Sidebar</div>
      </AppShell>
    );

    // Deve conter aside com w-[240px]
    expect(html).toContain("w-[240px]");
    expect(html).toContain("title=\"Recolher barra lateral (76px)\"");
    expect(html).toContain("logo-completo-fundo-claro.png");
    expect(html).toContain("Conteúdo Sidebar");
  });

  it("TC-13.2: renderiza barra lateral recolhida com 76px e marca-simbolo quando sidebar_collapsed=true", () => {
    storage["navigation_mode"] = "sidebar";
    storage["sidebar_collapsed"] = "true";

    const html = renderToStaticMarkup(
      <AppShell email="produtor@hub.com">
        <div>Conteúdo Recolhido</div>
      </AppShell>
    );

    // Deve conter aside com w-[76px] e marca-simbolo
    expect(html).toContain("w-[76px]");
    expect(html).toContain("marca-simbolo-colorido.png");
    expect(html).toContain("title=\"Expandir barra lateral (240px)\"");
  });

  it("TC-13.5: sempre renderiza a barra móvel com botão de menu hambúrguer para telas menores que 640px", () => {
    const html = renderToStaticMarkup(
      <AppShell email="produtor@hub.com">
        <div>Mobile Check</div>
      </AppShell>
    );

    // Contém o header com breakpoint sm:hidden e botão de menu hambúrguer
    expect(html).toContain("sm:hidden");
    expect(html).toContain("aria-label=\"Abrir menu de navegação\"");
  });
});
