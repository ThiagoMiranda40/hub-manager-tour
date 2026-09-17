/**
 * Helper central de Extração Inteligente com IA (Gemini 3.6 Flash)
 * Requisitos: RF-10 / Tarefa T-12
 */

// Modelo de IA padrão para extração multimodal (texto, imagens e PDF)
export const GEMINI_MODEL = "gemini-3.6-flash";

// Tipos de dados
export interface CurrencyValidationResult {
  currency: string;
  isBrl: boolean;
  warningMessage: string | null;
}

export interface ReceiptAnalysisResult {
  docTypeId: string | null;
  docTypeName?: string | null | undefined;
  isReimbursement: boolean;
  amount: number | null;
  currency: string;
  isBrl: boolean;
  currencyWarning: string | null;
  note: string | null;
  confidence: number;
  reasoning?: string | undefined;
}

export interface ExtractedRiderItem {
  category: "stage_sound" | "lighting_fx" | "structure_risers" | "dressing_hospitality";
  itemName: string;
  specification: string | null;
  quantity: number;
  isMandatory: boolean;
}

export interface RiderExtractionResult {
  items: ExtractedRiderItem[];
}

/**
 * Mapeia as 4 categorias de extração por IA para as categorias oficiais de rider do sistema.
 */
export function mapAiCategoryToSystemCategory(cat: string | null | undefined): "som" | "iluminacao" | "camarim" | "outros" | "backline" {
  if (!cat) return "outros";
  const norm = cat.trim().toLowerCase();
  switch (norm) {
    case "stage_sound":
      return "som";
    case "lighting_fx":
      return "iluminacao";
    case "dressing_hospitality":
      return "camarim";
    case "structure_risers":
      return "outros";
    case "backline":
    case "som":
    case "iluminacao":
    case "camarim":
    case "outros":
      return norm as any;
    default:
      return "outros";
  }
}

/**
 * Validação rigorosa de moeda identificada no documento.
 * Se a moeda não for BRL (ou variações aceitas de Real), gera um alerta visual obrigatório.
 */
export function validateCurrency(rawCurrency: string | null | undefined): CurrencyValidationResult {
  if (!rawCurrency) {
    return {
      currency: "BRL",
      isBrl: true,
      warningMessage: null,
    };
  }

  const norm = rawCurrency.trim().toUpperCase();

  // Variações conhecidas de Real Brasileiro
  if (norm === "BRL" || norm === "R$" || norm === "REAL" || norm === "REAIS" || norm === "BRAZILIAN REAL") {
    return {
      currency: "BRL",
      isBrl: true,
      warningMessage: null,
    };
  }

  // Moeda estrangeira identificada
  return {
    currency: norm,
    isBrl: false,
    warningMessage: `Moeda detectada diferente de Real (BRL): ${norm}. Verifique o valor com atenção.`,
  };
}

/**
 * Sanitiza valores monetários vindos da IA garantindo ponto flutuante positivo de 2 casas decimais.
 */
export function sanitizeExtractedAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const rounded = Math.round(raw * 100) / 100;
    return rounded > 0 ? rounded : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let cleaned: number;
    if (trimmed.includes(",")) {
      // Formato brasileiro: remove pontos de milhar e troca vírgula por ponto
      cleaned = Number(trimmed.replace(/[^\d,]/g, "").replace(",", "."));
    } else {
      // Formato decimal padrão: mantém ponto
      cleaned = Number(trimmed.replace(/[^\d.]/g, ""));
    }
    if (Number.isFinite(cleaned) && cleaned > 0) {
      const rounded = Math.round(cleaned * 100) / 100;
      return rounded > 0 ? rounded : null;
    }
  }
  return null;
}

/**
 * Redimensiona imagens no client-side para o teto de 1536px no lado maior.
 * Preserva o aspect ratio e reduz tráfego e latência na chamada de IA.
 * Se for PDF, converte para base64 sem alterações de dimensão.
 */
export async function resizeFileForAI(
  file: File,
  maxDimension = 1536
): Promise<{ base64: string; mimeType: string }> {
  // Se for PDF, lê direto como base64
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      if (b !== undefined) {
        binary += String.fromCharCode(b);
      }
    }
    const base64 = btoa(binary);
    return { base64, mimeType: "application/pdf" };
  }

  // Se for imagem, redimensiona via Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // Fallback para leitura direta se não conseguir contexto 2D
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(",")[1] ?? "";
          resolve({ base64, mimeType: file.type || "image/jpeg" });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Converte para JPEG com qualidade 0.85
      const mimeType = "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, 0.85);
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ base64, mimeType });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem para análise."));
    };

    img.src = url;
  });
}
