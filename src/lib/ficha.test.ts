import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Relatório de Produção (ficha.tsx) - Rolagem horizontal e quebra de palavras", () => {
  const fichaPath = path.resolve(__dirname, "../routes/shows.$id_.ficha.tsx");
  const fichaContent = fs.readFileSync(fichaPath, "utf-8");

  it("contém pelo menos 4 contêineres 'overflow-x-auto print:overflow-visible' (Rider + 3 seções)", () => {
    const matches = fichaContent.match(/overflow-x-auto\s+print:overflow-visible/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("nenhuma tabela da ficha usa break-all", () => {
    // Procura ocorrências de break-all no arquivo
    const hasBreakAll = fichaContent.includes("break-all");
    expect(hasBreakAll).toBe(false);
  });

  it("tabelas possuem min-w-[32rem] print:min-w-0 para evitar esmagamento no celular", () => {
    const matches = fichaContent.match(/min-w-\[32rem\]\s+print:min-w-0/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});
