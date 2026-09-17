import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle Component (RF-12)", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
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
      dispatchEvent: () => true,
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  });

  it("renderiza o botão com ícone de lua e atributos acessíveis no tema padrão (light)", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('title="Alternar para tema escuro"');
    expect(html).toContain('aria-label="Ativar tema escuro"');
    expect(html).toContain("<svg");
  });

  it("renderiza o botão com atributos acessíveis de tema claro quando em dark mode", () => {
    globalThis.document = {
      documentElement: {
        classList: {
          contains: (cls: string) => cls === "dark",
          add: () => {},
          remove: () => {},
        } as unknown as DOMTokenList,
      } as unknown as HTMLElement,
    } as unknown as Document;

    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('title="Alternar para tema claro"');
    expect(html).toContain('aria-label="Ativar tema claro"');
    expect(html).toContain("<svg");
  });

  it("garante type='button' para prevenir submissão acidental de formulários pais", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('type="button"');
  });

  it("aplica classes adicionais repassadas via prop className", () => {
    const html = renderToStaticMarkup(<ThemeToggle className="custom-test-class" />);
    expect(html).toContain("custom-test-class");
  });
});
