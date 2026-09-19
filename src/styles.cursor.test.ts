import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Global cursor rules in styles.css", () => {
  it("contém as regras de cursor: pointer e cursor: not-allowed dentro de @layer base", () => {
    const cssPath = path.resolve(__dirname, "styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Verifica que styles.css real possui @layer base
    expect(cssContent).toContain("@layer base");

    // Extrai o bloco @layer base para garantir que as regras estão no layer correto
    const layerBaseMatch = cssContent.match(/@layer\s+base\s*\{([\s\S]*?)\n\}/);
    expect(layerBaseMatch).not.toBeNull();
    const layerBaseContent = layerBaseMatch![1];

    // Confirma que a regra de pointer para botões e interativos não-desabilitados existe
    expect(layerBaseContent).toMatch(/button:not\(:disabled\)[\s\S]*?cursor:\s*pointer;/);

    // Confirma que elementos com role de botão/tab/menuitem/option possuem cursor pointer
    expect(layerBaseContent).toMatch(/\[role="button"\]:not\(\[aria-disabled="true"\]\)[\s\S]*?cursor:\s*pointer;/);
    expect(layerBaseContent).toMatch(/\[role="tab"\]:not\(\[aria-disabled="true"\]\)[\s\S]*?cursor:\s*pointer;/);

    // Confirma que a regra de not-allowed para botões/tabs/inputs desabilitados existe
    expect(layerBaseContent).toMatch(/button:disabled[\s\S]*?cursor:\s*not-allowed;/);
    expect(layerBaseContent).toMatch(/\[role="button"\]\[aria-disabled="true"\][\s\S]*?cursor:\s*not-allowed;/);
    expect(layerBaseContent).toMatch(/\[role="tab"\]\[aria-disabled="true"\][\s\S]*?cursor:\s*not-allowed;/);
  });
});
