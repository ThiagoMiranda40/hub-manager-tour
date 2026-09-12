import { describe, it, expect } from "vitest";
import {
  GEMINI_MODEL,
  validateCurrency,
  sanitizeExtractedAmount,
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
    });
  });

  describe("Sanitização de Valores Extraídos", () => {
    it("TC-12.A4: Converte e arredonda números para 2 casas decimais", () => {
      expect(sanitizeExtractedAmount(154.8)).toBe(154.8);
      expect(sanitizeExtractedAmount(154.856)).toBe(154.86);
      expect(sanitizeExtractedAmount("1.250,50")).toBe(1250.5);
      expect(sanitizeExtractedAmount("R$ 89,90")).toBe(89.9);
      expect(sanitizeExtractedAmount("45.00")).toBe(45);
    });

    it("TC-12.A5: Rejeita valores inválidos, nulos ou negativos", () => {
      expect(sanitizeExtractedAmount(0)).toBeNull();
      expect(sanitizeExtractedAmount(-50)).toBeNull();
      expect(sanitizeExtractedAmount("")).toBeNull();
      expect(sanitizeExtractedAmount("grátis")).toBeNull();
      expect(sanitizeExtractedAmount(null)).toBeNull();
      expect(sanitizeExtractedAmount(undefined)).toBeNull();
    });
  });
});
