import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FontSizeToggle } from "./FontSizeToggle";

describe("FontSizeToggle Component (Opção B)", () => {
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
        getAttribute: () => null,
        setAttribute: () => {},
        style: {
          set fontSize(_: string) {},
          get fontSize() {
            return "";
          },
        },
      } as unknown as HTMLElement,
    } as unknown as Document;

    globalThis.window = {
      dispatchEvent: () => true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  });

  it("renderiza o botão com letra A e atributos de acessibilidade no nível padrão", () => {
    const html = renderToStaticMarkup(<FontSizeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('title="Tamanho da fonte: Normal (100%) (clique para alternar)"');
    expect(html).toContain(
      'aria-label="Tamanho do texto: Normal (100%). Ativar tamanho Grande."'
    );
    expect(html).toContain(">A<");
  });

  it("aceita classes personalizadas de layout como size-8 p-0", () => {
    const html = renderToStaticMarkup(<FontSizeToggle className="size-8 p-0" />);
    expect(html).toContain("size-8");
    expect(html).toContain("p-0");
  });
});
