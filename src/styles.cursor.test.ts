import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Global cursor rules in styles.css", () => {
  it("contém as regras de cursor: pointer e cursor: not-allowed dentro de @layer base com seletores granulares", () => {
    const cssPath = path.resolve(__dirname, "styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Verifica que styles.css real possui @layer base
    expect(cssContent).toContain("@layer base");

    // Extrai o bloco @layer base para garantir que as regras estão no layer correto
    const layerBaseMatch = cssContent.match(/@layer\s+base\s*\{([\s\S]*?)\n\}/);
    expect(layerBaseMatch).not.toBeNull();
    const layerBaseContent = layerBaseMatch?.[1] ?? "";
    expect(layerBaseContent).not.toBe("");

    // Extrai cada regra CSS (seletor + corpo) individualmente
    const ruleMatches = Array.from(layerBaseContent.matchAll(/([^{}]+)\{([^{}]*)\}/g));
    const rules = ruleMatches.map((m) => ({
      selector: (m[1] ?? "").trim(),
      body: (m[2] ?? "").trim(),
    }));

    // a) Regras cujo corpo contém cursor: pointer
    const pointerRules = rules.filter((r) => /cursor:\s*pointer;?/.test(r.body));
    expect(pointerRules.length).toBeGreaterThan(0);
    const pointerSelectors = pointerRules.map((r) => r.selector).join(", ");

    expect(pointerSelectors).toContain("button:not(:disabled)");
    expect(pointerSelectors).toContain('[role="tab"]');
    expect(pointerSelectors).toContain("a[href]");
    expect(pointerSelectors).toContain("select:not(:disabled)");
    expect(pointerSelectors).toContain("label[for]");
    expect(pointerSelectors).toContain('input[type="checkbox"]:not(:disabled)');

    // b) Regras cujo corpo contém cursor: not-allowed
    const notAllowedRules = rules.filter((r) => /cursor:\s*not-allowed;?/.test(r.body));
    expect(notAllowedRules.length).toBeGreaterThan(0);
    const notAllowedSelectors = notAllowedRules.map((r) => r.selector).join(", ");

    expect(notAllowedSelectors).toContain("button:disabled");
  });
});
