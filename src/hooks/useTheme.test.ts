import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getInitialTheme } from "./useTheme";

describe("T-14 / RF-12: Lógica de Detecção e Persistência de Tema", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  let storage: Record<string, string> = {};
  let classList: Set<string> = new Set();
  let mediaMatches = false;

  beforeEach(() => {
    storage = {};
    classList = new Set();
    mediaMatches = false;

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
          contains: (cls: string) => classList.has(cls),
          add: (cls: string) => {
            classList.add(cls);
          },
          remove: (cls: string) => {
            classList.delete(cls);
          },
        } as unknown as DOMTokenList,
      } as unknown as HTMLElement,
    } as unknown as Document;

    globalThis.window = {
      matchMedia: (query: string) =>
        ({
          matches: mediaMatches,
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

  it("TC-12.1: segue prefers-color-scheme (dark) no primeiro acesso sem preferência salva", () => {
    mediaMatches = true;
    expect(getInitialTheme()).toBe("dark");
  });

  it("TC-12.1: segue prefers-color-scheme (light) no primeiro acesso sem preferência salva", () => {
    mediaMatches = false;
    expect(getInitialTheme()).toBe("light");
  });

  it("TC-12.2: preferência em localStorage prevalece sobre prefers-color-scheme", () => {
    storage["theme"] = "light";
    mediaMatches = true; // SO está em dark, mas usuário escolheu light
    expect(getInitialTheme()).toBe("light");

    storage["theme"] = "dark";
    mediaMatches = false; // SO está em light, mas usuário escolheu dark
    expect(getInitialTheme()).toBe("dark");
  });

  it("prioriza classe .dark já presente no elemento raiz do DOM", () => {
    classList.add("dark");
    expect(getInitialTheme()).toBe("dark");
  });

  it("partição inválida: rejeita valores inválidos no localStorage e faz fallback para prefers-color-scheme", () => {
    storage["theme"] = "invalid-theme-value";
    mediaMatches = true;
    expect(getInitialTheme()).toBe("dark");

    mediaMatches = false;
    expect(getInitialTheme()).toBe("light");
  });

  it("resiliência: trata exceção no localStorage (ex: SecurityError em modo privado restrito)", () => {
    globalThis.localStorage.getItem = () => {
      throw new Error("SecurityError: Access denied");
    };
    mediaMatches = true;
    expect(getInitialTheme()).toBe("dark");
  });

  it("resiliência: trata exceção ou ausência no matchMedia", () => {
    globalThis.window.matchMedia = () => {
      throw new Error("Not supported");
    };
    expect(getInitialTheme()).toBe("light");
  });

  it("SSR: retorna 'light' de forma segura quando window é undefined", () => {
    // @ts-expect-error simulando ambiente SSR
    delete globalThis.window;
    expect(getInitialTheme()).toBe("light");
  });
});
