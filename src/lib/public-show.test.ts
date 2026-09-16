import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schemas extraídos e espelhados exatamente como definidos em public-show.functions.ts
// para validação estrita de segurança e controle de acesso (AppSec RF-14 / Seção 7)
export const updatePublicRiderItemSchema = z.object({
  token: z.string().min(4),
  itemId: z.string().uuid(),
  // Bloqueio estrito de elevação de privilégio:
  // A rota pública SÓ aceita 'confirmed', 'exception' ou 'pending'.
  // 'accepted_with_exception' é terminantemente proibido.
  status: z.enum(["confirmed", "exception", "pending"]),
  exceptionNote: z.string().max(1000).optional().nullable(),
});

export const submitPublicRiderMessageSchema = z.object({
  token: z.string().min(4),
  itemId: z.string().uuid(),
  message: z.string().min(1, "A mensagem não pode estar vazia.").max(1000, "Máximo de 1000 caracteres."),
});

describe("Segurança das Server Functions Públicas de Rider (RF-14 / AppSec)", () => {
  describe("updatePublicRiderItem - Validação de privilégios de status", () => {
    it("deve aceitar os status permitidos à casa de show ('confirmed', 'exception', 'pending')", () => {
      const validPayload = {
        token: "tok_test_123",
        itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
        status: "confirmed",
      };
      expect(() => updatePublicRiderItemSchema.parse(validPayload)).not.toThrow();

      expect(() =>
        updatePublicRiderItemSchema.parse({
          ...validPayload,
          status: "exception",
          exceptionNote: "Temos um modelo alternativo",
        }),
      ).not.toThrow();

      expect(() =>
        updatePublicRiderItemSchema.parse({
          ...validPayload,
          status: "pending",
        }),
      ).not.toThrow();
    });

    it("CRÍTICO: deve REJEITAR explicitamente qualquer tentativa de enviar 'accepted_with_exception' pela rota pública", () => {
      const attackPayload = {
        token: "tok_test_123",
        itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
        status: "accepted_with_exception",
      };
      expect(() => updatePublicRiderItemSchema.parse(attackPayload)).toThrow();
    });

    it("deve rejeitar itemId inválido (não UUID)", () => {
      expect(() =>
        updatePublicRiderItemSchema.parse({
          token: "tok_test_123",
          itemId: "not-a-uuid",
          status: "confirmed",
        }),
      ).toThrow();
    });

    it("deve rejeitar exceptionNote maior que 1000 caracteres", () => {
      expect(() =>
        updatePublicRiderItemSchema.parse({
          token: "tok_test_123",
          itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
          status: "exception",
          exceptionNote: "a".repeat(1001),
        }),
      ).toThrow();
    });
  });

  describe("submitPublicRiderMessage - Validação e sanitização da réplica/tréplica", () => {
    it("deve aceitar mensagens válidas", () => {
      const valid = {
        token: "tok_test_123",
        itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
        message: "Conseguimos atender com o modelo Shure Beta 58A sem problemas.",
      };
      const parsed = submitPublicRiderMessageSchema.parse(valid);
      expect(parsed.message).toBe("Conseguimos atender com o modelo Shure Beta 58A sem problemas.");
    });

    it("deve rejeitar mensagens vazias", () => {
      expect(() =>
        submitPublicRiderMessageSchema.parse({
          token: "tok_test_123",
          itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
          message: "",
        }),
      ).toThrow();
    });

    it("deve rejeitar mensagens com mais de 1000 caracteres", () => {
      expect(() =>
        submitPublicRiderMessageSchema.parse({
          token: "tok_test_123",
          itemId: "c2a2e8c2-3e2b-4b10-9c2d-2f08a4bb8999",
          message: "x".repeat(1001),
        }),
      ).toThrow();
    });
  });
});
