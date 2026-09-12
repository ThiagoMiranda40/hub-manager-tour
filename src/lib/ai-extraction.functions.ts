import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  GEMINI_MODEL,
  validateCurrency,
  sanitizeExtractedAmount,
  type ReceiptAnalysisResult,
  type ExtractedRiderItem,
} from "./ai-extraction";

interface GeminiReceiptResponse {
  doc_type_id?: string | null;
  is_reimbursement?: boolean;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  confidence?: number;
  reasoning?: string;
}

interface GeminiRiderResponse {
  items?: Array<{
    category?: string;
    item_name?: string;
    specification?: string | null;
    quantity?: number;
    is_mandatory?: boolean;
  }>;
}

const riderRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkUserRiderRateLimit(userId: string, maxPerDay = 20): boolean {
  const now = Date.now();
  const entry = riderRateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    riderRateLimits.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= maxPerDay) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Função 1: Análise inteligente no momento do upload pelo integrante (/p/$token)
 * - Rate limiting atômico por integrante (teto de 15 chamadas)
 * - Classificação restrita aos document_types cadastrados (buscados diretamente no banco)
 * - Detecção de moeda e suporte a reembolso
 */
export const analyzeDocumentWithAI = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        token: z.string().min(4),
        fileBase64: z.string().min(10),
        mimeType: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Valida o access_token do integrante na rota pública
    const { data: member, error: memberErr } = await (supabaseAdmin as any)
      .from("cast_members")
      .select("id, name, show_id, ai_analysis_count")
      .eq("access_token", data.token)
      .maybeSingle();

    if (memberErr || !member) {
      return {
        success: false,
        error: "Integrante não localizado ou token inválido.",
      };
    }

    const memberId = member.id as string;
    const currentCount = typeof member.ai_analysis_count === "number" ? member.ai_analysis_count : 0;

    // 2. Controle de Taxa (Rate Limit): Teto de 15 chamadas atômico
    try {
      const { data: rpcRes, error: rpcErr } = await (supabaseAdmin as any).rpc(
        "increment_cast_member_ai_count",
        {
          p_member_id: memberId,
          p_max_limit: 15,
        }
      );

      if (!rpcErr && rpcRes && typeof rpcRes === "object") {
        const allowed = (rpcRes as { allowed?: boolean }).allowed;
        if (allowed === false) {
          return {
            success: false,
            rateLimited: true,
            error: "Limite de análises inteligentes atingido para este show.",
          };
        }
      } else if (currentCount >= 15) {
        // Fallback se a RPC ainda não foi executada no banco
        return {
          success: false,
          rateLimited: true,
          error: "Limite de análises inteligentes atingido para este show.",
        };
      }
    } catch {
      // Se houver qualquer falha no rate limiter, verifica campo direto
      if (currentCount >= 15) {
        return {
          success: false,
          rateLimited: true,
          error: "Limite de análises inteligentes atingido para este show.",
        };
      }
    }

    // 3. Busca show e tipos de documento diretamente no banco (nunca confia em lista enviada pelo cliente)
    const { data: show, error: showErr } = await (supabaseAdmin as any)
      .from("shows")
      .select("id, user_id")
      .eq("id", member.show_id)
      .maybeSingle();

    if (showErr || !show) {
      return {
        success: false,
        error: "Show não localizado para este integrante.",
      };
    }

    const { data: dbDocTypes, error: docTypesErr } = await (supabaseAdmin as any)
      .from("document_types")
      .select("id, name, reimbursable, position")
      .eq("user_id", show.user_id)
      .order("position");

    const allowedDocTypes = (dbDocTypes ?? []).map((dt: any) => ({
      id: dt.id as string,
      name: dt.name as string,
      reimbursable: Boolean(dt.reimbursable),
    }));

    if (allowedDocTypes.length === 0) {
      return {
        success: false,
        error: "Nenhum tipo de documento configurado para este show.",
      };
    }

    // 4. Verificação segura da API Key no servidor (sem expor ao cliente, sem fallback hardcoded)
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      console.warn("[AI Extraction] GEMINI_API_KEY não configurada no ambiente do servidor.");
      return {
        success: false,
        error: "Serviço de análise inteligente não disponível.",
      };
    }

    // 5. Monta o prompt com os tipos de documento válidos do show
    const docTypesGuide = allowedDocTypes
      .map((t: any) => `- ID "${t.id}": "${t.name}" (reembolsável: ${t.reimbursable ? "sim" : "não"})`)
      .join("\n");

    const promptText = `Você é o assistente inteligente de produção de turnês musicais do Hub Manager Tour.
Analise a imagem ou PDF do comprovante anexado por um integrante da equipe e extraia as informações de forma estruturada.

TIPOS DE DOCUMENTO DISPONÍVEIS NESTE SHOW (escolha ESTRITAMENTE um desses IDs ou retorne null se nenhum corresponder):
${docTypesGuide}

REGRAS:
1. doc_type_id: DEVE ser exatamente um dos IDs da lista acima que melhor representa o documento (ex.: passagem aérea, voucher de hotel, nota fiscal, cupom fiscal). Se não tiver certeza ou for outro tipo, retorne null.
2. is_reimbursement: Verdadeiro se for nota fiscal, cupom de combustível, corrida de táxi/uber, alimentação ou despesa de reembolso.
3. amount: O valor monetário total a ser reembolsado/pago (número decimal com ponto, ex: 145.50). Retorne null se não houver valor legível.
4. currency: A moeda identificada no documento (ex.: "BRL", "USD", "EUR"). Se o documento for brasileiro (R$, Reais), retorne "BRL".
5. notes: Resumo descritivo curto com dados úteis do comprovante (ex: "Voo G3 1540 (CGH-SDU)", "Hotel Ibis Paulista", "Refeição Almoço").
6. confidence: Nível de confiança da extração entre 0.0 e 1.0.`;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: data.mimeType,
                    data: data.fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                doc_type_id: { type: "string", nullable: true },
                is_reimbursement: { type: "boolean" },
                amount: { type: "number", nullable: true },
                currency: { type: "string", nullable: true },
                notes: { type: "string", nullable: true },
                confidence: { type: "number" },
                reasoning: { type: "string", nullable: true },
              },
              required: ["is_reimbursement", "confidence"],
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[AI Extraction Error]", response.status, errText);
        return {
          success: false,
          error: "Falha na análise inteligente do documento.",
        };
      }

      const jsonResult = (await response.json()) as any;
      const rawText = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return {
          success: false,
          error: "Não foi possível extrair dados do comprovante.",
        };
      }

      const parsed: GeminiReceiptResponse = JSON.parse(rawText);

      // Validação estrita do ID de documento retornado contra a lista permitida
      const matchingType = allowedDocTypes.find((t: any) => t.id === parsed.doc_type_id);
      const validatedDocTypeId = matchingType ? matchingType.id : null;
      const validatedDocTypeName = matchingType ? matchingType.name : null;

      // Validação de moeda
      const currencyResult = validateCurrency(parsed.currency);
      const sanitizedAmount = sanitizeExtractedAmount(parsed.amount);

      const result: ReceiptAnalysisResult = {
        docTypeId: validatedDocTypeId,
        docTypeName: validatedDocTypeName,
        isReimbursement: Boolean(parsed.is_reimbursement),
        amount: sanitizedAmount,
        currency: currencyResult.currency,
        isBrl: currencyResult.isBrl,
        currencyWarning: currencyResult.warningMessage,
        note: parsed.notes ? parsed.notes.trim() : null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
        reasoning: parsed.reasoning,
      };

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      console.error("[AI Extraction Exception]", err?.message);
      return {
        success: false,
        error: "Erro inesperado na análise inteligente.",
      };
    }
  });

/**
 * Função 2: Importação de PDF de rider técnico legado (RF-10 / settings.tsx)
 * - Extrai itens estruturados nas 4 categorias oficiais
 * - Permite ao produtor revisar, ajustar e salvar em lote
 */
export const extractRiderFromPDF = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        artistId: z.string().uuid(),
        fileBase64: z.string().min(10),
        mimeType: z.string(),
        authToken: z.string().min(10).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Validação de sessão do produtor ANTES de qualquer processamento
    const token = data.authToken;
    if (!token) {
      return {
        success: false,
        error: "Acesso não autorizado. Sessão inválida ou ausente.",
      };
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return {
        success: false,
        error: "Acesso não autorizado. Sessão inválida ou expirada.",
      };
    }
    const user = authData.user;

    // 2. Confirmação de que o artistId pertence ao user_id da sessão autenticada
    const { data: artist, error: artistErr } = await (supabaseAdmin as any)
      .from("artists")
      .select("id, user_id")
      .eq("id", data.artistId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (artistErr || !artist) {
      return {
        success: false,
        error: "Acesso não autorizado ou artista não localizado.",
      };
    }

    // 3. Limite de taxa básico por usuário/dia para importação de rider
    if (!checkUserRiderRateLimit(user.id, 20)) {
      return {
        success: false,
        error: "Limite de análises de rider atingido para hoje (máximo de 20 por usuário). Tente novamente amanhã.",
      };
    }

    // 4. Validação de chave de API
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      return {
        success: false,
        error: "Chave de inteligência artificial não configurada no servidor.",
      };
    }

    const promptText = `Você é o especialista em rider técnico e produção de turnês musicais do Hub Manager Tour.
Analise o PDF do rider técnico em anexo e extraia todos os itens e especificações técnicas de forma estruturada.

Você DEVE classificar cada item em uma das 4 categorias oficiais do sistema:
- "stage_sound": Áudio, microfones, monitores, P.A., in-ear, pedestais, cabos, DI boxes, mesa de som de PA/Monitor.
- "lighting_fx": Iluminação, moving heads, refletores, canhões, mesa de luz, máquina de fumaça, haze, lasers, AC de luz.
- "structure_risers": Palco, praticáveis telescópicos, grid/boxtruss, tendas, house mix, barricadas, gerador de energia.
- "dressing_hospitality": Camarim, alimentação, bebidas, água, toalhas, espelho de corpo inteiro, segurança, catering.

Para cada item extraia:
- category: EXATAMENTE uma das 4 chaves acima ("stage_sound" | "lighting_fx" | "structure_risers" | "dressing_hospitality").
- item_name: Nome claro e conciso do equipamento ou necessidade (ex: "Microfone Shure SM58", "Praticável telescópico 2x1m").
- specification: Detalhes técnicos, modelos aceitos ou especificações adicionais (ex: "Sem fio, cápsula Beta 58", "Altura regulável 40 a 60cm"). Se não houver, envie null.
- quantity: Quantidade necessária em número inteiro (mínimo 1).
- is_mandatory: Booleano indicando se o item é inegociável/essencial para o show (true) ou desejável/opcional (false).`;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: data.mimeType,
                    data: data.fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        enum: ["stage_sound", "lighting_fx", "structure_risers", "dressing_hospitality"],
                      },
                      item_name: { type: "string" },
                      specification: { type: "string", nullable: true },
                      quantity: { type: "integer" },
                      is_mandatory: { type: "boolean" },
                    },
                    required: ["category", "item_name", "quantity", "is_mandatory"],
                  },
                },
              },
              required: ["items"],
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Rider Extraction Error]", response.status, errText);
        return {
          success: false,
          error: "Falha na análise do arquivo de rider.",
        };
      }

      const jsonResult = (await response.json()) as any;
      const rawText = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return {
          success: false,
          error: "Não foi possível estruturar os itens do rider.",
        };
      }

      const parsed: GeminiRiderResponse = JSON.parse(rawText);
      const validCategories = new Set([
        "stage_sound",
        "lighting_fx",
        "structure_risers",
        "dressing_hospitality",
      ]);

      const items: ExtractedRiderItem[] = (parsed.items ?? [])
        .filter((i) => i.item_name && i.category && validCategories.has(i.category))
        .map((i) => ({
          category: i.category as ExtractedRiderItem["category"],
          itemName: (i.item_name ?? "").trim(),
          specification: i.specification ? i.specification.trim() : null,
          quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
          isMandatory: Boolean(i.is_mandatory),
        }));

      return {
        success: true,
        items,
      };
    } catch (err: any) {
      console.error("[Rider Extraction Exception]", err?.message);
      return {
        success: false,
        error: "Erro inesperado ao processar rider com inteligência artificial.",
      };
    }
  });
