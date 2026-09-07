import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicShow = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(4) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: show, error } = await supabaseAdmin
      .from("shows")
      .select("id, city, venue, show_date, artist_id, user_id, artists(name)")
      .eq("public_token", data.token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!show) return null;

    const [
      { data: cast },
      { data: roles },
      { data: docTypes },
      { data: requirements },
      { data: documents },
    ] = await Promise.all([
      supabaseAdmin.from("cast_members").select("id, name, role").eq("show_id", show.id).order("name"),
      supabaseAdmin.from("cast_roles").select("id, name").eq("user_id", show.user_id),
      supabaseAdmin
        .from("document_types")
        .select("id, name, reimbursable, position")
        .eq("user_id", show.user_id)
        .order("position"),
      supabaseAdmin
        .from("show_requirements")
        .select("id, cast_member_id, document_type_id, required, deadline_date")
        .eq("show_id", show.id),
      supabaseAdmin
        .from("documents")
        .select("id, cast_member_id, doc_type, file_name, created_at")
        .eq("show_id", show.id)
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
      cast: (cast ?? []).map((m) => ({
        id: m.id as string,
        name: m.name as string,
        role: roleName(m.role as string),
      })),
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

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "pdf"];
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export const submitDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(4),
        castMemberId: z.string().uuid(),
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

    const { data: show, error } = await supabaseAdmin
      .from("shows")
      .select("id, user_id")
      .eq("public_token", data.token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!show) throw new Error("Link inválido");

    const { data: member } = await supabaseAdmin
      .from("cast_members")
      .select("id")
      .eq("id", data.castMemberId)
      .eq("show_id", show.id)
      .maybeSingle();

    if (!member) throw new Error("Pessoa não pertence a este show");
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
      cast_member_id: data.castMemberId,
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
