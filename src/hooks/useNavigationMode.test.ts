import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getInitialNavigationMode, getInitialSidebarCollapsed } from "./useNavigationMode";

describe("T-15 / RF-13: useNavigationMode Hook & Storage Resolution", () => {
  const originalWindow = globalThis.window;
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

    globalThis.window = {
      dispatchEvent: () => true,
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  });

  it("TC-13.3: padrão inicial de navegação é modo cabeçalho (header)", () => {
    expect(getInitialNavigationMode()).toBe("header");
  });

  it("TC-13.1 & TC-13.4: recupera modo sidebar quando salvo em localStorage", () => {
    storage["navigation_mode"] = "sidebar";
    expect(getInitialNavigationMode()).toBe("sidebar");
  });

  it("partição inválida: rejeita valores inválidos de navigation_mode e faz fallback para header", () => {
    storage["navigation_mode"] = "invalid_mode";
    expect(getInitialNavigationMode()).toBe("header");
  });

  it("TC-13.1: padrão inicial de recolhimento da sidebar é expandida (false)", () => {
    expect(getInitialSidebarCollapsed()).toBe(false);
  });

  it("TC-13.2 & TC-13.4: recupera estado de recolhimento true quando salvo em localStorage", () => {
    storage["sidebar_collapsed"] = "true";
    expect(getInitialSidebarCollapsed()).toBe(true);
  });

  it("partição inválida: rejeita valores inválidos de sidebar_collapsed e faz fallback para false", () => {
    storage["sidebar_collapsed"] = "corrupted";
    expect(getInitialSidebarCollapsed()).toBe(false);
  });

  it("resiliência: trata exceção no localStorage sem quebrar", () => {
    globalThis.localStorage.getItem = () => {
      throw new Error("SecurityError: Access Denied");
    };
    expect(getInitialNavigationMode()).toBe("header");
    expect(getInitialSidebarCollapsed()).toBe(false);
  });

  it("SSR: retorna valores padrão de forma segura quando window é undefined", () => {
    // @ts-expect-error simulando SSR
    delete globalThis.window;
    expect(getInitialNavigationMode()).toBe("header");
    expect(getInitialSidebarCollapsed()).toBe(false);
  });
});
