import { describe, it, expect } from "vitest";
import {
  GEMINI_MODEL,
  validateCurrency,
  sanitizeExtractedAmount,
  mapAiCategoryToSystemCategory,
} from "./ai-extraction";

describe("T-12: Extração Inteligente com IA — Helpers e Validações", () => {
  it("TC-12.A1: Modelo oficial configurado como Gemini 2.5 Flash", () => {
    expect(GEMINI_MODEL).toBe("gemini-2.5-flash");
  });

  describe("Validação e Detecção de Moeda (RF-10 / Adendo 11/09/2026)", () => {
    it("TC-12.A2: Aceita BRL e variações de Real sem alerta", () => {
      expect(validateCurrency("BRL")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("  brl  ")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("R$")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("Real")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("reais")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("Brazilian Real")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency(null)).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });

      expect(validateCurrency("")).toEqual({
        currency: "BRL",
        isBrl: true,
        warningMessage: null,
      });
    });

    it("TC-12.A3: Detecta moedas estrangeiras e gera alerta visual obrigatório", () => {
      const usdResult = validateCurrency("USD");
      expect(usdResult.isBrl).toBe(false);
      expect(usdResult.currency).toBe("USD");
      expect(usdResult.warningMessage).toContain("Moeda detectada diferente de Real (BRL): USD");

      const eurResult = validateCurrency("EUR");
      expect(eurResult.isBrl).toBe(false);
      expect(eurResult.currency).toBe("EUR");
      expect(eurResult.warningMessage).toContain("Moeda detectada diferente de Real (BRL): EUR");

      const gbpResult = validateCurrency("GBP");
      expect(gbpResult.isBrl).toBe(false);
      expect(gbpResult.currency).toBe("GBP");

      const jpyResult = validateCurrency("  jpy  ");
      expect(jpyResult.isBrl).toBe(false);
      expect(jpyResult.currency).toBe("JPY");
    });
  });

  describe("Sanitização de Valores Extraídos (Equivalência & BVA)", () => {
    it("TC-12.A4: Converte e arredonda números para 2 casas decimais", () => {
      expect(sanitizeExtractedAmount(154.8)).toBe(154.8);
      expect(sanitizeExtractedAmount(154.856)).toBe(154.86);
      expect(sanitizeExtractedAmount(154.854)).toBe(154.85);
      expect(sanitizeExtractedAmount("1.250,50")).toBe(1250.5);
      expect(sanitizeExtractedAmount("R$ 89,90")).toBe(89.9);
      expect(sanitizeExtractedAmount("45.00")).toBe(45);
      expect(sanitizeExtractedAmount("  R$ 3.456,78  ")).toBe(3456.78);
    });

    it("TC-12.A5: Testa fronteiras de limite (BVA) para valores monetários", () => {
      // Menor centavo positivo aceitável
      expect(sanitizeExtractedAmount(0.01)).toBe(0.01);
      expect(sanitizeExtractedAmount("0,01")).toBe(0.01);

      // Valores abaixo de meio centavo arredondam para 0 e são rejeitados
      expect(sanitizeExtractedAmount(0.004)).toBeNull();

      // Valores grandes
      expect(sanitizeExtractedAmount(999999.99)).toBe(999999.99);

      // Limites zero e negativos
      expect(sanitizeExtractedAmount(0)).toBeNull();
      expect(sanitizeExtractedAmount(-0.01)).toBeNull();
      expect(sanitizeExtractedAmount(-50)).toBeNull();
    });

    it("TC-12.A6: Rejeita entradas não numéricas e nulas", () => {
      expect(sanitizeExtractedAmount("")).toBeNull();
      expect(sanitizeExtractedAmount("   ")).toBeNull();
      expect(sanitizeExtractedAmount("grátis")).toBeNull();
      expect(sanitizeExtractedAmount("NaN")).toBeNull();
      expect(sanitizeExtractedAmount("Infinity")).toBeNull();
      expect(sanitizeExtractedAmount(null)).toBeNull();
      expect(sanitizeExtractedAmount(undefined)).toBeNull();
    });
  });

  describe("Mapeamento de Categorias de Rider Técnico (Função 2)", () => {
    it("TC-12.A7: Mapeia as 4 categorias oficiais da IA para o catálogo do sistema", () => {
      expect(mapAiCategoryToSystemCategory("stage_sound")).toBe("som");
      expect(mapAiCategoryToSystemCategory("lighting_fx")).toBe("iluminacao");
      expect(mapAiCategoryToSystemCategory("dressing_hospitality")).toBe("camarim");
      expect(mapAiCategoryToSystemCategory("structure_risers")).toBe("outros");
    });

    it("TC-12.A8: Preserva categorias já compatíveis do sistema", () => {
      expect(mapAiCategoryToSystemCategory("backline")).toBe("backline");
      expect(mapAiCategoryToSystemCategory("som")).toBe("som");
      expect(mapAiCategoryToSystemCategory("iluminacao")).toBe("iluminacao");
      expect(mapAiCategoryToSystemCategory("camarim")).toBe("camarim");
      expect(mapAiCategoryToSystemCategory("outros")).toBe("outros");
    });

    it("TC-12.A9: Fallback gracioso para categoria 'outros' em entradas desconhecidas ou vazias", () => {
      expect(mapAiCategoryToSystemCategory("categoria_inventada")).toBe("outros");
      expect(mapAiCategoryToSystemCategory("")).toBe("outros");
      expect(mapAiCategoryToSystemCategory(null)).toBe("outros");
      expect(mapAiCategoryToSystemCategory(undefined)).toBe("outros");
      expect(mapAiCategoryToSystemCategory("  STAGE_SOUND  ")).toBe("som");
    });
  });
});
