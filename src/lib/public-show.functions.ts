import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sanitizeMessageText } from "./g3";

export const getPublicShow = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(4) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Busca integrante pelo access_token individual exclusivo
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("cast_members")
      .select("id, name, role, show_id")
      .eq("access_token", data.token)
      .maybeSingle();

    if (memberErr) throw new Error(memberErr.message);
    if (!member) return null;

    // 2. Busca dados do show associado
    const { data: show, error: showErr } = await supabaseAdmin
      .from("shows")
      .select("id, city, venue, show_date, artist_id, user_id, artists(name)")
      .eq("id", member.show_id)
      .maybeSingle();

    if (showErr) throw new Error(showErr.message);
    if (!show) return null;

    // 3. Busca roles do produtor, tipos de documento e APENAS as exigências e documentos DESTE integrante
    const [
      { data: roles },
      { data: docTypes },
      { data: requirements },
      { data: documents },
    ] = await Promise.all([
      supabaseAdmin.from("cast_roles").select("id, name").eq("user_id", show.user_id),
      supabaseAdmin
        .from("document_types")
        .select("id, name, reimbursable, position")
        .eq("user_id", show.user_id)
        .order("position"),
      supabaseAdmin
        .from("show_requirements")
        .select("id, cast_member_id, document_type_id, required, deadline_date")
        .eq("show_id", show.id)
        .eq("cast_member_id", member.id),
      supabaseAdmin
        .from("documents")
        .select("id, cast_member_id, doc_type, file_name, created_at")
        .eq("show_id", show.id)
        .eq("cast_member_id", member.id)
        .order("created_at", { ascending: false }),
    ]);

    const roleName = (value: string) =>
      (roles ?? []).find((r) => r.id === value)?.name ?? value;

    return {
      show: {
        id: show.id as string,
        city: show.city as string,
        venue: (show.venue as string | null) ?? null,
        show_date: show.show_date as string,
        artist: (show.artists as { name: string } | null)?.name ?? null,
      },
      member: {
        id: member.id as string,
        name: member.name as string,
        role: roleName(member.role as string),
      },
      docTypes: (docTypes ?? []).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        reimbursable: t.reimbursable as boolean,
      })),
      requirements: (requirements ?? []).map((r) => ({
        id: r.id as string,
        castMemberId: r.cast_member_id as string,
        docTypeId: r.document_type_id as string,
        required: r.required as boolean,
        deadlineDate: (r.deadline_date as string | null) ?? null,
      })),
      documents: (documents ?? []).map((d) => ({
        id: d.id as string,
        castMemberId: d.cast_member_id as string,
        docTypeId: d.doc_type as string,
        fileName: (d.file_name as string | null) ?? null,
        createdAt: d.created_at as string,
      })),
    };
  });

export const MAX_BYTES = 20 * 1024 * 1024;
export const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "pdf"];
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export const submitDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(4),
        docTypeId: z.string().uuid(),
        filePath: z.string().min(3),
        fileName: z.string().max(200).optional(),
        note: z.string().max(500).optional(),
        amount: z.number().positive("O valor deve ser maior que zero").max(9999999).optional(),
        isReimbursement: z.boolean().optional(),
      })
      .parse(data),
  )

  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Resolve o integrante exclusivamente a partir do access_token individual recebido
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("cast_members")
      .select("id, show_id")
      .eq("access_token", data.token)
      .maybeSingle();

    if (memberErr) throw new Error(memberErr.message);
    if (!member) throw new Error("Link ou token inválido.");

    // 2. Busca o show associado ao integrante para validações de contexto e segurança
    const { data: show, error: showErr } = await supabaseAdmin
      .from("shows")
      .select("id, user_id")
      .eq("id", member.show_id)
      .maybeSingle();

    if (showErr) throw new Error(showErr.message);
    if (!show) throw new Error("Show não encontrado.");

    if (!data.filePath.startsWith(`${show.id}/`)) throw new Error("Arquivo inválido");

    const { data: docType } = await supabaseAdmin
      .from("document_types")
      .select("id, reimbursable")
      .eq("id", data.docTypeId)
      .eq("user_id", show.user_id)
      .maybeSingle();

    if (!docType) throw new Error("Tipo de documento inválido");

    const removeUpload = async () => {
      await supabaseAdmin.storage.from("documentos").remove([data.filePath]);
    };

    const ext = data.filePath.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      await removeUpload();
      throw new Error("Formato não aceito. Envie uma imagem (JPG, PNG, WEBP) ou PDF.");
    }

    const folder = data.filePath.slice(0, data.filePath.lastIndexOf("/"));
    const objectName = data.filePath.slice(data.filePath.lastIndexOf("/") + 1);
    const { data: listed } = await supabaseAdmin.storage
      .from("documentos")
      .list(folder, { search: objectName, limit: 1 });

    const meta = listed?.find((o) => o.name === objectName);
    if (!meta) throw new Error("Arquivo não encontrado no envio. Tente novamente.");

    const size = (meta.metadata as { size?: number } | null)?.size ?? 0;
    const mime = ((meta.metadata as { mimetype?: string } | null)?.mimetype ?? "").toLowerCase();

    if (size > MAX_BYTES) {
      await removeUpload();
      throw new Error("Arquivo acima de 20 MB. Envie um arquivo menor.");
    }
    if (mime && !ALLOWED_MIME.includes(mime)) {
      await removeUpload();
      throw new Error("Formato não aceito. Envie uma imagem (JPG, PNG, WEBP) ou PDF.");
    }

    const isReimbursement = data.isReimbursement ?? docType.reimbursable;

    const { error: insertError } = await supabaseAdmin.from("documents").insert({
      user_id: show.user_id,
      show_id: show.id,
      cast_member_id: member.id,
      doc_type: data.docTypeId,
      file_path: data.filePath,
      file_name: data.fileName ?? null,
      note: data.note ?? null,
      is_reimbursement: isReimbursement,
      amount: isReimbursement ? (data.amount ?? null) : null,
    });

    if (insertError) throw new Error(insertError.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// T-10: Funções do Servidor para Página Pública de Confirmação do Rider (/r/$token)
// ─────────────────────────────────────────────────────────────────────────────

export const getPublicRider = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(4) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Localiza o show pelo token exclusivo do rider
    const { data: show, error: showErr } = await supabaseAdmin
      .from("shows")
      .select("id, city, venue, show_date, artist_id, artists(name)")
      .eq("rider_public_token", data.token)
      .maybeSingle();

    if (showErr) throw new Error(showErr.message);
    if (!show) return null;

    // Busca os itens do rider do show ordenados por posição e mensagens associadas
    const [
      { data: items, error: itemsErr },
      { data: messages, error: messagesErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("show_rider_items")
        .select(
          "id, category, item_name, specification, quantity, is_mandatory, position, status, exception_note, confirmed_by_venue_at",
        )
        .eq("show_id", show.id)
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("show_rider_item_messages")
        .select("id, show_rider_item_id, author_type, author_name, message, created_at")
        .eq("show_id", show.id)
        .order("created_at", { ascending: true }),
    ]);

    if (itemsErr) throw new Error(itemsErr.message);
    if (messagesErr) throw new Error(messagesErr.message);

    const messagesByItem = new Map<string, any[]>();
    ((messages ?? []) as any[]).forEach((m) => {
      const list = messagesByItem.get(m.show_rider_item_id as string) ?? [];
      list.push(m);
      messagesByItem.set(m.show_rider_item_id as string, list);
    });

    return {
      show: {
        id: show.id as string,
        city: show.city as string,
        venue: (show.venue as string | null) ?? null,
        show_date: show.show_date as string,
        artist: (show.artists as { name: string } | null)?.name ?? null,
      },
      items: (items ?? []).map((item) => ({
        id: item.id as string,
        category: item.category as string,
        item_name: item.item_name as string,
        specification: (item.specification as string | null) ?? null,
        quantity: Number(item.quantity) || 1,
        is_mandatory: Boolean(item.is_mandatory),
        position: Number(item.position) || 0,
        status: (item.status as "pending" | "confirmed" | "exception" | "accepted_with_exception") || "pending",
        exception_note: (item.exception_note as string | null) ?? null,
        confirmed_by_venue_at: (item.confirmed_by_venue_at as string | null) ?? null,
        messages: messagesByItem.get(item.id as string) ?? [],
      })),
    };
  });

export const updatePublicRiderItemSchema = z.object({
  token: z.string().min(4),
  itemId: z.string().uuid(),
  // Bloqueio estrito de elevação de privilégio (AppSec Seção 7):
  // A casa SÓ pode definir 'confirmed', 'exception' ou 'pending'.
  // 'accepted_with_exception' é terminantemente proibido nesta rota pública.
  status: z.enum(["confirmed", "exception", "pending"]),
  exceptionNote: z.string().max(1000).optional().nullable(),
});

export const updatePublicRiderItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updatePublicRiderItemSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Localiza o show pelo token de rider
    const { data: show, error: showErr } = await supabaseAdmin
      .from("shows")
      .select("id")
      .eq("rider_public_token", data.token)
      .maybeSingle();

    if (showErr) throw new Error(showErr.message);
    if (!show) throw new Error("Link de rider inválido ou expirado.");

    // 2. Blindagem de segurança anti-IDOR/BOLA (A01:2025):
    // Obrigatoriamente WHERE id = itemId AND show_id = show.id
    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: data.status,
      confirmed_by_venue_at: nowIso,
      exception_note: data.status === "exception" ? data.exceptionNote?.trim() || null : null,
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("show_rider_items")
      .update(updatePayload)
      .eq("id", data.itemId)
      .eq("show_id", show.id) // << Validação composta anti-IDOR / BOLA estrita
      .select("id, status, exception_note, confirmed_by_venue_at")
      .maybeSingle();

    if (updateErr) throw new Error(updateErr.message);
    if (!updated) {
      throw new Error("Item do rider não pertence a este evento. Operação negada.");
    }

    return { ok: true, item: updated, savedAt: nowIso };
  });

export const submitPublicRiderMessageSchema = z.object({
  token: z.string().min(4),
  itemId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1, "A mensagem não pode estar vazia.")
    .max(1000, "Mensagem não pode exceder 1000 caracteres."),
});

/**
 * Submete mensagem de tréplica da casa de show com validação anti-IDOR e rate limiting em duas camadas (RF-14 / T-17 / AppSec Seção 7)
 */
export const submitPublicRiderMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitPublicRiderMessageSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Localiza o show pelo token público do rider
    const { data: show, error: showErr } = await supabaseAdmin
      .from("shows")
      .select("id")
      .eq("rider_public_token", data.token)
      .maybeSingle();

    if (showErr || !show) throw new Error("Link de rider inválido ou expirado.");

    // 2. Blindagem anti-IDOR: O item PRECISA pertencer ao show resolvido
    const { data: item, error: itemErr } = await supabaseAdmin
      .from("show_rider_items")
      .select("id, status")
      .eq("id", data.itemId)
      .eq("show_id", show.id)
      .maybeSingle();

    if (itemErr || !item) {
      throw new Error("Item do rider não pertence a este evento. Operação negada.");
    }

    // 3. Controle de Taxa em Duas Camadas (Anti-Abuso e Anti-Spam - AppSec Seção 7)
    // 3.1 Camada Global por Token: máx 10 mensagens por minuto somando todos os itens do show
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: globalCount } = await supabaseAdmin
      .from("show_rider_item_messages")
      .select("id", { count: "exact", head: true })
      .eq("show_id", show.id)
      .gte("created_at", oneMinuteAgo);

    if ((globalCount ?? 0) >= 10) {
      throw new Error("Muitas mensagens enviadas recentemente. Aguarde um minuto antes de tentar novamente.");
    }

    // 3.2 Camada por Item: intervalo mínimo de 5s, teto máximo de 30 mensagens e bloqueio de monólogo
    const [
      { count: itemMsgCount },
      { data: recentMsgs },
    ] = await Promise.all([
      supabaseAdmin
        .from("show_rider_item_messages")
        .select("id", { count: "exact", head: true })
        .eq("show_rider_item_id", data.itemId),
      supabaseAdmin
        .from("show_rider_item_messages")
        .select("id, author_type, created_at")
        .eq("show_rider_item_id", data.itemId)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

    if ((itemMsgCount ?? 0) >= 30) {
      throw new Error("Limite de mensagens para este item atingido. Entre em contato direto com a produção.");
    }

    const lastMsg = recentMsgs?.[0];
    if (lastMsg) {
      const diffMs = Date.now() - new Date(lastMsg.created_at).getTime();
      if (diffMs < 5000) {
        throw new Error("Aguarde alguns segundos antes de enviar outra mensagem.");
      }
    }

    // Bloqueio de monólogo: se as últimas 2 mensagens foram da casa ('venue'), exige réplica da produção
    if (recentMsgs && recentMsgs.length >= 2 && recentMsgs.every((m) => m.author_type === "venue")) {
      throw new Error("Aguarde a resposta da produção antes de enviar uma nova mensagem para este item.");
    }

    // 4. Inserção segura da mensagem (com sanitização RF-14 / T-17)
    const sanitized = sanitizeMessageText(data.message);
    if (!sanitized) {
      throw new Error("A mensagem não pode ser vazia.");
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("show_rider_item_messages")
      .insert({
        show_id: show.id,
        show_rider_item_id: data.itemId,
        author_type: "venue",
        author_name: "Casa de Show",
        message: sanitized,
      })
      .select("id, show_rider_item_id, author_type, author_name, message, created_at")
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || "Erro ao registrar mensagem na thread.");
    }

    return { ok: true, message: inserted };
  });

