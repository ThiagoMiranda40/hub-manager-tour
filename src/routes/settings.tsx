import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCatalog, catalogQueryKey } from "@/hooks/useCatalog";
import { AppShell } from "@/components/AppShell";
import { ConfirmButton } from "@/components/ConfirmButton";
import { cn } from "@/lib/utils";

import {
  ArrowUp,
  ArrowDown,
  Edit2,
  Plus,
  Layers,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Moon,
  Sun,
  PanelTop,
  PanelLeft,
  Upload,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNavigationMode } from "@/hooks/useNavigationMode";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { extractRiderFromPDF } from "@/lib/ai-extraction.functions";
import {
  resizeFileForAI,
  mapAiCategoryToSystemCategory,
  type ExtractedRiderItem,
} from "@/lib/ai-extraction";
import {
  RIDER_CATEGORIES,
  reorderRiderItems,
  type CastRole,
  type DocumentType,
  type ArtistRiderTemplateItem,
  type RiderCategory,
} from "@/lib/g3";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Gerencie as funções do elenco, os tipos de documento e os catálogos de rider técnico padrão por artista.",
      },
      { property: "og:title", content: "Configurações — Hub Manager Tour" },
      {
        property: "og:description",
        content:
          "Funções do elenco, tipos de documento e rider padrão configuráveis do Hub Manager Tour.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const qc = useQueryClient();
  const { roles, docTypes } = useCatalog(!!session);
  const { setTheme, isDark } = useTheme();
  const { setMode: setNavMode, isHeader: isNavHeader, isSidebar: isNavSidebar } = useNavigationMode();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const { data: usage } = useQuery({
    queryKey: ["catalog-usage"],
    enabled: !!session,
    queryFn: async () => {
      const [{ data: cast }, { data: docs }] = await Promise.all([
        supabase.from("cast_members").select("role"),
        supabase.from("documents").select("doc_type"),
      ]);
      return {
        roles: (cast ?? []).map((c) => c.role),
        docTypes: (docs ?? []).map((d) => d.doc_type),
      };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: catalogQueryKey });
    qc.invalidateQueries({ queryKey: ["catalog-usage"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await fn();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function withUserId<T extends Record<string, unknown>>(values: T) {
    const { data } = await supabase.auth.getUser();
    return { ...values, user_id: data.user?.id as string };
  }

  if (loading || !session) return null;

  const roleUsed = (id: string) => (usage?.roles ?? []).filter((r) => r === id).length;
  const typeUsed = (id: string) => (usage?.docTypes ?? []).filter((t) => t === id).length;

  return (
    <AppShell email={session.user.email}>
      <p className="label-mono">(e) Configurações</p>
      <h1 className="mt-3 text-4xl leading-none sm:text-5xl">Configurações do sistema</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Personalize a aparência do sistema, as funções do elenco e os tipos de documento. Tipos
        marcados como obrigatórios contam como pendência de cada pessoa.
      </p>

      {/* Seção de Aparência e Tema do Sistema */}
      <div className="mt-8 border border-line bg-card p-5 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="label-mono">Aparência da Plataforma</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha entre o tema claro e o tema escuro (Nocturne). A preferência é salva e aplicada imediatamente em todo o sistema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-nocturne cursor-pointer touch-feedback",
                !isDark
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-line bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-nocturne cursor-pointer touch-feedback",
                isDark
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-line bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              Escuro
            </button>
          </div>
        </div>
      </div>

      {/* Seção de Estilo de Navegação (RF-13) */}
      <div className="mt-4 hidden sm:block border border-line bg-card p-5 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="label-mono">Navegação da Plataforma</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha entre o cabeçalho superior tradicional e a barra lateral (sidebar) recolhível em telas desktop e tablet (acima de 640px). Em telas móveis, o menu hambúrguer é utilizado automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNavMode("header")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-nocturne cursor-pointer touch-feedback",
                isNavHeader
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-line bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <PanelTop className="h-3.5 w-3.5" />
              Cabeçalho
            </button>
            <button
              type="button"
              onClick={() => setNavMode("sidebar")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-nocturne cursor-pointer touch-feedback",
                isNavSidebar
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-line bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <PanelLeft className="h-3.5 w-3.5" />
              Barra Lateral
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 border border-destructive px-3 py-2 font-mono text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="label-mono mb-4">Funções do elenco</div>
          <div className="border border-line">
            {roles.length === 0 ? (
              <p className="px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Nenhuma função cadastrada
              </p>
            ) : null}
            {roles.map((role) => (
              <RoleRow
                key={role.id}
                role={role}
                used={roleUsed(role.id)}
                onRename={(name) =>
                  save.mutate(() =>
                    supabase.from("cast_roles").update({ name }).eq("id", role.id),
                  )
                }
                onDelete={() =>
                  save.mutate(() =>
                    supabase.from("cast_roles").delete().eq("id", role.id),
                  )
                }
              />
            ))}
            <CreateRow
              placeholder="Nova função"
              onCreate={async (name) => {
                const values = await withUserId({ name, position: roles.length });
                save.mutate(() => supabase.from("cast_roles").insert(values));
              }}
            />
          </div>
        </div>

        <div>
          <div className="label-mono mb-4">Tipos de documento</div>
          <div className="border border-line">
            {docTypes.length === 0 ? (
              <p className="px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Nenhum tipo cadastrado
              </p>
            ) : null}
            {docTypes.map((type) => (
              <TypeRow
                key={type.id}
                type={type}
                used={typeUsed(type.id)}
                onUpdate={(values) =>
                  save.mutate(() =>
                    supabase.from("document_types").update(values).eq("id", type.id),
                  )
                }
                onDelete={() =>
                  save.mutate(() =>
                    supabase.from("document_types").delete().eq("id", type.id),
                  )
                }
              />
            ))}
            <CreateRow
              placeholder="Novo tipo de documento"
              onCreate={async (name) => {
                const values = await withUserId({
                  name,
                  position: docTypes.length,
                  reimbursable: false,
                  required: true,
                });
                save.mutate(() => supabase.from("document_types").insert(values));
              }}
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: RIDER PADRÃO POR ARTISTA (T-09) */}
      <section className="mt-16 pt-10 border-t border-line">
        <RiderCatalogSection session={session} onError={(msg) => setError(msg)} />
      </section>
    </AppShell>
  );
}

function RoleRow({
  role,
  used,
  onRename,
  onDelete,
}: {
  role: CastRole;
  used: number;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(role.name);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== role.name && onRename(name.trim())}
        className="min-w-32 flex-1 border border-line bg-background px-3 py-2 text-sm outline-none focus:border-signal"
      />
      <DeleteButton
        used={used}
        blockedMessage={`${used} pessoa(s) usam esta função`}
        onDelete={onDelete}
      />
    </div>
  );
}

function TypeRow({
  type,
  used,
  onUpdate,
  onDelete,
}: {
  type: DocumentType;
  used: number;
  onUpdate: (values: Partial<DocumentType>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(type.name);

  return (
    <div className="border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== type.name && onUpdate({ name: name.trim() })}
          className="min-w-32 flex-1 border border-line bg-background px-3 py-2 text-sm outline-none focus:border-signal"
        />
        <DeleteButton
          used={used}
          blockedMessage={`${used} documento(s) usam este tipo`}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-4">
        <Toggle
          label="Reembolsável?"
          checked={type.reimbursable}
          onChange={(v) => onUpdate({ reimbursable: v })}
        />
        <Toggle
          label="Obrigatório para todo o elenco?"
          checked={type.required}
          onChange={(v) => onUpdate({ required: v })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none active:opacity-75 transition-opacity duration-120 touch-manipulation">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-[var(--signal)]"
      />
      <span className="label-mono">{label}</span>
    </label>
  );
}

function DeleteButton({
  used,
  blockedMessage,
  onDelete,
}: {
  used: number;
  blockedMessage: string;
  onDelete: () => void;
}) {
  const [warn, setWarn] = useState(false);

  if (used > 0) {
    return (
      <div className="text-right">
        <button
          type="button"
          onClick={() => setWarn(true)}
          className="border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground active:scale-[0.97] transition-all duration-120 touch-manipulation"
        >
          Excluir
        </button>
        {warn ? (
          <p className="mt-1 font-mono text-[10px] text-destructive">
            Não é possível excluir: {blockedMessage}.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-right">
      <ConfirmButton
        onConfirm={onDelete}
        className="border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:border-destructive hover:text-destructive"
        confirmClassName="border border-destructive bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive"
      />
    </div>
  );
}


function CreateRow({
  placeholder,
  onCreate,
}: {
  placeholder: string;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim());
        setName("");
      }}
      className="flex flex-wrap items-center gap-3 border-t border-line bg-accent/30 px-4 py-3"
    >
      <input
        value={name}
        placeholder={placeholder}
        onChange={(e) => setName(e.target.value)}
        className="min-w-32 flex-1 border border-line bg-background px-3 py-2 text-sm outline-none focus:border-signal"
      />
      <button
        type="submit"
        className="bg-foreground px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-background active:scale-[0.97] active:opacity-90 transition-all duration-120 touch-manipulation"
      >
        Adicionar
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES: CATÁLOGO DE RIDER PADRÃO POR ARTISTA (T-09 / RF-06)
// ─────────────────────────────────────────────────────────────────────────────

function RiderCatalogSection({
  session,
  onError,
}: {
  session: { user: { id: string; email?: string } };
  onError: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form states para novo item
  const [newItemName, setNewItemName] = useState("");
  const [newCategory, setNewCategory] = useState<RiderCategory>("backline");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newIsMandatory, setNewIsMandatory] = useState(true);
  const [newSpec, setNewSpec] = useState("");

  // States para Importação de Rider PDF via IA (RF-10 / Função 2)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExtractingRider, setIsExtractingRider] = useState(false);
  const [extractedRiderItems, setExtractedRiderItems] = useState<ExtractedRiderItem[] | null>(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());
  const [riderFile, setRiderFile] = useState<File | null>(null);
  const [riderFileError, setRiderFileError] = useState<string | null>(null);
  const [isSavingImportedItems, setIsSavingImportedItems] = useState(false);

  const extractRiderFn = useServerFn(extractRiderFromPDF);

  async function handleExtractRider(file: File) {
    if (!selectedArtistId) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setRiderFileError("Por favor, selecione um arquivo em formato PDF.");
      return;
    }
    setRiderFile(file);
    setRiderFileError(null);
    setIsExtractingRider(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Sessão não identificada. Por favor, faça login novamente.");
      }

      const { base64, mimeType } = await resizeFileForAI(file);
      const res = await extractRiderFn({
        data: {
          artistId: selectedArtistId,
          fileBase64: base64,
          mimeType,
          authToken: token,
        },
      });

      if (!res.success || !res.items) {
        throw new Error(res.error || "Falha ao extrair itens do PDF.");
      }

      setExtractedRiderItems(res.items);
      setSelectedItemIndices(new Set(res.items.map((_: ExtractedRiderItem, idx: number) => idx)));
      toast.success(`${res.items.length} itens identificados no rider técnico!`);
    } catch (err: any) {
      setRiderFileError(err.message || "Erro ao processar PDF do rider.");
      toast.error(err.message || "Erro ao processar PDF do rider.");
    } finally {
      setIsExtractingRider(false);
    }
  }

  async function handleSaveExtractedItems() {
    if (!selectedArtistId || !extractedRiderItems) return;
    const selected = extractedRiderItems.filter((_, idx) => selectedItemIndices.has(idx));
    if (selected.length === 0) {
      toast.error("Selecione ao menos um item para importar.");
      return;
    }

    setIsSavingImportedItems(true);
    try {
      const currentItemCount = items.length;
      const recordsToInsert = selected.map((item, index) => ({
        user_id: session.user.id,
        artist_id: selectedArtistId,
        category: mapAiCategoryToSystemCategory(item.category),
        item_name: item.itemName,
        specification: item.specification,
        quantity: item.quantity,
        is_mandatory: item.isMandatory,
        position: currentItemCount + index,
      }));

      const { error } = await supabase
        .from("artist_rider_template_items")
        .insert(recordsToInsert);

      if (error) throw error;

      toast.success(`${selected.length} itens adicionados ao rider padrão com sucesso!`);
      setIsImportModalOpen(false);
      setExtractedRiderItems(null);
      setRiderFile(null);
      refreshRider();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar itens importados.");
    } finally {
      setIsSavingImportedItems(false);
    }
  }

  // Query dos artistas cadastrados
  const { data: artists = [], isLoading: loadingArtists } = useQuery({
    queryKey: ["settings-artists"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Seleciona o primeiro artista automaticamente
  useEffect(() => {
    if (!selectedArtistId && artists.length > 0 && artists[0]?.id) {
      setSelectedArtistId(artists[0].id);
    }
  }, [artists, selectedArtistId]);

  // Query dos itens de rider do artista selecionado
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["settings-rider-templates", selectedArtistId],
    enabled: !!selectedArtistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_rider_template_items")
        .select("*")
        .eq("artist_id", selectedArtistId!)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ArtistRiderTemplateItem[];
    },
  });

  // Recarrega dados de rider
  const refreshRider = () => {
    qc.invalidateQueries({ queryKey: ["settings-rider-templates", selectedArtistId] });
    qc.invalidateQueries({ queryKey: ["artist-rider-templates", selectedArtistId] });
  };

  // Mutação: Criar novo item de rider
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedArtistId) throw new Error("Selecione um artista.");
      if (!newItemName.trim()) throw new Error("Informe o nome do item de rider.");
      const { error } = await supabase.from("artist_rider_template_items").insert({
        user_id: session.user.id,
        artist_id: selectedArtistId,
        category: newCategory,
        item_name: newItemName.trim(),
        specification: newSpec.trim() || null,
        quantity: Math.max(1, Number(newQuantity) || 1),
        is_mandatory: newIsMandatory,
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewItemName("");
      setNewSpec("");
      setNewQuantity(1);
      setNewIsMandatory(true);
      setIsAdding(false);
      refreshRider();
    },
    onError: (e: Error) => onError(e.message),
  });

  // Mutação: Atualizar item existente
  const updateMutation = useMutation({
    mutationFn: async (updated: {
      id: string;
      item_name: string;
      category: string;
      quantity: number;
      is_mandatory: boolean;
      specification: string | null;
    }) => {
      const { id, ...payload } = updated;
      const { error } = await supabase
        .from("artist_rider_template_items")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingItemId(null);
      refreshRider();
    },
    onError: (e: Error) => onError(e.message),
  });

  // Mutação: Excluir item de rider
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("artist_rider_template_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshRider();
    },
    onError: (e: Error) => onError(e.message),
  });

  // Reordenação sequencial de itens (↑ e ↓)
  const handleMove = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentItem = items[currentIndex];
    const targetItem = items[targetIndex];
    if (!currentItem || !targetItem) return;

    setIsReordering(true);

    try {
      await Promise.all([
        supabase
          .from("artist_rider_template_items")
          .update({ position: targetIndex })
          .eq("id", currentItem.id),
        supabase
          .from("artist_rider_template_items")
          .update({ position: currentIndex })
          .eq("id", targetItem.id),
      ]);
      refreshRider();
    } catch (e: any) {
      onError(e.message || "Erro ao reordenar item de rider.");
    } finally {
      setIsReordering(false);
    }
  };

  const selectedArtist = artists.find((a) => a.id === selectedArtistId);

  // Contagem por categoria
  const categoryCounts = RIDER_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.id] = items.filter((i) => i.category === cat.id).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Itens filtrados para exibição
  const visibleItems = categoryFilter === "all"
    ? items
    : items.filter((i) => i.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">(r) Rider Técnico Oficial</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold leading-tight">
            Catálogo de Rider Padrão por Artista
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cadastre as necessidades oficiais de som, luz, palco e camarim de cada artista.
            Ao cadastrar novos shows, este rider é clonado automaticamente para a data sem
            afetar shows já confirmados anteriormente.
          </p>
        </div>

        {selectedArtistId ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(true);
                setExtractedRiderItems(null);
                setRiderFile(null);
                setRiderFileError(null);
              }}
              className="inline-flex items-center gap-2 border border-[#9184d9]/40 bg-[#9184d9]/10 text-[#9184d9] px-4 py-2.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#9184d9]/20 active:scale-[0.97] transition-all duration-120 shadow-sm cursor-pointer"
            >
              <Sparkles className="size-4" /> Importar Rider (PDF)
            </button>
            <button
              type="button"
              onClick={() => setIsAdding((v) => !v)}
              className="inline-flex items-center gap-2 bg-[#9184d9] text-white px-4 py-2.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#8072c9] active:scale-[0.97] transition-all duration-120 shadow-sm cursor-pointer"
            >
              {isAdding ? (
                <>
                  <X className="size-4" /> Cancelar
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Novo Item de Rider
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* Seletor de Artista */}
      {loadingArtists ? (
        <div className="py-4 text-xs font-mono text-muted-foreground">Carregando artistas...</div>
      ) : artists.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center bg-card">
          <Layers className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Nenhum artista cadastrado
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Cadastre um artista na agenda para definir suas especificações oficiais de rider técnico.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-xs mr-2">Artista Selecionado:</span>
            {artists.map((artist) => {
              const isSelected = artist.id === selectedArtistId;
              return (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => {
                    setSelectedArtistId(artist.id);
                    setEditingItemId(null);
                    setIsAdding(false);
                  }}
                  className={cn(
                    "px-4 py-2 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-150 active:scale-[0.97] touch-manipulation border",
                    isSelected
                      ? "bg-[#9184d9] text-white border-[#9184d9] shadow-sm font-semibold"
                      : "border-line bg-card hover:bg-accent/40 text-foreground",
                  )}
                >
                  {artist.name}
                </button>
              );
            })}
          </div>

          {/* Card de Criação de Novo Item */}
          {isAdding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="p-5 border border-[#9184d9]/40 bg-[#9184d9]/5 rounded-2xl space-y-4 animate-in fade-in-50 duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[#9184d9]">
                  Adicionar Item de Rider · {selectedArtist?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Categoria *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as RiderCategory)}
                    className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                  >
                    {RIDER_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Nome do Item *
                  </label>
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ex.: Bateria Yamaha Stage Custom ou SM58"
                    required
                    className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Qtd. *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value) || 1))}
                    required
                    className="w-full border border-line bg-background px-3 py-2 text-sm font-mono outline-none focus:border-[#9184d9] rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end pb-2">
                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newIsMandatory}
                        onChange={(e) => setNewIsMandatory(e.target.checked)}
                        className="size-4 accent-[#9184d9] rounded"
                      />
                      <span className="text-xs font-mono">Inegociável</span>
                    </label>
                    <span
                      className="inline-flex text-muted-foreground/70 hover:text-muted-foreground cursor-help transition-colors"
                      title="Item inegociável: a casa de show precisa fornecer, sem alternativa aceitável. Desligado, o item é desejável — pode ser negociado ou substituído sem inviabilizar o show."
                      aria-label="Item inegociável: a casa de show precisa fornecer, sem alternativa aceitável. Desligado, o item é desejável — pode ser negociado ou substituído sem inviabilizar o show."
                    >
                      <HelpCircle className="size-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Especificação Técnica Detalhada (opcional)
                </label>
                <input
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                  placeholder="Ex.: Bumbo 22', tons 10' e 12', surdo 16', 3 estantes de prato girafa reforçadas"
                  className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newItemName.trim()}
                  className="bg-[#9184d9] text-white px-5 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  {createMutation.isPending ? "Adicionando..." : "Salvar no Rider Padrão"}
                </button>
              </div>
            </form>
          ) : null}

          {/* Filtros de Categoria */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-3 py-1 font-mono text-[11px] uppercase tracking-wider rounded-lg transition-colors border",
                categoryFilter === "all"
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "border-line bg-background hover:bg-accent text-muted-foreground",
              )}
            >
              Todos ({items.length})
            </button>

            {RIDER_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] ?? 0;
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    "px-3 py-1 font-mono text-[11px] uppercase tracking-wider rounded-lg transition-colors border",
                    isActive
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "border-line bg-background hover:bg-accent text-muted-foreground",
                  )}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista de Itens do Rider */}
          <div className="border border-line rounded-xl overflow-hidden bg-card">
            {loadingItems ? (
              <div className="p-8 text-center font-mono text-xs text-muted-foreground">
                Carregando itens de rider...
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <Sparkles className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Nenhum item de rider cadastrado para {selectedArtist?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Clique no botão acima para adicionar equipamentos de som, iluminação, backline ou
                  camarim.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-[#9184d9] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9]"
                >
                  <Plus className="size-4" /> Adicionar Primeiro Item
                </button>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-muted-foreground">
                Nenhum item nesta categoria.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleItems.map((item) => {
                  const fullIndex = items.findIndex((i) => i.id === item.id);
                  const isEditing = editingItemId === item.id;

                  if (isEditing) {
                    return (
                      <div key={item.id} className="p-4 bg-accent/10">
                        <EditRiderItemForm
                          item={item}
                          onSave={(data) => updateMutation.mutate(data)}
                          onCancel={() => setEditingItemId(null)}
                          isPending={updateMutation.isPending}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent/10 transition-colors"
                    >
                      {/* Lado Esquerdo: Posição, Categoria, Nome e Especificação */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Controles de Reordenação */}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleMove(fullIndex, "up")}
                            disabled={fullIndex === 0 || isReordering}
                            title="Mover para cima"
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(fullIndex, "down")}
                            disabled={fullIndex === items.length - 1 || isReordering}
                            title="Mover para baixo"
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-line bg-accent/30 rounded font-medium">
                              {RIDER_CATEGORIES.find((c) => c.id === item.category)?.label ??
                                item.category}
                            </span>
                            <span className="font-medium text-sm text-foreground">
                              {item.item_name}
                            </span>
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              x{item.quantity}
                            </span>

                            {item.is_mandatory ? (
                              <span className="text-[10px] font-mono border border-destructive/30 text-destructive bg-destructive/5 px-2 py-0.5 rounded font-medium">
                                Inegociável
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono border border-line text-muted-foreground px-2 py-0.5 rounded">
                                Desejável
                              </span>
                            )}
                          </div>

                          {item.specification ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.specification}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Lado Direito: Ações de Edição e Exclusão */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(item.id)}
                          className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg flex items-center gap-1 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all"
                        >
                          <Edit2 className="size-3.5" /> Editar
                        </button>

                        <ConfirmButton
                          onConfirm={() => deleteMutation.mutate(item.id)}
                          className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:border-destructive hover:text-destructive rounded-lg"
                          confirmClassName="border border-destructive bg-destructive/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-destructive rounded-lg"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Importação de Rider PDF via IA (RF-10 / Função 2) */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-[#9184d9]">
              <Sparkles className="size-5" />
              <DialogTitle className="text-lg font-semibold">
                Importar Rider Técnico (PDF) · {selectedArtist?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione o arquivo PDF do rider técnico do artista. A inteligência artificial identificará os equipamentos e necessidades nas categorias oficiais para você revisar antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Dropzone / Seletor de Arquivo */}
            {!extractedRiderItems && (
              <div className="border-2 border-dashed border-line hover:border-[#9184d9]/60 rounded-xl p-8 text-center bg-card/50 transition-colors">
                <input
                  type="file"
                  id="rider-pdf-input"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleExtractRider(file);
                  }}
                  disabled={isExtractingRider}
                />
                <label
                  htmlFor="rider-pdf-input"
                  className={cn(
                    "cursor-pointer flex flex-col items-center gap-3",
                    isExtractingRider && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="size-12 rounded-full bg-[#9184d9]/10 text-[#9184d9] flex items-center justify-center">
                    {isExtractingRider ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <Upload className="size-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider font-semibold text-foreground">
                      {isExtractingRider
                        ? "Analisando rider técnico com IA..."
                        : riderFile
                        ? riderFile.name
                        : "Clique para selecionar o PDF do rider"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Suporta documentos técnicos e riders em formato PDF (máx. 20 MB)
                    </p>
                  </div>
                </label>

                {riderFileError && (
                  <p className="mt-3 text-xs text-destructive font-mono bg-destructive/10 py-1.5 px-3 rounded-lg">
                    {riderFileError}
                  </p>
                )}
              </div>
            )}

            {/* Lista de Itens Extraídos para Revisão */}
            {extractedRiderItems && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-line">
                  <div className="text-xs font-mono">
                    <span className="text-foreground font-semibold">{selectedItemIndices.size}</span> de{" "}
                    <span className="text-muted-foreground">{extractedRiderItems.length} itens selecionados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedItemIndices(new Set(extractedRiderItems.map((_, i) => i)))}
                      className="text-[11px] font-mono text-[#9184d9] hover:underline cursor-pointer"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemIndices(new Set())}
                      className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Desmarcar todos
                    </button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setExtractedRiderItems(null);
                        setRiderFile(null);
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      Trocar PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {extractedRiderItems.map((item, idx) => {
                    const isSelected = selectedItemIndices.has(idx);
                    const mappedCat = mapAiCategoryToSystemCategory(item.category);
                    const catLabel = RIDER_CATEGORIES.find((c) => c.id === mappedCat)?.label ?? mappedCat;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const next = new Set(selectedItemIndices);
                          if (isSelected) next.delete(idx);
                          else next.add(idx);
                          setSelectedItemIndices(next);
                        }}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                          isSelected
                            ? "border-[#9184d9]/50 bg-[#9184d9]/5"
                            : "border-line bg-card/40 opacity-60 hover:opacity-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 size-4 rounded accent-[#9184d9] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {item.itemName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#9184d9]/30 bg-[#9184d9]/10 text-[#9184d9] font-medium">
                              {catLabel}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Qtd: {item.quantity}
                            </span>
                            {item.isMandatory ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                Obrigatório
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                Opcional
                              </span>
                            )}
                          </div>
                          {item.specification && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.specification}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {extractedRiderItems && (
              <button
                type="button"
                disabled={selectedItemIndices.size === 0 || isSavingImportedItems}
                onClick={() => void handleSaveExtractedItems()}
                className="inline-flex items-center gap-2 bg-[#9184d9] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#8072c9] disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {isSavingImportedItems ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Adicionar {selectedItemIndices.size} Itens ao Rider
                  </>
                )}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditRiderItemForm({
  item,
  onSave,
  onCancel,
  isPending,
}: {
  item: ArtistRiderTemplateItem;
  onSave: (data: {
    id: string;
    item_name: string;
    category: string;
    quantity: number;
    is_mandatory: boolean;
    specification: string | null;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(item.item_name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(item.quantity);
  const [isMandatory, setIsMandatory] = useState(item.is_mandatory);
  const [spec, setSpec] = useState(item.specification ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          id: item.id,
          item_name: name.trim(),
          category,
          quantity: Math.max(1, Number(quantity) || 1),
          is_mandatory: isMandatory,
          specification: spec.trim() || null,
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-mono text-muted-foreground mb-1">
            Categoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
          >
            {RIDER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-5">
          <label className="block text-[11px] font-mono text-muted-foreground mb-1">
            Nome do Item *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do item"
            required
            className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-mono text-muted-foreground mb-1">
            Qtd. *
          </label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            required
            className="w-full border border-line bg-background px-3 py-2 text-sm font-mono outline-none focus:border-[#9184d9] rounded-lg"
          />
        </div>

        <div className="sm:col-span-2 flex items-end pb-2">
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="size-4 accent-[#9184d9] rounded"
              />
              <span className="text-xs font-mono">Inegociável</span>
            </label>
            <span
              className="inline-flex text-muted-foreground/70 hover:text-muted-foreground cursor-help transition-colors"
              title="Item inegociável: a casa de show precisa fornecer, sem alternativa aceitável. Desligado, o item é desejável — pode ser negociado ou substituído sem inviabilizar o show."
              aria-label="Item inegociável: a casa de show precisa fornecer, sem alternativa aceitável. Desligado, o item é desejável — pode ser negociado ou substituído sem inviabilizar o show."
            >
              <HelpCircle className="size-3.5" />
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono text-muted-foreground mb-1">
          Especificação Técnica Detalhada (opcional)
        </label>
        <input
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder="Ex.: Modelo, potência, voltagem ou detalhe específico"
          className="w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:bg-accent rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="bg-[#9184d9] text-white px-4 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all disabled:opacity-40"
        >
          {isPending ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
}
