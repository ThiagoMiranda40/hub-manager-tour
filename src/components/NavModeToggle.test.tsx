import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NavModeToggle } from "./NavModeToggle";

describe("NavModeToggle Component", () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    let store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: () => null,
      length: 0,
    } as unknown as Storage;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  });

  it("renderiza o botão com ícone PanelLeft e título descritivo no modo padrão (header)", () => {
    const html = renderToStaticMarkup(<NavModeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('title="Alternar para barra lateral"');
    expect(html).toContain('aria-label="Ativar navegação por barra lateral"');
    expect(html).toContain("<svg");
  });

  it("renderiza o botão com ícone PanelTop e título descritivo quando no modo sidebar", () => {
    globalThis.localStorage.setItem("navigation_mode", "sidebar");
    const html = renderToStaticMarkup(<NavModeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('title="Alternar para cabeçalho superior"');
    expect(html).toContain('aria-label="Ativar navegação por cabeçalho superior"');
    expect(html).toContain("<svg");
  });

  it("permite passar classes CSS personalizadas", () => {
    const html = renderToStaticMarkup(<NavModeToggle className="custom-class size-8" />);
    expect(html).toContain("custom-class");
    expect(html).toContain("size-8");
  });
});
