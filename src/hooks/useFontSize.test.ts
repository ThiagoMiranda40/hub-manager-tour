import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getInitialFontSize,
  applyFontSizeToDOM,
  FONT_SIZE_CONFIG,
  type FontSizeLevel,
} from "./useFontSize";

describe("Controle de Tamanho de Fonte (Opção B - useFontSize)", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  let storage: Record<string, string> = {};
  let rootAttributes: Record<string, string> = {};
  let rootStyle: { fontSize?: string } = {};

  beforeEach(() => {
    storage = {};
    rootAttributes = {};
    rootStyle = {};

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
        getAttribute: (attr: string) => rootAttributes[attr] ?? null,
        setAttribute: (attr: string, val: string) => {
          rootAttributes[attr] = val;
        },
        removeAttribute: (attr: string) => {
          delete rootAttributes[attr];
        },
        style: {
          set fontSize(val: string) {
            rootStyle.fontSize = val;
          },
          get fontSize() {
            return rootStyle.fontSize ?? "";
          },
        },
      } as unknown as HTMLElement,
    } as unknown as Document;

    globalThis.window = {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.localStorage = originalLocalStorage;
  });

  it("retorna 'normal' como padrão se não houver preferência salva", () => {
    expect(getInitialFontSize()).toBe("normal");
  });

  it("recupera 'large' ou 'xlarge' salvo em localStorage", () => {
    storage["hub_font_size"] = "large";
    expect(getInitialFontSize()).toBe("large");

    storage["hub_font_size"] = "xlarge";
    expect(getInitialFontSize()).toBe("xlarge");
  });

  it("ignora valor desconhecido em localStorage e cai no fallback 'normal'", () => {
    storage["hub_font_size"] = "invalid_value";
    expect(getInitialFontSize()).toBe("normal");
  });

  it("aplica 'normal' removendo o estilo inline no root", () => {
    applyFontSizeToDOM("normal");
    expect(rootAttributes["data-font-size"]).toBe("normal");
    expect(rootStyle.fontSize).toBe("");
  });

  it("aplica 'large' (115%) no fontSize do elemento html", () => {
    applyFontSizeToDOM("large");
    expect(rootAttributes["data-font-size"]).toBe("large");
    expect(rootStyle.fontSize).toBe("115%");
  });

  it("aplica 'xlarge' (130%) no fontSize do elemento html", () => {
    applyFontSizeToDOM("xlarge");
    expect(rootAttributes["data-font-size"]).toBe("xlarge");
    expect(rootStyle.fontSize).toBe("130%");
  });

  it("ciclo de 3 estados segue rigorosamente normal -> large -> xlarge -> normal", () => {
    const states: FontSizeLevel[] = ["normal", "large", "xlarge"];
    expect(FONT_SIZE_CONFIG.normal.nextLevel).toBe("large");
    expect(FONT_SIZE_CONFIG.large.nextLevel).toBe("xlarge");
    expect(FONT_SIZE_CONFIG.xlarge.nextLevel).toBe("normal");
  });
});
