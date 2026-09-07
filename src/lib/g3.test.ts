import { describe, it, expect } from "vitest";
import {
  computeShowProgress,
  computeMemberRequirementStatus,
  formatShowProgressSummary,
  computeRiderBalance,
  applyRequirementPreset,
  cleanPixKeyForCopy,
  formatDateBR,
  formatDocumentDescription,
  reorderRiderItems,
  sortRiderItemsByPriority,
  type ShowRequirement,
  type ShowRiderItem,
} from "./g3";

describe("T-03: Lógica de Cálculo de Pendências Individuais e Estatísticas do Rider", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Teste 1: Membro com exigências pendentes (Passagem + Hotel) -> contabiliza 2 pendências
  // ───────────────────────────────────────────────────────────────────────────
  it("Teste 1: calcula corretamente pendências individuais para membro com Passagem + Hotel", () => {
    const members = [{ id: "m-1" }];
    const requirements: ShowRequirement[] = [
      { cast_member_id: "m-1", document_type_id: "doc-passagem", required: true },
      { cast_member_id: "m-1", document_type_id: "doc-hotel", required: true },
    ];
    const docsEmpty: { cast_member_id: string; doc_type: string }[] = [];

    // Sem documentos enviados -> 2 pendências esperadas, 0 recebidos
    const progressInitial = computeShowProgress(members, docsEmpty, requirements);
    expect(progressInitial.hasRequirement).toBe(true);
    expect(progressInitial.expected).toBe(2);
    expect(progressInitial.received).toBe(0);
    expect(progressInitial.pendingCount).toBe(2);
    expect(progressInitial.pendingPeople).toBe(1);
    expect(progressInitial.completedPeople).toBe(0);
    expect(progressInitial.done).toBe(false);

    // Envia 1 documento (Passagem) -> 1 pendência restante
    const docsPartial = [{ cast_member_id: "m-1", doc_type: "doc-passagem" }];
    const progressPartial = computeShowProgress(members, docsPartial, requirements);
    expect(progressPartial.received).toBe(1);
    expect(progressPartial.pendingCount).toBe(1);
    expect(progressPartial.pendingPeople).toBe(1);
    expect(progressPartial.completedPeople).toBe(0);
    expect(progressPartial.done).toBe(false);

    // Envia o segundo documento (Hotel) -> 0 pendências, status concluído
    const docsComplete = [
      { cast_member_id: "m-1", doc_type: "doc-passagem" },
      { cast_member_id: "m-1", doc_type: "doc-hotel" },
    ];
    const progressComplete = computeShowProgress(members, docsComplete, requirements);
    expect(progressComplete.received).toBe(2);
    expect(progressComplete.pendingCount).toBe(0);
    expect(progressComplete.pendingPeople).toBe(0);
    expect(progressComplete.completedPeople).toBe(1);
    expect(progressComplete.done).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste 2 (BVA TC-03.2): Membro sem exigência configurada
  // Regra de ouro: NUNCA adiciona pendência ao total e é identificado como dispensado
  // ───────────────────────────────────────────────────────────────────────────
  it("Teste 2 (BVA TC-03.2): membro sem exigência configurada NUNCA onera a contagem de pendências", () => {
    // 5 integrantes locais (sem exigência) + 1 integrante com 2 exigências pendentes
    const members = [
      { id: "local-1" },
      { id: "local-2" },
      { id: "local-3" },
      { id: "local-4" },
      { id: "local-5" },
      { id: "viajante-1" },
    ];

    const requirements: ShowRequirement[] = [
      { cast_member_id: "viajante-1", document_type_id: "doc-passagem", required: true },
      { cast_member_id: "viajante-1", document_type_id: "doc-hotel", required: true },
    ];

    const docs: { cast_member_id: string; doc_type: string }[] = [];

    const progress = computeShowProgress(members, docs, requirements);

    expect(progress.members).toBe(6);
    expect(progress.activePeople).toBe(1);
    expect(progress.unrequiredPeople).toBe(5);
    expect(progress.expected).toBe(2); // APENAS as 2 exigências do viajante, nunca 6 ou 12
    expect(progress.received).toBe(0);
    expect(progress.pendingCount).toBe(2);
    expect(progress.pendingPeople).toBe(1);
    expect(progress.completedPeople).toBe(0);

    // Valida status individual de um membro sem exigência
    const localStatus = computeMemberRequirementStatus("local-1", requirements, docs);
    expect(localStatus.hasRequirement).toBe(false);
    expect(localStatus.isUnrequired).toBe(true);
    expect(localStatus.pendingCount).toBe(0);
    expect(localStatus.expectedCount).toBe(0);
    expect(localStatus.status).toBe("no_requirement");

    // Valida status individual do viajante
    const viajanteStatus = computeMemberRequirementStatus("viajante-1", requirements, docs);
    expect(viajanteStatus.hasRequirement).toBe(true);
    expect(viajanteStatus.isUnrequired).toBe(false);
    expect(viajanteStatus.pendingCount).toBe(2);
    expect(viajanteStatus.status).toBe("pending");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste 3: Contador consolidado discriminado (formatação clara para o produtor)
  // ───────────────────────────────────────────────────────────────────────────
  it("Teste 3: gera contador consolidado discriminado (ativos, concluídos, pendentes, dispensados)", () => {
    // 15 integrantes no total:
    // - 8 concluídos (1 exigência, 1 doc entregue)
    // - 3 pendentes (1 exigência, 0 doc entregue)
    // - 4 sem exigência nesta data (dispensados)
    const members = Array.from({ length: 15 }, (_, i) => ({ id: `m-${i + 1}` }));

    const requirements: ShowRequirement[] = [
      // 8 concluídos: m-1 até m-8
      ...Array.from({ length: 8 }, (_, i) => ({
        cast_member_id: `m-${i + 1}`,
        document_type_id: "doc-passagem",
        required: true,
      })),
      // 3 pendentes: m-9 até m-11
      ...Array.from({ length: 3 }, (_, i) => ({
        cast_member_id: `m-${i + 9}`,
        document_type_id: "doc-passagem",
        required: true,
      })),
      // m-12 até m-15: sem exigência
    ];

    const docs = Array.from({ length: 8 }, (_, i) => ({
      cast_member_id: `m-${i + 1}`,
      doc_type: "doc-passagem",
    }));

    const progress = computeShowProgress(members, docs, requirements);

    expect(progress.members).toBe(15);
    expect(progress.activePeople).toBe(11);
    expect(progress.completedPeople).toBe(8);
    expect(progress.pendingPeople).toBe(3);
    expect(progress.unrequiredPeople).toBe(4);

    const summary = formatShowProgressSummary(progress);
    expect(summary).toBe(
      "15 integrantes: 11 ativos (8 concluídos, 3 pendentes), 4 sem exigência nesta data",
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste 4: Cálculo do balanço do rider técnico (total, confirmados, exceções, pendentes)
  // ───────────────────────────────────────────────────────────────────────────
  it("Teste 4: calcula balanço do rider com itens confirmados, exceções e pendentes", () => {
    const items: ShowRiderItem[] = [
      { id: "r-1", status: "confirmed" },
      { id: "r-2", status: "confirmed" },
      { id: "r-3", status: "confirmed" },
      { id: "r-4", status: "confirmed" },
      { id: "r-5", status: "confirmed" },
      { id: "r-6", status: "exception" },
      { id: "r-7", status: "exception" },
      { id: "r-8", status: "pending" },
      { id: "r-9", status: "pending" },
      { id: "r-10", status: "pending" },
    ];

    const balance = computeRiderBalance(items);

    expect(balance.total).toBe(10);
    expect(balance.confirmed).toBe(5);
    expect(balance.exceptions).toBe(2);
    expect(balance.pending).toBe(3);
    expect(balance.isComplete).toBe(false);
    expect(balance.hasExceptions).toBe(true);
    expect(balance.pct).toBe(50); // 5 de 10 confirmados

    // Caso onde todos foram confirmados
    const allConfirmed: ShowRiderItem[] = [
      { id: "r-1", status: "confirmed" },
      { id: "r-2", status: "confirmed" },
    ];
    const balanceComplete = computeRiderBalance(allConfirmed);
    expect(balanceComplete.isComplete).toBe(true);
    expect(balanceComplete.pending).toBe(0);
    expect(balanceComplete.hasExceptions).toBe(false);
    expect(balanceComplete.pct).toBe(100);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste 5 (TC-03.3): Idempotência de presets em lote
  // Aplicar duas vezes o mesmo preset não duplica exigências
  // ───────────────────────────────────────────────────────────────────────────
  it("Teste 5 (TC-03.3): aplicação de preset em lote é estritamente idempotente", () => {
    const memberIds = ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6", "m-7", "m-8", "m-9", "m-10"];
    const docTypeIds = ["doc-passagem", "doc-hotel"];

    // Cenário inicial: m-1 e m-2 já tinham "Passagem" configurada previamente
    const existingRequirements: ShowRequirement[] = [
      { cast_member_id: "m-1", document_type_id: "doc-passagem", required: true },
      { cast_member_id: "m-2", document_type_id: "doc-passagem", required: true },
    ];

    // Primeira aplicação do preset para os 10 membros
    const result1 = applyRequirementPreset(existingRequirements, memberIds, docTypeIds, "show-123");

    // Total esperado: 10 membros * 2 tipos = 20 exigências (as 2 já existentes são preservadas, não duplicadas)
    expect(result1.length).toBe(20);

    // Garante que não há nenhuma tupla (cast_member_id, document_type_id) duplicada
    const keys = result1.map((r) => `${r.cast_member_id}::${r.document_type_id}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(result1.length);

    // Segunda aplicação do mesmo preset sobre o resultado anterior (idempotência)
    const result2 = applyRequirementPreset(result1, memberIds, docTypeIds, "show-123");
    expect(result2.length).toBe(20);
    expect(result2).toEqual(result1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste TC-05.1: Limpeza de chave Pix para cópia
  // ───────────────────────────────────────────────────────────────────────────
  it("TC-05.1: limpa pontuação de CPF e telefone para cópia de chave Pix", () => {
    // CPF com pontuação -> apenas números
    expect(cleanPixKeyForCopy("123.456.789-00", "cpf")).toBe("12345678900");
    // Telefone com formatação -> apenas dígitos
    expect(cleanPixKeyForCopy("+55 (11) 99999-9999", "phone")).toBe("5511999999999");
    // E-mail -> mantém texto limpo
    expect(cleanPixKeyForCopy("  artista@hubtour.com  ", "email")).toBe("artista@hubtour.com");
    // EVP / Aleatória -> mantém UUID limpo
    expect(cleanPixKeyForCopy(" 123e4567-e89b-12d3-a456-426614174000 ", "random")).toBe("123e4567-e89b-12d3-a456-426614174000");
    // Vazio -> retorna string vazia
    expect(cleanPixKeyForCopy("", "cpf")).toBe("");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste de Retrocompatibilidade: assinatura legada de computeShowProgress
  // ───────────────────────────────────────────────────────────────────────────
  it("mantém suporte retrocompatível com a assinatura antiga de computeShowProgress", () => {
    const members = [{ id: "m-1" }, { id: "m-2" }];
    const legacyDocTypes = [
      { id: "dt-1", required: true },
      { id: "dt-2", required: false },
    ];
    const docs = [{ cast_member_id: "m-1", doc_type: "dt-1" }];

    // Chamada no formato antigo (members, docs, docTypes legados)
    const progress = computeShowProgress(members, docs, legacyDocTypes);
    expect(progress.expected).toBe(2);
    expect(progress.received).toBe(1);
    expect(progress.pendingPeople).toBe(1);
    expect(progress.members).toBe(2);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste: Descrição de documento no Relatório de Produção (formatDocumentDescription)
  // ───────────────────────────────────────────────────────────────────────────
  it("prioriza a observação (note) do documento e cai para o nome do arquivo quando ausente", () => {
    // Cenário 1: Com observação -> exibe a observação
    expect(
      formatDocumentDescription({
        note: "Voo GOL 1234, 28/11 18h",
        file_name: "Invoice-0504D1C1-0023 (1).pdf",
      }),
    ).toBe("Voo GOL 1234, 28/11 18h");

    // Cenário 2: Outra observação com espaços ao redor -> exibe note com trim
    expect(
      formatDocumentDescription({
        note: "  Almoço no aeroporto  ",
        file_name: "recibo_scan.jpg",
      }),
    ).toBe("Almoço no aeroporto");

    // Cenário 3: Sem observação (null) -> cai para o nome do arquivo
    expect(
      formatDocumentDescription({
        note: null,
        file_name: "passagem_la3271.pdf",
      }),
    ).toBe("passagem_la3271.pdf");

    // Cenário 4: Sem observação (undefined) -> cai para o nome do arquivo
    expect(
      formatDocumentDescription({
        note: undefined,
        file_name: "voucher_hotel_ibis.pdf",
      }),
    ).toBe("voucher_hotel_ibis.pdf");

    // Cenário 5: Observação vazia ou apenas espaços -> cai para o nome do arquivo
    expect(
      formatDocumentDescription({
        note: "   ",
        file_name: "comprovante_uber.pdf",
      }),
    ).toBe("comprovante_uber.pdf");

    // Cenário 6: Sem observação e sem nome de arquivo -> fallback para 'arquivo'
    expect(
      formatDocumentDescription({
        note: null,
        file_name: null,
      }),
    ).toBe("arquivo");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste: Formatação de data no padrão brasileiro DD/MM/AAAA (formatDateBR)
  // ───────────────────────────────────────────────────────────────────────────
  it("formata datas no padrão brasileiro DD/MM/AAAA sem sofrer distorção de fuso horário", () => {
    // Caso padrão exigido na spec
    expect(formatDateBR("2026-11-28")).toBe("28/11/2026");

    // Outros casos (começo e meio de ano)
    expect(formatDateBR("2026-01-05")).toBe("05/01/2026");
    expect(formatDateBR("2026-09-07")).toBe("07/09/2026");

    // Strings vazias ou inválidas
    expect(formatDateBR("")).toBe("");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Teste: Reordenação de itens do Rider Padrão (reorderRiderItems)
  // ───────────────────────────────────────────────────────────────────────────
  it("reordena itens do rider mantendo posições sequenciais íntegras", () => {
    const items = [
      { id: "item-1", position: 0, name: "Item A" },
      { id: "item-2", position: 1, name: "Item B" },
      { id: "item-3", position: 2, name: "Item C" },
    ];

    // Move Item B para cima (índice 1 para 0)
    const movedUp = reorderRiderItems(items, 1, 0);
    expect(movedUp.map((i) => i.id)).toEqual(["item-2", "item-1", "item-3"]);
    expect(movedUp.map((i) => i.position)).toEqual([0, 1, 2]);

    // Move Item B para baixo (índice 1 para 2)
    const movedDown = reorderRiderItems(items, 1, 2);
    expect(movedDown.map((i) => i.id)).toEqual(["item-1", "item-3", "item-2"]);
    expect(movedDown.map((i) => i.position)).toEqual([0, 1, 2]);

    // Índices fora dos limites -> não altera
    expect(reorderRiderItems(items, -1, 2)).toEqual(items);
    expect(reorderRiderItems(items, 1, 99)).toEqual(items);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RF-11: Priorização e Segregação de Itens Inegociáveis vs Desejáveis
  // ───────────────────────────────────────────────────────────────────────────
  it("TC-11.1 & TC-11.4: bloqueio de conclusão e contadores segregados (RF-11)", () => {
    // Cenário: 3 desejáveis confirmados e 1 inegociável pendente
    const itemsPartial = [
      { id: "des-1", status: "confirmed", is_mandatory: false },
      { id: "des-2", status: "confirmed", is_mandatory: false },
      { id: "des-3", status: "confirmed", is_mandatory: false },
      { id: "mand-1", status: "pending", is_mandatory: true },
    ];

    const balancePartial = computeRiderBalance(itemsPartial);

    // TC-11.1: Mesmo com todos desejáveis confirmados, NÃO pode indicar completo se inegociável estiver pendente
    expect(balancePartial.isComplete).toBe(false);
    expect(balancePartial.hasMandatoryPendingOrException).toBe(true);

    // TC-11.4: Contadores segregados em mandatory e desirable
    expect(balancePartial.mandatory).toEqual({
      total: 1,
      confirmed: 0,
      exceptions: 0,
      pending: 1,
      isComplete: false,
      hasExceptions: false,
    });
    expect(balancePartial.desirable).toEqual({
      total: 3,
      confirmed: 3,
      exceptions: 0,
      pending: 0,
      isComplete: true,
      hasExceptions: false,
    });

    // Cenário: Inegociável em exceção também bloqueia conclusão geral
    const itemsException = [
      { id: "des-1", status: "confirmed", is_mandatory: false },
      { id: "mand-1", status: "exception", is_mandatory: true },
    ];
    const balanceException = computeRiderBalance(itemsException);
    expect(balanceException.isComplete).toBe(false);
    expect(balanceException.hasMandatoryPendingOrException).toBe(true);
    expect(balanceException.mandatory.hasExceptions).toBe(true);

    // Cenário: Todos inegociáveis confirmados e desejáveis confirmados -> completo!
    const itemsAllConfirmed = [
      { id: "des-1", status: "confirmed", is_mandatory: false },
      { id: "mand-1", status: "confirmed", is_mandatory: true },
    ];
    const balanceAll = computeRiderBalance(itemsAllConfirmed);
    expect(balanceAll.isComplete).toBe(true);
    expect(balanceAll.hasMandatoryPendingOrException).toBe(false);
    expect(balanceAll.mandatory.isComplete).toBe(true);
    expect(balanceAll.desirable.isComplete).toBe(true);
  });

  it("TC-11.3: ordenação priorizada (inegociáveis pendentes antes de desejáveis pendentes)", () => {
    const items = [
      { id: "des-conf", status: "confirmed", is_mandatory: false, position: 0 },
      { id: "des-pend", status: "pending", is_mandatory: false, position: 1 },
      { id: "mand-conf", status: "confirmed", is_mandatory: true, position: 2 },
      { id: "mand-pend", status: "pending", is_mandatory: true, position: 3 },
      { id: "des-exc", status: "exception", is_mandatory: false, position: 4 },
      { id: "mand-exc", status: "exception", is_mandatory: true, position: 5 },
    ];

    const sorted = sortRiderItemsByPriority(items);

    // Ordem esperada:
    // 1º: mand-pend (Inegociável pendente)
    // 2º: des-pend (Desejável pendente)
    // 3º: mand-exc (Inegociável em exceção - severidade mais crítica)
    // 4º: des-exc (Desejável em exceção)
    // 5º e 6º: confirmados mantendo position relativa (des-conf pos 0, mand-conf pos 2)
    expect(sorted.map((i) => i.id)).toEqual([
      "mand-pend",
      "des-pend",
      "mand-exc",
      "des-exc",
      "des-conf",
      "mand-conf",
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // BVA & Casos Limite: Fronteiras de Cálculo e Ordenação do Rider
  // ───────────────────────────────────────────────────────────────────────────
  it("BVA: casos limites de lista vazia, status indefinido e riders homogêneos", () => {
    // 1. Lista de itens vazia
    const emptyBalance = computeRiderBalance([]);
    expect(emptyBalance.total).toBe(0);
    expect(emptyBalance.isComplete).toBe(false);
    expect(emptyBalance.hasMandatoryPendingOrException).toBe(false);
    expect(emptyBalance.mandatory.total).toBe(0);
    expect(emptyBalance.desirable.total).toBe(0);
    expect(sortRiderItemsByPriority([])).toEqual([]);

    // 2. Itens sem status ou com status vazio -> tratados como pending
    const itemsUndefinedStatus = [
      { id: "i-1", status: "", is_mandatory: true },
      { id: "i-2", status: "pending", is_mandatory: false },
    ];
    const balanceUndef = computeRiderBalance(itemsUndefinedStatus);
    expect(balanceUndef.pending).toBe(2);
    expect(balanceUndef.mandatory.pending).toBe(1);
    expect(balanceUndef.desirable.pending).toBe(1);
    expect(balanceUndef.isComplete).toBe(false);

    // 3. Rider 100% desejável (sem itens inegociáveis cadastrados)
    const onlyDesirable = [
      { id: "d-1", status: "confirmed", is_mandatory: false },
      { id: "d-2", status: "confirmed", is_mandatory: false },
    ];
    const balanceOnlyDesirable = computeRiderBalance(onlyDesirable);
    expect(balanceOnlyDesirable.mandatory.total).toBe(0);
    expect(balanceOnlyDesirable.desirable.total).toBe(2);
    expect(balanceOnlyDesirable.isComplete).toBe(true);

    // 4. Rider 100% inegociável com 1 exceção -> bloqueia conclusão
    const onlyMandatoryWithException = [
      { id: "m-1", status: "confirmed", is_mandatory: true },
      { id: "m-2", status: "exception", is_mandatory: true },
    ];
    const balanceOnlyMandatory = computeRiderBalance(onlyMandatoryWithException);
    expect(balanceOnlyMandatory.isComplete).toBe(false);
    expect(balanceOnlyMandatory.hasMandatoryPendingOrException).toBe(true);
    expect(balanceOnlyMandatory.mandatory.hasExceptions).toBe(true);

    // 5. Ordenação quando todos já estão confirmados (preserva position)
    const allDone = [
      { id: "p-3", status: "confirmed", is_mandatory: false, position: 3 },
      { id: "p-1", status: "confirmed", is_mandatory: true, position: 1 },
      { id: "p-2", status: "confirmed", is_mandatory: false, position: 2 },
    ];
    const sortedAllDone = sortRiderItemsByPriority(allDone);
    expect(sortedAllDone.map((i) => i.id)).toEqual(["p-1", "p-2", "p-3"]);
  });
});
