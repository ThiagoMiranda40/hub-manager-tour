import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppIntroSplash } from "./AppIntroSplash";

describe("AppIntroSplash Component", () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    globalThis.sessionStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    globalThis.window = {
      matchMedia: vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
    } as unknown as Window & typeof globalThis;
  });

  it("renderiza a splash screen animada com as 6 barras do equalizador no primeiro acesso", () => {
    const html = renderToStaticMarkup(<AppIntroSplash />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Hub Manager Tour");
    expect(html).toContain("eq-bar eq-bar-1");
    expect(html).toContain("eq-bar eq-bar-2");
    expect(html).toContain("eq-bar eq-bar-3");
    expect(html).toContain("eq-bar eq-bar-4");
    expect(html).toContain("eq-bar eq-bar-5");
    expect(html).toContain("eq-bar eq-bar-6");
  });

  it("não renderiza a splash screen se já foi vista na sessão atual (sessionStorage)", () => {
    sessionStorage.setItem("hmt_intro_splash_seen", "1");
    const html = renderToStaticMarkup(<AppIntroSplash />);
    expect(html).toBe("");
  });
});
