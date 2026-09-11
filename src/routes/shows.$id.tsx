import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  Smartphone,
  Building2,
  CheckSquare,
  Square,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCatalog } from "@/hooks/useCatalog";
import { AppShell } from "@/components/AppShell";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import {
  computeShowProgress,
  computeMemberRequirementStatus,
  computeRiderBalance,
  sortStageRiderItems,
  cleanPixKeyForCopy,
  formatBRL,
  initials,
  labelFrom,
  type ShowRequirement,
  type ShowRiderItem,
} from "@/lib/g3";

export const Route = createFileRoute("/shows/$id")({
  head: () => ({
    meta: [
      { title: "Prancheta do Show — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Prancheta do show: elenco, exigências de documentos em lote, rider técnico, reembolsos e links de compartilhamento.",
      },
      { property: "og:title", content: "Prancheta do Show — Hub Manager Tour" },
      {
        property: "og:description",
        content:
          "Elenco, exigências individuais, conferência de rider técnico e liquidação de reembolsos.",
      },
    ],
  }),
  component: ShowDetail,
});

type TabKey = "cast" | "docs" | "rider" | "reimbursements" | "quick_actions";

function ShowDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { session, loading } = useSession();
  const qc = useQueryClient();

  // Abas
  const [activeTab, setActiveTab] = useState<TabKey>("cast");

  // Estado de edição e exclusão de show
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Inclusão de integrante
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<string>("");

  // Seleção em lote para presets de exigência
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Feedback de cópia
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [copiedRiderLink, setCopiedRiderLink] = useState(false);
  const [copiedPixDocId, setCopiedPixDocId] = useState<string | null>(null);

  // Modo Palco Mobile (RF-08 & RF-11)
  const [isStageMode, setIsStageMode] = useState(false);
  const [divergenceNoteEditingId, setDivergenceNoteEditingId] = useState<string | null>(null);
  const [divergenceNoteText, setDivergenceNoteText] = useState("");

  const { roles, docTypes } = useCatalog(!!session);

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  useEffect(() => {
    if (!memberRole && roles[0]) setMemberRole(roles[0].id);
  }, [memberRole, roles]);

  // Consulta abrangente do show, elenco, documentos, exigências, itens de rider e catálogo de pessoas
  const { data, isLoading: isLoadingShow } = useQuery({
    queryKey: ["show", id],
    enabled: !!session,
    queryFn: async () => {
      const [
        { data: show },
        { data: cast },
        { data: docs },
        { data: reqs },
        { data: rider },
        { data: peopleList },
      ] = await Promise.all([
        supabase
          .from("shows")
          .select(
            "id, city, venue, show_date, public_token, rider_public_token, artist_id, tour_id, artists(name), tours(name)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("cast_members")
          .select("id, name, role, person_id, access_token")
          .eq("show_id", id)
          .order("name"),
        supabase
          .from("documents")
          .select(
            "id, cast_member_id, doc_type, file_path, file_name, note, amount, is_reimbursement, is_reimbursed, reimbursed_at, created_at",
          )
          .eq("show_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("show_requirements")
          .select("id, show_id, cast_member_id, document_type_id, required, deadline_date")
          .eq("show_id", id),
        supabase
          .from("show_rider_items")
          .select(
            "id, show_id, category, item_name, specification, quantity, is_mandatory, position, status, exception_note, confirmed_by_venue_at, physical_check, physical_divergence_note",
          )
          .eq("show_id", id)
          .order("position"),
        supabase
          .from("people")
          .select("id, name, pix_type, pix_key, default_role_id")
          .order("name"),
      ]);

      return {
        show,
        cast: cast ?? [],
        docs: docs ?? [],
        requirements: (reqs ?? []) as ShowRequirement[],
        riderItems: (rider ?? []) as ShowRiderItem[],
        people: peopleList ?? [],
      };
    },
  });

  const show = data?.show;
  const cast = data?.cast ?? [];
  const docs = data?.docs ?? [];
  const requirements = data?.requirements ?? [];
  const riderItems = data?.riderItems ?? [];
  const people = data?.people ?? [];

  // Mapa de pessoas para acesso a dados de Pix e dados complementares
  const peopleMap = useMemo(() => {
    const map = new Map<string, (typeof people)[number]>();
    for (const p of people) {
      map.set(p.id, p);
      map.set(`name::${p.name.trim().toLowerCase()}`, p);
    }
    return map;
  }, [people]);

  function getPersonForMember(m: { person_id: string | null; name: string }) {
    if (m.person_id && peopleMap.has(m.person_id)) {
      return peopleMap.get(m.person_id);
    }
    return peopleMap.get(`name::${m.name.trim().toLowerCase()}`);
  }

  // Cálculos centrais do motor g3
  const progress = useMemo(
    () => computeShowProgress(cast, docs, requirements),
    [cast, docs, requirements],
  );

  const riderBalance = useMemo(() => computeRiderBalance(riderItems), [riderItems]);

  // Modo Palco (RF-08 & RF-11): Itens ordenados para auditoria física no palco
  const stageRiderItems = useMemo(
    () => sortStageRiderItems(riderItems),
    [riderItems],
  );

  const stageStats = useMemo(() => {
    const conformed = riderItems.filter((i) => i.physical_check === "conformed").length;
    const divergent = riderItems.filter((i) => i.physical_check === "divergent").length;
    const unchecked = riderItems.filter(
      (i) => !i.physical_check || i.physical_check === "unchecked",
    ).length;
    return { conformed, divergent, unchecked };
  }, [riderItems]);

  const reimbursableDocs = useMemo(() => docs.filter((d) => d.is_reimbursement), [docs]);
  const withAmount = useMemo(
    () => reimbursableDocs.filter((d) => d.amount != null),
    [reimbursableDocs],
  );
  const totalAmount = useMemo(
    () => withAmount.reduce((sum, d) => sum + Number(d.amount ?? 0), 0),
    [withAmount],
  );

  const reimbursedDocs = useMemo(
    () => reimbursableDocs.filter((d) => d.is_reimbursed),
    [reimbursableDocs],
  );
  const totalReimbursedAmount = useMemo(
    () => reimbursedDocs.reduce((sum, d) => sum + Number(d.amount ?? 0), 0),
    [reimbursedDocs],
  );

  const pendingReimbursementDocs = useMemo(
    () => reimbursableDocs.filter((d) => !d.is_reimbursed),
    [reimbursableDocs],
  );
  const totalPendingReimbursementAmount = useMemo(
    () => pendingReimbursementDocs.reduce((sum, d) => sum + Number(d.amount ?? 0), 0),
    [pendingReimbursementDocs],
  );

  // URLs públicas
  const getMemberPublicUrl = (accessToken?: string | null) => {
    if (typeof window === "undefined" || !accessToken) return "";
    return `${window.location.origin}/p/${accessToken}`;
  };

  const riderPublicUrl =
    typeof window !== "undefined" && show
      ? `${window.location.origin}/r/${show.rider_public_token}`
      : "";

  // ───────────────────────────────────────────────────────────────────────────
  // Mutações: Elenco e Exigências
  // ───────────────────────────────────────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      const finalName = memberName.trim();
      if (!finalName) throw new Error("Informe o nome do integrante");

      const { error } = await supabase.from("cast_members").insert({
        show_id: id,
        name: finalName,
        role: memberRole,
        person_id: selectedPersonId || null,
        user_id: userId,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setMemberName("");
      setSelectedPersonId("");
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Integrante adicionado ao elenco");
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("cast_members").delete().eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Integrante removido do elenco");
    },
    onError: (e: Error) => setActionError(e.message),
  });

  // Alternar exigência individual de um membro (adicionar ou remover)
  const toggleRequirement = useMutation({
    mutationFn: async ({
      memberId,
      docTypeId,
      existingReqId,
    }: {
      memberId: string;
      docTypeId: string;
      existingReqId?: string | undefined;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      if (existingReqId) {
        const { error } = await supabase
          .from("show_requirements")
          .delete()
          .eq("id", existingReqId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("show_requirements").insert({
          show_id: id,
          cast_member_id: memberId,
          document_type_id: docTypeId,
          user_id: userId,
          required: true,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(`Falha ao alterar exigência: ${e.message}`),
  });

  // Ação em lote: aplicar preset "Toda a Banda (Passagem + Hotel)"
  const applyBandPreset = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      // Localiza tipos de documento para Passagem e Hotel
      const passagem = docTypes.find(
        (t) =>
          t.name.toLowerCase().includes("passagem") ||
          t.name.toLowerCase().includes("aéreo"),
      );
      const hotel = docTypes.find(
        (t) =>
          t.name.toLowerCase().includes("hotel") ||
          t.name.toLowerCase().includes("voucher") ||
          t.name.toLowerCase().includes("hospedagem"),
      );

      const targetDocTypeIds = [passagem?.id, hotel?.id].filter(Boolean) as string[];

      if (targetDocTypeIds.length === 0) {
        throw new Error(
          "Tipos de documento 'Passagem' ou 'Hotel' não foram encontrados no catálogo.",
        );
      }

      // Alvos: selecionados na tela OU todos os músicos/integrantes do elenco
      let targetMemberIds = selectedMemberIds;
      if (targetMemberIds.length === 0) {
        const musicians = cast.filter((m) => {
          const roleObj = roles.find((r) => r.id === m.role);
          const roleName = (roleObj?.name ?? m.role).toLowerCase();
          return (
            roleName.includes("músico") ||
            roleName.includes("integrante") ||
            roleName.includes("banda")
          );
        });
        targetMemberIds =
          musicians.length > 0 ? musicians.map((m) => m.id) : cast.map((m) => m.id);
      }

      if (targetMemberIds.length === 0) {
        throw new Error("Não há integrantes no elenco para aplicar o preset.");
      }

      // Monta tuplas e executa upsert idempotente
      const toUpsert = targetMemberIds.flatMap((memberId) =>
        targetDocTypeIds.map((docTypeId) => ({
          show_id: id,
          cast_member_id: memberId,
          document_type_id: docTypeId,
          user_id: userId,
          required: true,
        })),
      );

      const { error } = await supabase
        .from("show_requirements")
        .upsert(toUpsert, { onConflict: "show_id,cast_member_id,document_type_id" });

      if (error) throw new Error(error.message);

      return targetMemberIds.length;
    },
    onSuccess: (count) => {
      setSelectedMemberIds([]);
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(
        `Preset "Passagem + Hotel" aplicado para ${count} integrante${count === 1 ? "" : "s"}!`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Ação em lote: dispensar todas as exigências dos integrantes selecionados
  const clearRequirementsBatch = useMutation({
    mutationFn: async () => {
      if (selectedMemberIds.length === 0) {
        throw new Error("Selecione ao menos um integrante para dispensar exigências.");
      }

      const { error } = await supabase
        .from("show_requirements")
        .delete()
        .eq("show_id", id)
        .in("cast_member_id", selectedMemberIds);

      if (error) throw new Error(error.message);
      return selectedMemberIds.length;
    },
    onSuccess: (count) => {
      setSelectedMemberIds([]);
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.info(
        `Exigências removidas para ${count} integrante${count === 1 ? "" : "s"} (agora sem exigência).`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Mutações: Reembolsos e Documentos
  // ───────────────────────────────────────────────────────────────────────────
  const toggleReimbursed = useMutation({
    mutationFn: async ({
      docId,
      currentStatus,
      memberName: mName,
    }: {
      docId: string;
      currentStatus: boolean;
      memberName: string;
    }) => {
      const nextStatus = !currentStatus;
      const { error } = await supabase
        .from("documents")
        .update({
          is_reimbursed: nextStatus,
          reimbursed_at: nextStatus ? new Date().toISOString() : null,
        })
        .eq("id", docId);

      if (error) throw new Error(error.message);
      return { nextStatus, mName };
    },
    onSuccess: ({ nextStatus, mName }) => {
      qc.invalidateQueries({ queryKey: ["show", id] });
      if (nextStatus) {
        toast.success(`Reembolso de ${mName} marcado como pago!`);
      } else {
        toast.info(`Reembolso de ${mName} marcado como pendente.`);
      }
    },
    onError: (e: Error) => toast.error(`Falha ao alterar status de reembolso: ${e.message}`),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      if (doc.file_path) {
        await supabase.storage.from("documentos").remove([doc.file_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["show", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Documento excluído com sucesso");
    },
    onError: (e: Error) => setActionError(e.message),
  });

  // Modo Palco (RF-08 & RF-11): Atualização de conferência física (OK Conforme / Divergência)
  const updatePhysicalCheck = useMutation({
    mutationFn: async ({
      itemId,
      status,
      note,
    }: {
      itemId: string;
      status: "unchecked" | "conformed" | "divergent";
      note?: string | null;
    }) => {
      const { error } = await supabase
        .from("show_rider_items")
        .update({
          physical_check: status,
          physical_divergence_note: note ?? null,
        })
        .eq("id", itemId)
        .eq("show_id", id);

      if (error) throw new Error(error.message);
      return { itemId, status };
    },
    onSuccess: ({ status }) => {
      qc.invalidateQueries({ queryKey: ["show", id] });
      setDivergenceNoteEditingId(null);
      setDivergenceNoteText("");
      if (status === "conformed") {
        toast.success("Item conferido e confirmado no palco!");
      } else if (status === "divergent") {
        toast.warning("Divergência registrada na ficha técnica do show.");
      } else {
        toast.info("Conferência física do item desmarcada.");
      }
    },
    onError: (e: Error) => toast.error(`Erro ao registrar conferência no palco: ${e.message}`),
  });

  // Clonagem do rider padrão do artista em show vazio
  const cloneArtistRider = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Usuário não autenticado.");
      if (!show?.artist_id) {
        throw new Error("Este show não possui um artista vinculado.");
      }

      // Regra de segurança 1: Reconsultar show_rider_items diretamente no banco (proteção contra race conditions)
      const { count, error: countErr } = await supabase
        .from("show_rider_items")
        .select("id", { count: "exact", head: true })
        .eq("show_id", id);

      if (countErr) {
        throw new Error(`Falha ao verificar itens existentes: ${countErr.message}`);
      }

      if (count != null && count > 0) {
        throw new Error("O show já possui itens de rider cadastrados. A clonagem em lote só é permitida em shows vazios.");
      }

      // Regra de segurança 2: Consultar catálogo padrão do artista
      const { data: templates, error: tmplError } = await supabase
        .from("artist_rider_template_items")
        .select("*")
        .eq("artist_id", show.artist_id)
        .order("position");

      if (tmplError) {
        throw new Error(`Falha ao consultar rider padrão: ${tmplError.message}`);
      }

      if (!templates || templates.length === 0) {
        throw new Error("O artista ainda não tem rider padrão cadastrado em Configurações.");
      }

      // Mapeamento de linhas de rider padrão para o show (mesma lógica da criação de show)
      const riderRows = templates.map((tmpl) => ({
        user_id: session.user.id,
        show_id: id,
        template_item_id: tmpl.id,
        category: tmpl.category,
        item_name: tmpl.item_name,
        specification: tmpl.specification,
        quantity: tmpl.quantity,
        is_mandatory: tmpl.is_mandatory,
        position: tmpl.position,
        status: "pending",
        physical_check: "unchecked",
      }));

      const { error: insertError } = await supabase.from("show_rider_items").insert(riderRows);
      if (insertError) {
        throw new Error(`Falha ao inserir itens do rider: ${insertError.message}`);
      }

      return { count: riderRows.length };
    },
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ["show", id] });
      toast.success(
        count === 1
          ? "1 item de rider clonado do catálogo padrão."
          : `${count} itens de rider clonados do catálogo padrão.`,
      );
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["show", id] });
    },
  });

  // Exclusão completa do show
  const deleteShow = useMutation({
    mutationFn: async () => {
      const paths = (data?.docs ?? []).map((d) => d.file_path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("documentos").remove(paths);
      }
      const del = async (
        table: "documents" | "show_requirements" | "show_rider_items" | "cast_members",
      ) => {
        const { error } = await supabase.from(table).delete().eq("show_id", id);
        if (error) throw new Error(error.message);
      };
      await del("documents");
      await del("show_requirements");
      await del("show_rider_items");
      await del("cast_members");
      const { error } = await supabase.from("shows").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Show excluído permanentemente");
      router.navigate({ to: "/" });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  async function openDocument(path: string) {
    const { data: res } = await supabase.storage.from("documentos").createSignedUrl(path, 60 * 10);
    if (res?.signedUrl) {
      window.open(res.signedUrl, "_blank", "noopener");
    } else {
      toast.error("Não foi possível gerar link temporário do arquivo.");
    }
  }

  function handleCopyMemberLink(member: { id: string; name: string; access_token?: string | null }) {
    const url = getMemberPublicUrl(member.access_token);
    if (!url) {
      toast.error(`Integrante ${member.name} ainda não possui link individual gerado.`);
      return;
    }
    navigator.clipboard.writeText(url);
    setCopiedMemberId(member.id);
    toast.success(`Link individual de ${member.name} copiado!`);
    setTimeout(() => setCopiedMemberId(null), 2000);
  }

  function handleCopyRiderLink() {
    if (!riderPublicUrl) return;
    navigator.clipboard.writeText(riderPublicUrl);
    setCopiedRiderLink(true);
    toast.success("Link do rider para a casa copiado! Envie ao contratante ou promotor local.");
    setTimeout(() => setCopiedRiderLink(false), 2000);
  }

  function handleCopyPix(person: (typeof people)[number], docId: string, mName: string) {
    if (!person?.pix_key) return;
    const cleanKey = cleanPixKeyForCopy(person.pix_key, person.pix_type);
    navigator.clipboard.writeText(cleanKey);
    setCopiedPixDocId(docId);
    toast.success(`Chave Pix de ${mName} copiada!`);
    setTimeout(() => setCopiedPixDocId(null), 2000);
  }

  if (loading || !session) return null;

  return (
    <AppShell email={session.user.email}>
      {/* Navegação de retorno */}
      <Link
        to="/"
        className="label-mono hover:text-foreground active:opacity-70 transition-opacity duration-120 touch-manipulation inline-flex items-center gap-1.5"
      >
        <span>←</span> Voltar para a agenda
      </Link>

      {isLoadingShow ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-10 w-3/4 max-w-lg" />
          <Skeleton className="h-6 w-1/2 max-w-sm" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !show ? (
        <div className="mt-8 border border-line p-8 text-center">
          <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Show não encontrado
          </p>
          <Link
            to="/"
            className="mt-4 inline-block bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider"
          >
            Voltar para a agenda
          </Link>
        </div>
      ) : (
        <>
          {/* Cabeçalho do Show (Direção Nocturne) */}
          <section className="mt-4 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
            <div className="min-w-0 flex-1">
              <p className="label-mono text-[#9184d9]">
                {show.tours?.name ? `Tour ${show.tours.name}` : "Show avulso"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {show.artists?.name ?? "SEM ARTISTA"}
              </h1>
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {show.city}
                {show.venue ? ` · ${show.venue}` : ""} · {show.show_date}
              </p>
            </div>

            {/* Balanço e Contadores de Pendência */}
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-2">
                {!progress.hasRequirement ? (
                  <StatusBadge
                    status="no_requirement"
                    label="Sem exigência configurada"
                    size="sm"
                  />
                ) : progress.pendingPeople > 0 ? (
                  <StatusBadge
                    status="pending"
                    label={`${progress.pendingPeople} ${progress.pendingPeople === 1 ? "pendente" : "pendentes"}`}
                    size="sm"
                  />
                ) : (
                  <StatusBadge status="confirmed" label="Tudo recebido" size="sm" />
                )}
              </div>

              <div className="font-mono text-[11px] text-muted-foreground text-left sm:text-right">
                {progress.summaryText}
              </div>

              {/* Barra de progresso visual */}
              {progress.hasRequirement ? (
                <div className="w-44 h-1.5 bg-accent/40 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      progress.done ? "bg-ok" : "bg-[#9184d9]",
                    )}
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              ) : null}

              {/* Ações Rápidas de Topo */}
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to="/shows/$id/ficha"
                  params={{ id }}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-accent active:scale-[0.97] transition-all duration-120 touch-manipulation"
                >
                  Relatório de Produção
                </Link>
                <button
                  onClick={() => {
                    setEditing((v) => !v);
                    setConfirmDelete(false);
                    setActionError(null);
                  }}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-accent active:scale-[0.97] transition-all duration-120 touch-manipulation"
                >
                  {editing ? "Fechar edição" : "Editar"}
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete((v) => !v);
                    setEditing(false);
                    setConfirmText("");
                    setActionError(null);
                  }}
                  className="border border-destructive px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-all duration-120 touch-manipulation"
                >
                  Excluir
                </button>
              </div>
            </div>
          </section>

          {/* Painel de Edição de Show */}
          {editing ? (
            <EditShowForm
              show={show}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                qc.invalidateQueries({ queryKey: ["show", id] });
                qc.invalidateQueries({ queryKey: ["dashboard"] });
                toast.success("Dados do show atualizados!");
              }}
            />
          ) : null}

          {/* Painel de Confirmação de Exclusão */}
          {confirmDelete ? (
            <section className="mt-6 border border-destructive p-5 bg-destructive/5 rounded-xl">
              <div className="label-mono text-destructive flex items-center gap-2">
                <AlertTriangle className="size-4" /> Excluir show definitivamente
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed">
                Esta ação apaga <strong>permanentemente</strong> o show, as {cast.length} pessoas
                do elenco, as exigências configuradas, o rider e os {docs.length} documento
                {docs.length === 1 ? "" : "s"} enviados (incluindo arquivos do storage).
              </p>
              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Para confirmar, digite exatamente a cidade do show: <strong>{show.city}</strong>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={show.city}
                  className="border border-line bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
                />
                <button
                  disabled={
                    confirmText.trim().toLowerCase() !== show.city.trim().toLowerCase() ||
                    deleteShow.isPending
                  }
                  onClick={() => deleteShow.mutate()}
                  className="bg-destructive px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground disabled:opacity-40 active:scale-[0.97] transition-all duration-120 touch-manipulation"
                >
                  {deleteShow.isPending ? "Excluindo..." : "Excluir definitivamente"}
                </button>
              </div>
              {actionError ? (
                <p className="mt-2 font-mono text-xs text-destructive">{actionError}</p>
              ) : null}
            </section>
          ) : null}

          {/* Barra de Abas da Prancheta (Nocturne Tab Bar) */}
          <nav
            aria-label="Abas da Prancheta"
            className="mt-6 flex items-center gap-1 border-b border-line overflow-x-auto scrollbar-none"
          >
            <TabButton
              active={activeTab === "cast"}
              onClick={() => setActiveTab("cast")}
              label="Elenco & Exigências"
              badge={cast.length}
              hasAlert={progress.hasRequirement && progress.pendingPeople > 0}
            />
            <TabButton
              active={activeTab === "docs"}
              onClick={() => setActiveTab("docs")}
              label="Documentos"
              badge={docs.length}
            />
            <TabButton
              active={activeTab === "rider"}
              onClick={() => setActiveTab("rider")}
              label="Rider Técnico"
              badge={`${riderBalance.confirmed}/${riderBalance.total}`}
            />
            <TabButton
              active={activeTab === "reimbursements"}
              onClick={() => setActiveTab("reimbursements")}
              label="Reembolsos"
              badge={reimbursableDocs.length}
              hasAlert={pendingReimbursementDocs.length > 0}
            />
            <TabButton
              active={activeTab === "quick_actions"}
              onClick={() => setActiveTab("quick_actions")}
              label="Ações Rápidas & Links"
            />
          </nav>

          {/* ─────────────────────────────────────────────────────────────────
              ABA 1: ELENCO & EXIGÊNCIAS
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === "cast" ? (
            <div className="mt-6 space-y-6">
              {/* Presets de Exigências em Lote (RF-03) */}
              <div className="border border-[#9184d9]/30 bg-[#9184d9]/5 p-5 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Sparkles className="size-4 text-[#9184d9]" />
                      <span>Presets de Exigências em Lote</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Configure exigências para múltiplos integrantes com 1 toque, ou selecione
                      pessoas específicas abaixo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={applyBandPreset.isPending}
                      onClick={() => applyBandPreset.mutate()}
                      className="inline-flex items-center gap-2 bg-[#9184d9] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all duration-120 touch-manipulation shadow-sm disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5" />
                      {applyBandPreset.isPending
                        ? "Aplicando..."
                        : selectedMemberIds.length > 0
                          ? `Aplicar Passagem + Hotel (${selectedMemberIds.length})`
                          : "Aplicar padrão: Toda a Banda (Passagem + Hotel)"}
                    </button>

                    {selectedMemberIds.length > 0 ? (
                      <button
                        type="button"
                        disabled={clearRequirementsBatch.isPending}
                        onClick={() => clearRequirementsBatch.mutate()}
                        className="border border-line px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent active:scale-[0.97] transition-all duration-120 touch-manipulation rounded-lg"
                      >
                        Dispensar selecionados ({selectedMemberIds.length})
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Seleção rápida em lote */}
                {cast.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-[#9184d9]/20 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedMemberIds.length === cast.length) {
                          setSelectedMemberIds([]);
                        } else {
                          setSelectedMemberIds(cast.map((m) => m.id));
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      {selectedMemberIds.length === cast.length
                        ? "Desmarcar todos"
                        : "Selecionar todos do elenco"}
                    </button>
                    <span className="text-muted-foreground/50">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const musicians = cast
                          .filter((m) => {
                            const roleObj = roles.find((r) => r.id === m.role);
                            const roleName = (roleObj?.name ?? m.role).toLowerCase();
                            return (
                              roleName.includes("músico") ||
                              roleName.includes("integrante") ||
                              roleName.includes("banda")
                            );
                          })
                          .map((m) => m.id);
                        setSelectedMemberIds(musicians);
                      }}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Selecionar apenas músicos
                    </button>
                    {selectedMemberIds.length > 0 ? (
                      <span className="ml-auto text-[#9184d9] font-medium">
                        {selectedMemberIds.length} de {cast.length} selecionado(s)
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Lista do Elenco com Chips de Exigências */}
              <div className="border border-line rounded-xl overflow-hidden bg-card">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-accent/20">
                  <span className="label-mono font-medium text-foreground">
                    Integrantes Escalados ({cast.length})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Toque nos badges para adicionar ou dispensar exigências
                  </span>
                </div>

                {cast.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="size-10 mx-auto text-muted-foreground/50" />
                    <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Nenhum integrante escalado neste show
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adicione integrantes no formulário abaixo para configurar exigências.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {cast.map((m) => {
                      const memberPerson = getPersonForMember(m);
                      const memberDocs = docs.filter((d) => d.cast_member_id === m.id);
                      const memberStatus = computeMemberRequirementStatus(
                        m.id,
                        requirements,
                        docs,
                      );
                      const isSelected = selectedMemberIds.includes(m.id);

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors",
                            isSelected ? "bg-[#9184d9]/5" : "hover:bg-accent/10",
                          )}
                        >
                          {/* Identificação da Pessoa */}
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMemberIds((prev) =>
                                  prev.includes(m.id)
                                    ? prev.filter((id) => id !== m.id)
                                    : [...prev, m.id],
                                );
                              }}
                              className="shrink-0 text-muted-foreground hover:text-foreground touch-manipulation"
                              title="Selecionar para lote"
                            >
                              {isSelected ? (
                                <CheckSquare className="size-5 text-[#9184d9]" />
                              ) : (
                                <Square className="size-5" />
                              )}
                            </button>

                            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-accent/30 font-mono text-xs font-medium">
                              {initials(m.name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{m.name}</span>
                                {memberPerson?.pix_key ? (
                                  <span
                                    title={`Chave Pix cadastrada (${memberPerson.pix_type ?? "Pix"})`}
                                    className="text-[10px] font-mono px-1.5 py-0.2 border border-line text-muted-foreground rounded"
                                  >
                                    PIX
                                  </span>
                                ) : null}
                              </div>
                              <div className="label-mono text-muted-foreground">
                                {labelFrom(roles, m.role)}
                              </div>
                            </div>
                          </div>

                          {/* Chips de Exigências de Documentos (Interativos) */}
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {/* Status individual consolidado */}
                            {memberStatus.isUnrequired ? (
                              <StatusBadge
                                status="no_requirement"
                                label="Sem exigência"
                                size="sm"
                              />
                            ) : memberStatus.isComplete ? (
                              <StatusBadge
                                status="confirmed"
                                label={`Tudo recebido (${memberStatus.receivedCount}/${memberStatus.expectedCount})`}
                                size="sm"
                              />
                            ) : (
                              <StatusBadge
                                status="pending"
                                label={`${memberStatus.pendingCount} pendente (${memberStatus.receivedCount}/${memberStatus.expectedCount})`}
                                size="sm"
                              />
                            )}

                            <div className="h-4 w-px bg-line mx-1 hidden sm:block" />

                            {/* Badges dos tipos de documento */}
                            {docTypes.map((t) => {
                              const existingReq = requirements.find(
                                (r) =>
                                  r.cast_member_id === m.id &&
                                  r.document_type_id === t.id &&
                                  r.required !== false,
                              );
                              const hasDoc = docs.some(
                                (d) => d.cast_member_id === m.id && d.doc_type === t.id,
                              );

                              if (hasDoc) {
                                return (
                                  <span
                                    key={t.id}
                                    title={`${t.name} entregue`}
                                    className="inline-flex items-center gap-1 border border-ok bg-ok/10 text-ok px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-md"
                                  >
                                    <Check className="size-3" /> {t.name}
                                  </span>
                                );
                              }

                              if (existingReq) {
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() =>
                                      toggleRequirement.mutate({
                                        memberId: m.id,
                                        docTypeId: t.id,
                                        existingReqId: existingReq.id,
                                      })
                                    }
                                    title={`Toque para dispensar ${t.name}`}
                                    className="inline-flex items-center gap-1 border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-md hover:bg-amber-500/20 active:scale-[0.97] transition-all touch-manipulation"
                                  >
                                    <Clock className="size-3" /> {t.name}
                                  </button>
                                );
                              }

                              // Não é exigido: permite ativar com 1 toque
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() =>
                                    toggleRequirement.mutate({
                                      memberId: m.id,
                                      docTypeId: t.id,
                                      existingReqId: undefined,
                                    })
                                  }
                                  title={`Toque para exigir ${t.name}`}
                                  className="inline-flex items-center gap-1 border border-dashed border-line text-muted-foreground hover:text-foreground hover:border-foreground/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-md active:scale-[0.97] transition-all touch-manipulation"
                                >
                                  <Plus className="size-3" /> {t.name}
                                </button>
                              );
                            })}

                            {/* Remover do elenco */}
                            {memberDocs.length > 0 ? (
                              <button
                                type="button"
                                title={`Não é possível excluir: ${memberDocs.length} documento${memberDocs.length === 1 ? "" : "s"} vinculado${memberDocs.length === 1 ? "" : "s"}`}
                                onClick={() =>
                                  toast.error(
                                    `Não é possível remover: ${m.name} tem ${memberDocs.length} documento(s) enviado(s). Exclua os documentos antes de remover a pessoa.`,
                                  )
                                }
                                className="shrink-0 p-1.5 text-muted-foreground/50 hover:text-muted-foreground"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            ) : (
                              <ConfirmButton
                                title="Remover do elenco"
                                onConfirm={() => removeMember.mutate(m.id)}
                                label=""
                                className="shrink-0 p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded"
                                confirmClassName="shrink-0 border border-destructive bg-destructive/10 px-2 py-1 font-mono text-[10px] uppercase text-destructive rounded"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulário: Adicionar Integrante ao Elenco */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addMember.mutate();
                  }}
                  className="flex flex-wrap items-end gap-3 border-t border-line bg-accent/20 p-4"
                >
                  {/* Seleção do Catálogo de Pessoas */}
                  <label className="min-w-48 flex-1">
                    <span className="label-mono">Pessoa do Catálogo (ou digite abaixo)</span>
                    <select
                      value={selectedPersonId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPersonId(pid);
                        if (pid) {
                          const p = people.find((item) => item.id === pid);
                          if (p) {
                            setMemberName(p.name);
                            if (p.default_role_id) setMemberRole(p.default_role_id);
                          }
                        }
                      }}
                      className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                    >
                      <option value="">Selecionar do catálogo central...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.pix_key ? `(Pix: ${p.pix_type ?? "ok"})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-40 flex-1">
                    <span className="label-mono">Nome da pessoa</span>
                    <input
                      required
                      value={memberName}
                      onChange={(e) => {
                        setMemberName(e.target.value);
                        setSelectedPersonId("");
                      }}
                      placeholder="Nome completo"
                      className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                    />
                  </label>

                  <label className="min-w-36">
                    <span className="label-mono">Função</span>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={addMember.isPending || !memberName.trim()}
                    className="bg-foreground text-background px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#9184d9] hover:text-white disabled:opacity-50 active:scale-[0.97] transition-all duration-120 touch-manipulation"
                  >
                    Adicionar
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {/* ─────────────────────────────────────────────────────────────────
              ABA 2: DOCUMENTOS RECEBIDOS
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === "docs" ? (
            <div className="mt-6 space-y-6">
              {/* Resumo de Documentação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Documentos Recebidos</div>
                  <div className="mt-2 text-3xl font-semibold">{docs.length}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    de {cast.length} integrantes
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Pessoas com Documentos</div>
                  <div className="mt-2 text-3xl font-semibold text-ok">
                    {progress.peopleWithDocs}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    ao menos 1 arquivo entregue
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Comprovantes de Reembolso</div>
                  <div className="mt-2 text-3xl font-semibold text-[#9184d9]">
                    {reimbursableDocs.length}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    soma: {formatBRL(totalAmount)}
                  </div>
                </div>
              </div>

              {/* Lista dos Documentos */}
              <div className="border border-line rounded-xl overflow-hidden bg-card">
                <div className="border-b border-line px-5 py-3.5 bg-accent/20">
                  <span className="label-mono font-medium text-foreground">
                    Lista de Comprovantes e Vouchers ({docs.length})
                  </span>
                </div>

                {docs.length === 0 ? (
                  <div className="p-10 text-center">
                    <FileText className="size-10 mx-auto text-muted-foreground/50" />
                    <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Nenhum documento enviado ainda
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Compartilhe os links individuais com os integrantes para que enviem seus arquivos.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("quick_actions")}
                      className="mt-4 inline-flex items-center gap-1.5 bg-[#9184d9] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider rounded-lg active:scale-[0.97]"
                    >
                      <Smartphone className="size-3.5" /> Ver Links do Elenco
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {docs.map((d) => {
                      const member = cast.find((m) => m.id === d.cast_member_id);
                      return (
                        <div
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent/10 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {member?.name ?? "Integrante avulso"}
                              </span>
                              <span className="border border-ok bg-ok/10 text-ok px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded">
                                {labelFrom(docTypes, d.doc_type)}
                              </span>
                              {d.is_reimbursement ? (
                                <span className="border border-[#9184d9] bg-[#9184d9]/10 text-[#9184d9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded">
                                  Reembolso
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <button
                                onClick={() => openDocument(d.file_path)}
                                className="font-mono underline underline-offset-2 hover:text-foreground flex items-center gap-1"
                              >
                                {d.file_name ?? "Visualizar comprovante"}
                                <ExternalLink className="size-3" />
                              </button>
                              {d.note ? <span>· Obs: {d.note}</span> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {d.amount != null ? (
                              <span className="font-mono text-sm font-medium">
                                {formatBRL(Number(d.amount))}
                              </span>
                            ) : null}

                            <ConfirmButton
                              title="Excluir documento"
                              onConfirm={() =>
                                deleteDocument.mutate({ id: d.id, file_path: d.file_path })
                              }
                              label="Excluir"
                              className="border border-line px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:border-destructive hover:text-destructive rounded"
                              confirmClassName="border border-destructive bg-destructive/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-destructive rounded"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ─────────────────────────────────────────────────────────────────
              ABA 3: RIDER TÉCNICO
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === "rider" ? (
            <div className="mt-6 space-y-6">
              {/* Balanço do Rider Técnico (Motor G3) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Total de Itens</div>
                  <div className="mt-2 text-3xl font-semibold">{riderBalance.total}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">especificados</div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-emerald-600 dark:text-emerald-400">
                    Confirmados
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-ok">
                    {riderBalance.confirmed}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {riderBalance.pct}% atendidos
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-purple-600 dark:text-purple-400">Exceções</div>
                  <div className="mt-2 text-3xl font-semibold text-purple-500">
                    {riderBalance.exceptions}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    alternativas sugeridas
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-amber-600 dark:text-amber-400">Pendentes</div>
                  <div className="mt-2 text-3xl font-semibold text-amber-500">
                    {riderBalance.pending}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">aguardando casa</div>
                </div>
              </div>

              {/* Botão de Compartilhar Rider com a Casa */}
              <div className="flex flex-wrap items-center justify-between gap-4 border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="size-4 text-emerald-500" />
                    <span>Link Público do Rider para a Casa de Show</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    A casa de show confirma os itens com auto-save em tempo real e sinaliza
                    exceções.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyRiderLink}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-emerald-700 active:scale-[0.97] transition-all"
                  >
                    <Copy className="size-3.5" />
                    {copiedRiderLink ? "Copiado!" : "Copiar Link do Rider"}
                  </button>
                  {riderPublicUrl ? (
                    <a
                      href={riderPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-line px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg flex items-center gap-1"
                    >
                      Abrir <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Controles de Visualização: Modo Palco vs Visão Padrão */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="label-mono font-medium text-foreground">
                    Itens de Palco e Camarim ({riderItems.length})
                  </span>
                  {stageStats.conformed > 0 ? (
                    <span className="font-mono text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                      {stageStats.conformed}/{riderItems.length} conferidos no palco
                    </span>
                  ) : null}
                  {stageStats.divergent > 0 ? (
                    <span className="font-mono text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
                      {stageStats.divergent} divergência(s)
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStageMode((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-all duration-120 touch-manipulation active:scale-[0.97]",
                      isStageMode
                        ? "bg-[#9184d9] text-white shadow-lg shadow-[#9184d9]/25 ring-2 ring-[#9184d9]/50"
                        : "border border-line bg-secondary/80 hover:bg-secondary text-foreground",
                    )}
                  >
                    <Smartphone className="size-4" />
                    <span>{isStageMode ? "Sair do Modo Palco" : "Modo Palco (Conferência)"}</span>
                  </button>
                </div>
              </div>

              {isStageMode ? (
                /* ─────────────────────────────────────────────────────────────
                   MODO PALCO MOBILE (RF-08 & RF-11)
                   Cards amplos, contraste para luz baixa, botões ≥ 48px
                   ───────────────────────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* Painel do Modo Palco */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-[#9184d9] animate-pulse" />
                          <h4 className="font-bold text-sm sm:text-base text-white tracking-wide">
                            Modo Palco · Conferência Física Presencial
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          Interface otimizada para iluminação baixa e toque amplo de polegar no smartphone (≥ 48px).
                          Audite o equipamento entregue no palco antes da passagem de som.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {stageStats.unchecked} a conferir
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
                          {stageStats.conformed} OK
                        </span>
                        {stageStats.divergent > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold">
                            {stageStats.divergent} divergência(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Lista de Cards do Modo Palco Ordenados pelo RF-11 */}
                  {stageRiderItems.length === 0 ? (
                    <div className="p-10 text-center border border-line rounded-2xl bg-card">
                      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Nenhum item cadastrado no rider
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {stageRiderItems.map((item) => {
                        const isMandatoryUrgent =
                          Boolean(item.is_mandatory) &&
                          (item.physical_check === "divergent" || item.status === "pending");
                        const isConformed = item.physical_check === "conformed";
                        const isDivergent = item.physical_check === "divergent";
                        const isEditingDivergence = divergenceNoteEditingId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-4 sm:p-5 rounded-2xl border transition-all duration-150 space-y-3",
                              isMandatoryUrgent
                                ? "border-destructive/70 bg-destructive/10 ring-1 ring-destructive/40"
                                : isConformed
                                  ? "border-emerald-500/50 bg-emerald-950/20"
                                  : isDivergent
                                    ? "border-amber-500/50 bg-amber-950/20"
                                    : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                                    {item.category}
                                  </span>

                                  {item.is_mandatory ? (
                                    <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border border-destructive/50 bg-destructive/20 text-destructive font-bold">
                                      Inegociável
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400">
                                      Desejável
                                    </span>
                                  )}

                                  {isMandatoryUrgent ? (
                                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-destructive text-white font-bold animate-pulse">
                                      Atenção Prioritária
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex items-baseline gap-2 pt-0.5">
                                  <h5 className="text-base sm:text-lg font-bold text-white">
                                    {item.item_name}
                                  </h5>
                                  <span className="font-mono text-sm font-bold text-zinc-400">
                                    x{item.quantity}
                                  </span>
                                </div>

                                {item.specification ? (
                                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                                    {item.specification}
                                  </p>
                                ) : null}

                                {/* Status vindo da Casa de Show */}
                                <div className="pt-1 text-xs">
                                  {item.status === "confirmed" ? (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                                      <CheckCircle2 className="size-3.5" />
                                      Confirmado pelo espaço
                                    </span>
                                  ) : item.status === "exception" ? (
                                    <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs mt-1">
                                      <strong>Exceção da casa:</strong> {item.exception_note || "Sem detalhe"}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-amber-400/90 font-mono text-[11px]">
                                      <Clock className="size-3.5" />
                                      Pendente de resposta da casa
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badge de conferência física atual */}
                              <div>
                                {isConformed ? (
                                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    ✓ Conforme no Palco
                                  </span>
                                ) : isDivergent ? (
                                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                    ⚠ Divergência Registrada
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    A conferir
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Exibição ou Formulário de Divergência Física */}
                            {item.physical_divergence_note && !isEditingDivergence ? (
                              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold font-mono uppercase text-[10px] text-amber-400 block">
                                    Divergência Presencial:
                                  </span>
                                  <p className="mt-0.5">{item.physical_divergence_note}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDivergenceNoteEditingId(item.id);
                                    setDivergenceNoteText(item.physical_divergence_note || "");
                                  }}
                                  className="text-[11px] font-mono underline hover:text-white"
                                >
                                  Editar
                                </button>
                              </div>
                            ) : null}

                            {isEditingDivergence ? (
                              <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/50 space-y-2">
                                <label className="label-mono text-[10px] text-amber-400 font-semibold block">
                                  Observação da Divergência (Áudio/Texto):
                                </label>
                                <textarea
                                  value={divergenceNoteText}
                                  onChange={(e) => setDivergenceNoteText(e.target.value)}
                                  placeholder="Descreva o que divergiu no palco (ex: modelo diferente, avaria, voltagem incorreta)..."
                                  rows={2}
                                  className="w-full text-xs p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDivergenceNoteEditingId(null);
                                      setDivergenceNoteText("");
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white border border-zinc-700"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePhysicalCheck.mutate({
                                        itemId: item.id,
                                        status: "divergent",
                                        note: divergenceNoteText.trim(),
                                      });
                                    }}
                                    disabled={updatePhysicalCheck.isPending}
                                    className="px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all active:scale-[0.97]"
                                  >
                                    Salvar Divergência
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {/* Botões Grandes de Toque de Polegar (TC-08.1 >= 48px, TC-08.2 active:scale-[0.97]) */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  updatePhysicalCheck.mutate({
                                    itemId: item.id,
                                    status: "conformed",
                                    note: null,
                                  });
                                }}
                                disabled={updatePhysicalCheck.isPending}
                                className={cn(
                                  "min-h-[48px] px-4 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-120 touch-manipulation active:scale-[0.97]",
                                  isConformed
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400"
                                    : "bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300",
                                )}
                              >
                                <CheckCircle2 className="size-4" />
                                <span>{isConformed ? "Recebido Conforme ✓" : "OK Recebido"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isDivergent) {
                                    setDivergenceNoteEditingId(item.id);
                                    setDivergenceNoteText(item.physical_divergence_note || "");
                                  } else {
                                    setDivergenceNoteEditingId(item.id);
                                    setDivergenceNoteText("");
                                  }
                                }}
                                disabled={updatePhysicalCheck.isPending}
                                className={cn(
                                  "min-h-[48px] px-4 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-120 touch-manipulation active:scale-[0.97]",
                                  isDivergent
                                    ? "bg-amber-600 text-white shadow-lg shadow-amber-900/40 ring-2 ring-amber-400"
                                    : "bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300",
                                )}
                              >
                                <AlertTriangle className="size-4" />
                                <span>{isDivergent ? "Editar Divergência" : "Divergência"}</span>
                              </button>
                            </div>

                            {/* Desfazer / Desmarcar conferência */}
                            {item.physical_check && item.physical_check !== "unchecked" ? (
                              <div className="text-right pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updatePhysicalCheck.mutate({
                                      itemId: item.id,
                                      status: "unchecked",
                                      note: null,
                                    });
                                  }}
                                  className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline"
                                >
                                  Desmarcar conferência física
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Lista Padrão dos Itens do Rider do Show */
                <div className="border border-line rounded-xl overflow-hidden bg-card">
                  <div className="border-b border-line px-5 py-3.5 bg-accent/20">
                    <span className="label-mono font-medium text-foreground">
                      Itens de Palco e Camarim ({riderItems.length})
                    </span>
                  </div>

                  {riderItems.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center">
                      <Layers className="size-10 mx-auto text-muted-foreground/50" />
                      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Nenhum item de rider neste show
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground max-w-md">
                        O rider padrão do artista pode ser configurado em Configurações para ser
                        carregado automaticamente nos próximos shows.
                      </p>
                      <button
                        type="button"
                        onClick={() => cloneArtistRider.mutate()}
                        disabled={cloneArtistRider.isPending}
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Sparkles className="size-4" />
                        {cloneArtistRider.isPending
                          ? "Clonando Rider Padrão..."
                          : "Clonar Rider Padrão do Artista Agora"}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {riderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent/10 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs uppercase px-2 py-0.5 border border-line bg-accent/30 rounded">
                                {item.category}
                              </span>
                              <span className="font-medium text-sm">{item.item_name}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                x{item.quantity}
                              </span>
                              {item.is_mandatory ? (
                                <span className="text-[10px] font-mono border border-destructive/30 text-destructive bg-destructive/5 px-1.5 py-0.2 rounded font-medium">
                                  Inegociável
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono border border-line text-muted-foreground px-1.5 py-0.2 rounded">
                                  Desejável
                                </span>
                              )}
                            </div>
                            {item.specification ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.specification}
                              </p>
                            ) : null}
                            {item.exception_note ? (
                              <div className="mt-1.5 flex items-start gap-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/10 p-2 rounded">
                                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Nota da casa:</strong> {item.exception_note}
                                </span>
                              </div>
                            ) : null}
                            {item.physical_divergence_note ? (
                              <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded">
                                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Divergência no palco:</strong> {item.physical_divergence_note}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {item.physical_check === "conformed" ? (
                              <span className="font-mono text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                                Palco: OK ✓
                              </span>
                            ) : item.physical_check === "divergent" ? (
                              <span
                                className="font-mono text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-semibold"
                                title={item.physical_divergence_note || ""}
                              >
                                Palco: Divergência ⚠
                              </span>
                            ) : null}

                            <StatusBadge
                              status={
                                item.status === "confirmed"
                                  ? "confirmed"
                                  : item.status === "exception"
                                    ? "exception"
                                    : "pending"
                              }
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* ─────────────────────────────────────────────────────────────────
              ABA 4: REEMBOLSOS & PIX (RF-05)
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === "reimbursements" ? (
            <div className="mt-6 space-y-6">
              {/* Cards de Métricas Financeiras */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Comprovantes</div>
                  <div className="mt-2 text-3xl font-semibold">{reimbursableDocs.length}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    solicitações enviadas
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-ok">Reembolsados (Pagos)</div>
                  <div className="mt-2 text-3xl font-semibold text-ok">
                    {formatBRL(totalReimbursedAmount)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {reimbursedDocs.length} liquidados
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-amber-500">Pendentes de Reembolso</div>
                  <div className="mt-2 text-3xl font-semibold text-amber-500">
                    {formatBRL(totalPendingReimbursementAmount)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {pendingReimbursementDocs.length} a pagar
                  </div>
                </div>

                <div className="border border-line p-4 rounded-xl bg-card">
                  <div className="label-mono text-muted-foreground">Total Declarado</div>
                  <div className="mt-2 text-3xl font-semibold">{formatBRL(totalAmount)}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {reimbursableDocs.length - withAmount.length} sem valor
                  </div>
                </div>
              </div>

              {/* Tabela de Reembolsos Operacionais com Pix (RF-05 / TC-05.1) */}
              <div className="border border-line rounded-xl overflow-hidden bg-card">
                <div className="border-b border-line px-5 py-3.5 bg-accent/20 flex items-center justify-between">
                  <span className="label-mono font-medium text-foreground">
                    Listagem de Reembolsos e Chaves Pix ({reimbursableDocs.length})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Copie a chave Pix em 1 toque e marque como reembolsado
                  </span>
                </div>

                {reimbursableDocs.length === 0 ? (
                  <div className="p-10 text-center">
                    <DollarSign className="size-10 mx-auto text-muted-foreground/50" />
                    <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Nenhuma solicitação de reembolso
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Quando integrantes enviarem comprovantes marcando &ldquo;Solicitar
                      reembolso&rdquo;, eles aparecerão aqui com valor e chave Pix.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {reimbursableDocs.map((d) => {
                      const member = cast.find((m) => m.id === d.cast_member_id);
                      const person = member ? getPersonForMember(member) : null;
                      const hasPix = Boolean(person?.pix_key);
                      const isCopied = copiedPixDocId === d.id;

                      return (
                        <div
                          key={d.id}
                          className={cn(
                            "flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 transition-colors",
                            d.is_reimbursed ? "bg-emerald-500/5" : "hover:bg-accent/10",
                          )}
                        >
                          {/* Coluna 1: Nome, Despesa e Arquivo */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {member?.name ?? "Integrante"}
                              </span>
                              <span className="label-mono text-muted-foreground">
                                {member ? labelFrom(roles, member.role) : ""}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="border border-line px-1.5 py-0.5 rounded font-mono uppercase text-[10px]">
                                {labelFrom(docTypes, d.doc_type)}
                              </span>
                              <button
                                onClick={() => openDocument(d.file_path)}
                                className="font-mono underline underline-offset-2 hover:text-foreground inline-flex items-center gap-1"
                              >
                                {d.file_name ?? "Abrir recibo"}
                                <ExternalLink className="size-3" />
                              </button>
                              {d.note ? <span>· {d.note}</span> : null}
                            </div>
                          </div>

                          {/* Coluna 2: Valor Solicitado */}
                          <div className="min-w-32">
                            <div className="text-xs text-muted-foreground label-mono">Valor</div>
                            <div className="font-mono text-base font-semibold text-foreground">
                              {d.amount != null ? (
                                formatBRL(Number(d.amount))
                              ) : (
                                <span className="text-amber-500 italic text-xs">Não informado</span>
                              )}
                            </div>
                          </div>

                          {/* Coluna 3: Chave Pix e Botão Copiar Pix (TC-05.1 / TC-05.2) */}
                          <div className="min-w-56">
                            <div className="text-xs text-muted-foreground label-mono">Chave Pix</div>
                            {hasPix ? (
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-xs truncate max-w-44 bg-accent/40 px-2 py-1 rounded border border-line">
                                  {person?.pix_key}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyPix(person!, d.id, member?.name ?? "Integrante")
                                  }
                                  title="Copiar chave Pix limpa (apenas números se CPF/telefone)"
                                  className="inline-flex items-center gap-1 bg-[#9184d9] text-white px-2.5 py-1 text-xs font-mono rounded hover:bg-[#8072c9] active:scale-[0.97] transition-all touch-manipulation shrink-0"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="size-3" /> Copiado
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="size-3" /> Copiar Pix
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 italic">
                                <span>Pix não cadastrado</span>
                                <Link
                                  to="/people"
                                  className="underline underline-offset-2 hover:text-foreground not-italic font-mono text-[10px] ml-1"
                                >
                                  (Cadastrar)
                                </Link>
                              </div>
                            )}
                          </div>

                          {/* Coluna 4: Switch de Liquidação (Reembolsado) */}
                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                toggleReimbursed.mutate({
                                  docId: d.id,
                                  currentStatus: d.is_reimbursed,
                                  memberName: member?.name ?? "Integrante",
                                })
                              }
                              disabled={toggleReimbursed.isPending}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg border active:scale-[0.97] transition-all touch-manipulation",
                                d.is_reimbursed
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
                              )}
                            >
                              {d.is_reimbursed ? (
                                <>
                                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Reembolsado</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Marcar como pago</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ─────────────────────────────────────────────────────────────────
              ABA 5: AÇÕES RÁPIDAS & LINKS (RF-05 / TC-05.3)
             ───────────────────────────────────────────────────────────────── */}
          {activeTab === "quick_actions" ? (
            <div className="mt-6 space-y-6">
              {/* Cards de Compartilhamento Claramente Diferenciados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 📱 Card: Links Individuais do Elenco (T-16 / RF-04) */}
                <div className="border border-[#9184d9]/40 bg-[#9184d9]/5 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid size-9 place-items-center rounded-lg bg-[#9184d9] text-white">
                          <Smartphone className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">Links do Elenco 📱</h3>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9184d9]">
                            Links individuais por integrante
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {cast.length} {cast.length === 1 ? "integrante" : "integrantes"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      Cada integrante possui seu próprio link individual e seguro. Ao abrir, ele cai
                      diretamente em sua checklist pessoal, sem acesso aos dados dos demais.
                    </p>

                    {cast.length === 0 ? (
                      <div className="mt-4 border border-dashed border-line p-4 rounded-xl text-center">
                        <p className="font-mono text-xs text-muted-foreground">
                          Nenhum integrante escalado neste show ainda. Adicione pessoas na aba Elenco para gerar os links individuais.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {cast.map((m) => {
                          const roleObj = roles.find((r) => r.id === m.role);
                          const memberRoleName = roleObj?.name ?? m.role;
                          const memberUrl = getMemberPublicUrl(m.access_token);
                          const isCopied = copiedMemberId === m.id;

                          return (
                            <div
                              key={m.id}
                              className="border border-line bg-background/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:border-[#9184d9]/50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate text-foreground">
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-accent/40 px-2 py-0.5 rounded-full shrink-0">
                                    {memberRoleName}
                                  </span>
                                </div>
                                <div className="mt-1 font-mono text-[11px] text-muted-foreground/80 truncate">
                                  {memberUrl || "Token pendente"}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMemberLink(m)}
                                  disabled={!m.access_token}
                                  className="inline-flex items-center gap-1.5 bg-[#9184d9] text-white py-1.5 px-3 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all touch-manipulation shadow-sm disabled:opacity-40"
                                  title={`Copiar link exclusivo de ${m.name}`}
                                >
                                  <Copy className="size-3.5" />
                                  {isCopied ? "Copiado!" : "Copiar link"}
                                </button>
                                {memberUrl ? (
                                  <a
                                    href={memberUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center border border-line p-1.5 rounded-lg hover:bg-accent active:scale-[0.97] text-muted-foreground hover:text-foreground"
                                    title={`Abrir página de ${m.name} em nova aba`}
                                  >
                                    <ExternalLink className="size-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 🏛️ Card: Link do Rider */}
                <div className="border border-emerald-500/40 bg-emerald-500/5 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">Link do Rider 🏛️</h3>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Para a Casa de Show / Contratante
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      Envie ao contratante ou casa de show para confirmação técnica item a item do
                      rider de som, luz, backline e camarim com auto-save.
                    </p>

                    <div className="mt-4 border border-line bg-background/80 p-3 rounded-lg font-mono text-xs break-all select-all text-muted-foreground">
                      {riderPublicUrl}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyRiderLink}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 px-4 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-emerald-700 active:scale-[0.97] transition-all touch-manipulation shadow-sm"
                    >
                      <Copy className="size-4" />
                      {copiedRiderLink ? "Link Copiado!" : "Copiar Link do Rider"}
                    </button>
                    {riderPublicUrl ? (
                      <a
                        href={riderPublicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center border border-line p-2.5 rounded-lg hover:bg-accent active:scale-[0.97]"
                        title="Abrir página pública do rider em nova aba"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Atalhos Rápidos Adicionais */}
              <div className="border border-line rounded-xl p-5 bg-card space-y-3">
                <div className="label-mono text-muted-foreground">Outros Atalhos de Produção</div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/shows/$id/ficha"
                    params={{ id }}
                    className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg flex items-center gap-2 active:scale-[0.97]"
                  >
                    <FileText className="size-4" /> Visualizar Relatório de Produção
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg active:scale-[0.97]"
                  >
                    Editar Dados Principais do Show
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number | string;
  hasAlert?: boolean;
}

function TabButton({ active, onClick, label, badge, hasAlert }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider whitespace-nowrap min-h-[44px] transition-all duration-120 touch-manipulation",
        active
          ? "border-b-2 border-[#9184d9] font-medium text-foreground bg-accent/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
      )}
    >
      <span>{label}</span>
      {badge !== undefined ? (
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full",
            active ? "bg-[#9184d9] text-white" : "bg-accent text-muted-foreground",
          )}
        >
          {badge}
        </span>
      ) : null}
      {hasAlert ? <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" /> : null}
    </button>
  );
}

type EditableShow = {
  id: string;
  city: string;
  venue: string | null;
  show_date: string;
  artist_id: string | null;
  tour_id: string | null;
  artists: { name: string } | null;
  tours: { name: string } | null;
};

function EditShowForm({
  show,
  onCancel,
  onSaved,
}: {
  show: EditableShow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [artist, setArtist] = useState(show.artists?.name ?? "");
  const [tour, setTour] = useState(show.tours?.name ?? "");
  const [city, setCity] = useState(show.city);
  const [date, setDate] = useState(show.show_date);
  const [venue, setVenue] = useState(show.venue ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      let artistId = show.artist_id;
      if (artist.trim() && artist.trim() !== (show.artists?.name ?? "")) {
        const { data: existing } = await supabase
          .from("artists")
          .select("id")
          .eq("name", artist.trim())
          .maybeSingle();
        if (existing) {
          artistId = existing.id;
        } else {
          const { data: created, error: artistError } = await supabase
            .from("artists")
            .insert({ name: artist.trim(), user_id: userId })
            .select("id")
            .single();
          if (artistError) throw new Error(artistError.message);
          artistId = created.id;
        }
      }

      let tourId = show.tour_id;
      const tourName = tour.trim();
      if (tourName !== (show.tours?.name ?? "")) {
        if (!tourName) {
          tourId = null;
        } else if (tourId) {
          const { error: tourError } = await supabase
            .from("tours")
            .update({ name: tourName })
            .eq("id", tourId);
          if (tourError) throw new Error(tourError.message);
        } else {
          if (!artistId) throw new Error("Informe o artista para criar a tour");
          const { data: createdTour, error: tourError } = await supabase
            .from("tours")
            .insert({ name: tourName, artist_id: artistId, user_id: userId })
            .select("id")
            .single();
          if (tourError) throw new Error(tourError.message);
          tourId = createdTour.id;
        }
      }

      const { error: updateError } = await supabase
        .from("shows")
        .update({
          artist_id: artistId,
          tour_id: tourId,
          city,
          show_date: date,
          venue: venue || null,
        })
        .eq("id", show.id);
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
      className="mt-6 grid grid-cols-1 gap-4 border border-line p-5 rounded-xl bg-card sm:grid-cols-2 lg:grid-cols-5"
    >
      <EditField label="Artista" value={artist} onChange={setArtist} required />
      <EditField label="Tour (opcional)" value={tour} onChange={setTour} />
      <EditField label="Cidade" value={city} onChange={setCity} required />
      <EditField label="Data" value={date} onChange={setDate} type="date" required />
      <EditField label="Local" value={venue} onChange={setVenue} />
      <div className="sm:col-span-2 lg:col-span-5">
        {error ? <p className="mb-2 font-mono text-xs text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="bg-[#9184d9] text-white px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] disabled:opacity-50 active:scale-[0.97] transition-all duration-120 touch-manipulation"
          >
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg active:scale-[0.97] transition-all duration-120 touch-manipulation"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label-mono">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
      />
    </label>
  );
}
