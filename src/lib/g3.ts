export type CastRole = {
  id: string;
  name: string;
  position: number;
};

export type DocumentType = {
  id: string;
  name: string;
  reimbursable: boolean;
  required: boolean;
  position: number;
};

export const DEFAULT_CAST_ROLES = [
  { name: "Integrante", position: 0 },
  { name: "Produção", position: 1 },
  { name: "Equipe técnica", position: 2 },
];

export const DEFAULT_DOCUMENT_TYPES = [
  { name: "Passagem", reimbursable: false, required: true, position: 0 },
  { name: "Hotel/Voucher", reimbursable: false, required: true, position: 1 },
  { name: "Nota fiscal", reimbursable: true, required: true, position: 2 },
];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export type ShowRequirement = {
  id?: string;
  show_id?: string;
  cast_member_id: string;
  document_type_id: string;
  required?: boolean;
  deadline_date?: string | null;
};

export const RIDER_CATEGORIES = [
  { id: "backline", label: "Backline" },
  { id: "som", label: "Som" },
  { id: "iluminacao", label: "Iluminação" },
  { id: "camarim", label: "Camarim" },
  { id: "outros", label: "Outros" },
] as const;

export type RiderCategory = (typeof RIDER_CATEGORIES)[number]["id"];

export type ArtistRiderTemplateItem = {
  id: string;
  user_id?: string;
  artist_id: string;
  category: RiderCategory | string;
  item_name: string;
  specification?: string | null | undefined;
  quantity: number;
  is_mandatory: boolean;
  position: number;
  created_at?: string;
};

/** Reordena array de itens recalculando posições sequenciais (0..N-1) */
export function reorderRiderItems<T extends { id: string; position: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  if (!moved) return items;
  result.splice(toIndex, 0, moved);
  return result.map((item, idx) => ({
    ...item,
    position: idx,
  }));
}

export type ShowRiderItem = {
  id: string;
  status: "pending" | "confirmed" | "exception" | string;
  category?: string;
  item_name?: string;
  specification?: string | null;
  quantity?: number;
  is_mandatory?: boolean;
  position?: number;
  exception_note?: string | null;
  confirmed_by_venue_at?: string | null;
  physical_check?: "unchecked" | "conformed" | "divergent" | string;
  physical_divergence_note?: string | null;
};

export type RiderGroupBalance = {
  total: number;
  confirmed: number;
  exceptions: number;
  pending: number;
  isComplete: boolean;
  hasExceptions: boolean;
};

export type RiderBalance = {
  total: number;
  confirmed: number;
  exceptions: number;
  pending: number;
  pct: number;
  isComplete: boolean;
  hasExceptions: boolean;
  /** RF-11: Contadores segregados para itens inegociáveis */
  mandatory: RiderGroupBalance;
  /** RF-11: Contadores segregados para itens desejáveis */
  desirable: RiderGroupBalance;
  /** RF-11: Flag que indica se existe item inegociável em aberto ou com exceção */
  hasMandatoryPendingOrException: boolean;
};

export type MemberRequirementStatus = {
  memberId: string;
  status: "no_requirement" | "done" | "pending";
  hasRequirement: boolean;
  isUnrequired: boolean;
  isComplete: boolean;
  expectedCount: number;
  receivedCount: number;
  pendingCount: number;
  missingDocTypeIds: string[];
  receivedDocTypeIds: string[];
};

export type ShowProgress = {
  hasRequirement: boolean;
  expected: number;
  received: number;
  pct: number;
  done: boolean;
  pendingPeople: number;
  completedPeople: number;
  unrequiredPeople: number;
  activePeople: number;
  pendingCount: number;
  /** Documentos recebidos no show, independente de exigência. */
  totalDocs: number;
  /** Pessoas do elenco que já enviaram ao menos um documento. */
  peopleWithDocs: number;
  members: number;
  summaryText: string;
};

export type LegacyDocType = { id: string; required: boolean };

function isLegacyDocTypes(
  list: ShowRequirement[] | LegacyDocType[],
): list is LegacyDocType[] {
  if (list.length === 0) return false;
  const first = list[0];
  return Boolean(first && "required" in first && !("cast_member_id" in first));
}

/** Formata texto de resumo discriminando ativos, concluídos, pendentes e dispensados */
export function formatShowProgressSummary(progress: {
  members: number;
  activePeople: number;
  completedPeople: number;
  pendingPeople: number;
  unrequiredPeople: number;
}): string {
  const { members, activePeople, completedPeople, pendingPeople, unrequiredPeople } = progress;
  const memberNoun = members === 1 ? "integrante" : "integrantes";

  if (members === 0) {
    return "0 integrantes";
  }

  if (activePeople === 0) {
    return `${members} ${memberNoun}: sem exigência nesta data`;
  }

  if (unrequiredPeople === 0) {
    return `${members} ${memberNoun}: ${activePeople} ativos (${completedPeople} concluídos, ${pendingPeople} pendentes)`;
  }

  return `${members} ${memberNoun}: ${activePeople} ativos (${completedPeople} concluídos, ${pendingPeople} pendentes), ${unrequiredPeople} sem exigência nesta data`;
}

/** Avalia o status individual de um integrante frente aos seus requisitos e documentos */
export function computeMemberRequirementStatus(
  memberId: string,
  requirements: ShowRequirement[],
  docs: { cast_member_id: string; doc_type: string }[],
): MemberRequirementStatus {
  const memberReqs = requirements.filter(
    (r) => r.cast_member_id === memberId && r.required !== false,
  );

  if (memberReqs.length === 0) {
    return {
      memberId,
      status: "no_requirement",
      hasRequirement: false,
      isUnrequired: true,
      isComplete: false,
      expectedCount: 0,
      receivedCount: 0,
      pendingCount: 0,
      missingDocTypeIds: [],
      receivedDocTypeIds: [],
    };
  }

  const receivedDocTypeIds: string[] = [];
  const missingDocTypeIds: string[] = [];

  for (const req of memberReqs) {
    const hasDoc = docs.some(
      (d) => d.cast_member_id === memberId && d.doc_type === req.document_type_id,
    );
    if (hasDoc) {
      receivedDocTypeIds.push(req.document_type_id);
    } else {
      missingDocTypeIds.push(req.document_type_id);
    }
  }

  const expectedCount = memberReqs.length;
  const receivedCount = receivedDocTypeIds.length;
  const pendingCount = missingDocTypeIds.length;
  const isComplete = pendingCount === 0;

  return {
    memberId,
    status: isComplete ? "done" : "pending",
    hasRequirement: true,
    isUnrequired: false,
    isComplete,
    expectedCount,
    receivedCount,
    pendingCount,
    missingDocTypeIds,
    receivedDocTypeIds,
  };
}

/** Calcula o balanço do rider técnico do show segregando itens inegociáveis e desejáveis (RF-11) */
export function computeRiderBalance(
  items: { status: string; is_mandatory?: boolean }[],
): RiderBalance {
  const total = items.length;
  const confirmed = items.filter((i) => i.status === "confirmed").length;
  const exceptions = items.filter((i) => i.status === "exception").length;
  const pending = items.filter((i) => i.status === "pending" || !i.status).length;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const hasExceptions = exceptions > 0;

  const mandatoryItems = items.filter((i) => Boolean(i.is_mandatory));
  const desirableItems = items.filter((i) => !i.is_mandatory);

  const calcGroup = (group: { status: string }[]): RiderGroupBalance => {
    const gTotal = group.length;
    const gConfirmed = group.filter((i) => i.status === "confirmed").length;
    const gExceptions = group.filter((i) => i.status === "exception").length;
    const gPending = group.filter((i) => i.status === "pending" || !i.status).length;
    return {
      total: gTotal,
      confirmed: gConfirmed,
      exceptions: gExceptions,
      pending: gPending,
      isComplete: gTotal > 0 && gPending === 0 && gExceptions === 0,
      hasExceptions: gExceptions > 0,
    };
  };

  const mandatory = calcGroup(mandatoryItems);
  const desirable = calcGroup(desirableItems);

  // TC-11.1 (Bloqueio de conclusão):
  // RF-11: Se houver itens inegociáveis, a conclusão depende estritamente deles (desejável pendente não bloqueia o show).
  // Se não houver itens inegociáveis configurados, exige que todos os itens estejam confirmados (sem pendências ou exceções).
  const hasMandatoryPendingOrException = mandatory.pending > 0 || mandatory.exceptions > 0;
  const isComplete =
    total > 0 &&
    (mandatory.total > 0
      ? !hasMandatoryPendingOrException
      : pending === 0 && exceptions === 0);

  return {
    total,
    confirmed,
    exceptions,
    pending,
    pct,
    isComplete,
    hasExceptions,
    mandatory,
    desirable,
    hasMandatoryPendingOrException,
  };
}

/**
 * Ordena itens do rider técnico aplicando as regras do RF-11:
 * 1. Itens inegociáveis pendentes antes de desejáveis pendentes (TC-11.3)
 * 2. Itens pendentes antes de itens já resolvidos
 * 3. Itens em exceção (inegociáveis antes de desejáveis)
 * 4. Itens confirmados
 * 5. Posição original (position) preservada como critério de desempate
 */
export function sortRiderItemsByPriority<
  T extends { is_mandatory?: boolean; status: string; position?: number },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const isPendingA = a.status === "pending" || !a.status;
    const isPendingB = b.status === "pending" || !b.status;

    // Se ambos forem pendentes: inegociáveis primeiro (TC-11.3)
    if (isPendingA && isPendingB) {
      const mandA = Boolean(a.is_mandatory);
      const mandB = Boolean(b.is_mandatory);
      if (mandA !== mandB) {
        return mandA ? -1 : 1;
      }
      return (a.position ?? 0) - (b.position ?? 0);
    }
    // Apenas um é pendente: pendente vem primeiro
    if (isPendingA !== isPendingB) {
      return isPendingA ? -1 : 1;
    }

    const isExcA = a.status === "exception";
    const isExcB = b.status === "exception";
    // Se ambos forem exceção: inegociáveis primeiro (mais crítico)
    if (isExcA && isExcB) {
      const mandA = Boolean(a.is_mandatory);
      const mandB = Boolean(b.is_mandatory);
      if (mandA !== mandB) {
        return mandA ? -1 : 1;
      }
      return (a.position ?? 0) - (b.position ?? 0);
    }
    // Apenas um é exceção
    if (isExcA !== isExcB) {
      return isExcA ? -1 : 1;
    }

    // Se ambos tiverem o mesmo status (ex: ambos confirmados), segue position
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/**
 * Ordena itens do rider para conferência física no Modo Palco (RF-08 & RF-11):
 * 1. Itens com divergência física no palco vêm primeiro (inegociáveis antes de desejáveis).
 * 2. Itens ainda não conferidos (unchecked) vêm a seguir:
 *    - Inegociáveis antes de desejáveis (RF-11)
 *    - Dentro do mesmo grupo, itens com status pendente antes de confirmados pela casa
 * 3. Itens já conferidos conforme (conformed) vêm por último (inegociáveis antes de desejáveis, respeitando position).
 */
export function sortStageRiderItems<
  T extends {
    is_mandatory?: boolean;
    status: string;
    physical_check?: string;
    position?: number;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Divergência física tem maior prioridade de atenção
    const isDivA = a.physical_check === "divergent";
    const isDivB = b.physical_check === "divergent";
    if (isDivA && isDivB) {
      const mandA = Boolean(a.is_mandatory);
      const mandB = Boolean(b.is_mandatory);
      if (mandA !== mandB) return mandA ? -1 : 1;
      return (a.position ?? 0) - (b.position ?? 0);
    }
    if (isDivA !== isDivB) return isDivA ? -1 : 1;

    // 2. Não conferidos (unchecked) vêm antes de conformed
    const isUncheckedA = a.physical_check === "unchecked" || !a.physical_check;
    const isUncheckedB = b.physical_check === "unchecked" || !b.physical_check;
    if (isUncheckedA && isUncheckedB) {
      // Inegociáveis primeiro (RF-11)
      const mandA = Boolean(a.is_mandatory);
      const mandB = Boolean(b.is_mandatory);
      if (mandA !== mandB) return mandA ? -1 : 1;

      // Status pendente da casa antes de confirmado
      const isPendA = a.status === "pending" || !a.status;
      const isPendB = b.status === "pending" || !b.status;
      if (isPendA !== isPendB) return isPendA ? -1 : 1;

      return (a.position ?? 0) - (b.position ?? 0);
    }
    if (isUncheckedA !== isUncheckedB) return isUncheckedA ? -1 : 1;

    // 3. Conformed (conferidos conforme)
    const mandA = Boolean(a.is_mandatory);
    const mandB = Boolean(b.is_mandatory);
    if (mandA !== mandB) return mandA ? -1 : 1;

    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/** Aplica presets de exigências em lote de forma estritamente idempotente */
export function applyRequirementPreset(
  existingRequirements: ShowRequirement[],
  memberIds: string[],
  docTypeIds: string[],
  showId?: string,
): ShowRequirement[] {
  const existingSet = new Set<string>();
  const result: ShowRequirement[] = [];

  for (const req of existingRequirements) {
    const key = `${req.cast_member_id}::${req.document_type_id}`;
    existingSet.add(key);
    result.push({ ...req });
  }

  for (const memberId of memberIds) {
    for (const docTypeId of docTypeIds) {
      const key = `${memberId}::${docTypeId}`;
      if (!existingSet.has(key)) {
        existingSet.add(key);
        result.push({
          cast_member_id: memberId,
          document_type_id: docTypeId,
          required: true,
          ...(showId ? { show_id: showId } : {}),
        });
      }
    }
  }

  return result;
}

/** Única fonte de verdade do cálculo de pendência (prancheta e detalhe do show). */
export function computeShowProgress(
  members: { id: string }[],
  docs: { cast_member_id: string; doc_type: string }[],
  requirementsOrDocTypes: ShowRequirement[] | LegacyDocType[],
): ShowProgress {
  // Compatibilidade com a assinatura antiga baseada em document_types globais
  if (isLegacyDocTypes(requirementsOrDocTypes)) {
    const requiredTypes = requirementsOrDocTypes.filter((t) => t.required);
    const hasRequirement = requiredTypes.length > 0 && members.length > 0;
    const expected = members.length * requiredTypes.length;
    const received = members.reduce(
      (total, member) =>
        total +
        requiredTypes.filter((t) =>
          docs.some((d) => d.cast_member_id === member.id && d.doc_type === t.id),
        ).length,
      0,
    );
    const capped = Math.min(received, expected);
    const pendingPeople = members.filter((m) =>
      requiredTypes.some(
        (t) => !docs.some((d) => d.cast_member_id === m.id && d.doc_type === t.id),
      ),
    ).length;
    const peopleWithDocs = members.filter((m) =>
      docs.some((d) => d.cast_member_id === m.id),
    ).length;
    const completedPeople = members.length - pendingPeople;
    const activePeople = requiredTypes.length > 0 ? members.length : 0;
    const unrequiredPeople = members.length - activePeople;
    const pendingCount = Math.max(0, expected - capped);

    const summaryText = formatShowProgressSummary({
      members: members.length,
      activePeople,
      completedPeople,
      pendingPeople,
      unrequiredPeople,
    });

    return {
      hasRequirement,
      expected,
      received: capped,
      pct: expected > 0 ? Math.round((capped / expected) * 100) : 0,
      done: hasRequirement && capped >= expected,
      pendingPeople,
      completedPeople,
      unrequiredPeople,
      activePeople,
      pendingCount,
      totalDocs: docs.length,
      peopleWithDocs,
      members: members.length,
      summaryText,
    };
  }

  // Cálculo estrito e individualizado por pessoa + show (Módulo 1 V1)
  const requirements = requirementsOrDocTypes as ShowRequirement[];
  let expected = 0;
  let received = 0;
  let pendingPeople = 0;
  let completedPeople = 0;
  let unrequiredPeople = 0;
  let activePeople = 0;

  for (const member of members) {
    const status = computeMemberRequirementStatus(member.id, requirements, docs);
    if (status.isUnrequired) {
      unrequiredPeople++;
    } else {
      activePeople++;
      expected += status.expectedCount;
      received += status.receivedCount;
      if (status.isComplete) {
        completedPeople++;
      } else {
        pendingPeople++;
      }
    }
  }

  const hasRequirement = activePeople > 0 && expected > 0;
  const capped = Math.min(received, expected);
  const pendingCount = Math.max(0, expected - capped);
  const pct = expected > 0 ? Math.round((capped / expected) * 100) : 0;
  const done = hasRequirement && capped >= expected;

  const peopleWithDocs = members.filter((m) =>
    docs.some((d) => d.cast_member_id === m.id),
  ).length;

  const summaryText = formatShowProgressSummary({
    members: members.length,
    activePeople,
    completedPeople,
    pendingPeople,
    unrequiredPeople,
  });

  return {
    hasRequirement,
    expected,
    received: capped,
    pct,
    done,
    pendingPeople,
    completedPeople,
    unrequiredPeople,
    activePeople,
    pendingCount,
    totalDocs: docs.length,
    peopleWithDocs,
    members: members.length,
    summaryText,
  };
}


export function labelFrom<T extends { id: string; name: string }>(

  list: T[],
  value: string | null | undefined,
) {
  if (!value) return "—";
  return list.find((i) => i.id === value)?.name ?? value;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function parseDate(date: string) {
  const parts = date.split("-").map(Number);
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

export function formatShowDate(date: string) {
  const dt = parseDate(date);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
}

/** Formata data ISO (YYYY-MM-DD) para o formato padrão brasileiro DD/MM/AAAA */
export function formatDateBR(date: string): string {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function formatWeekday(date: string) {
  const dt = parseDate(date);
  return dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
}

/** Remove pontuação de CPF e telefone para transferência limpa via Pix (RF-01 / RF-05 / TC-05.1) */
export function cleanPixKeyForCopy(key: string, type?: string | null): string {
  if (!key) return "";
  if (type === "cpf" || type === "phone") {
    return key.replace(/\D/g, "");
  }
  return key.trim();
}

/**
 * Retorna a descrição para exibição de um documento no relatório ou lista.
 * Prioriza a observação (note) preenchida pelo integrante; caso não exista, usa o nome do arquivo.
 */
export function formatDocumentDescription(d: {
  note?: string | null | undefined;
  file_name?: string | null | undefined;
}): string {
  return d.note?.trim() || d.file_name || "arquivo";
}

/**
 * Compõe o link público individual do integrante (/p/$token) a partir da origem e do access_token (T-16 / RF-04)
 */
export function getMemberPublicUrl(origin: string, accessToken?: string | null): string {
  return accessToken ? `${origin}/p/${accessToken}` : "";
}

/**
 * Converte e valida o valor monetário de reembolso no formato brasileiro (RF-04 / TC-04.2 / TC-16.4)
 */
export function parseReimbursementAmount(value: string): number {
  const clean = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(clean) || clean <= 0) {
    throw new Error("O valor de reembolso deve ser maior que R$ 0,00.");
  }
  return clean;
}

/**
 * Constrói link direto para WhatsApp com número e mensagem pré-preenchida (RF-04)
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

