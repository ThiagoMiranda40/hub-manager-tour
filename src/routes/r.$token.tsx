import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Layers,
  HelpCircle,
  Loader2,
  Check,
  RotateCcw,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicRider, updatePublicRiderItem } from "@/lib/public-show.functions";
import {
  RIDER_CATEGORIES,
  computeRiderBalance,
  sortRiderItemsByPriority,
  formatDateBR,
  type ShowRiderItem,
  type RiderCategory,
} from "@/lib/g3";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Confirmação de Rider Técnico — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Página de confirmação de rider técnico e equipamentos para casas de show e contratantes locais com auto-save em tempo real.",
      },
      { property: "og:title", content: "Confirmação de Rider Técnico — Hub Manager Tour" },
      {
        property: "og:description",
        content: "Confirme os itens de palco, som, iluminação e camarim do show em tempo real.",
      },
      {
        property: "og:image",
        content: "https://hubmanagertour.triadetecnologiaesolucoes.com.br/og-image-v2.png",
      },
      {
        property: "og:image:secure_url",
        content: "https://hubmanagertour.triadetecnologiaesolucoes.com.br/og-image-v2.png",
      },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Hub Manager Tour — Confirmação de Rider Técnico" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://hubmanagertour.triadetecnologiaesolucoes.com.br/og-image-v2.png",
      },
    ],
  }),
  component: PublicRiderPage,
});

function PublicRiderPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const fetchRider = useServerFn(getPublicRider);
  const mutateRiderItem = useServerFn(updatePublicRiderItem);

  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [activeExceptionItemId, setActiveExceptionItemId] = useState<string | null>(null);
  const [exceptionNotes, setExceptionNotes] = useState<Record<string, string>>({});
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // 1. Carregamento dos dados públicos do rider
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-rider", token],
    queryFn: () => fetchRider({ data: { token } }),
  });

  const show = data?.show;
  const items = useMemo(() => (data?.items ?? []) as ShowRiderItem[], [data?.items]);

  // Sincroniza notas de exceção recebidas do servidor no estado local
  useEffect(() => {
    if (items.length > 0) {
      const initialNotes: Record<string, string> = {};
      for (const item of items) {
        if (item.exception_note) {
          initialNotes[item.id] = item.exception_note;
        }
      }
      setExceptionNotes(initialNotes);
    }
  }, [items]);

  // Define dinamicamente o título do documento para impressão / salvar PDF
  useEffect(() => {
    if (!show) return;
    const artistName = show.artist || "Sem Artista";
    const formattedDate = show.show_date ? formatDateBR(show.show_date) : "";
    const originalTitle = document.title;
    document.title = `Rider Técnico — ${artistName} — ${formattedDate}`;
    return () => {
      document.title = originalTitle;
    };
  }, [show]);

  // 2. Mutação com auto-save e reversibilidade imediata
  const updateMutation = useMutation({
    mutationFn: async (params: {
      itemId: string;
      status: "confirmed" | "exception" | "pending";
      exceptionNote?: string | null;
    }) => {
      return mutateRiderItem({
        data: {
          token,
          itemId: params.itemId,
          status: params.status,
          exceptionNote: params.exceptionNote,
        },
      });
    },
    onMutate: async (newStatus) => {
      await qc.cancelQueries({ queryKey: ["public-rider", token] });
      const previousData = qc.getQueryData<{ show: any; items: ShowRiderItem[] }>([
        "public-rider",
        token,
      ]);

      if (previousData) {
        qc.setQueryData(["public-rider", token], {
          ...previousData,
          items: previousData.items.map((item) => {
            if (item.id === newStatus.itemId) {
              return {
                ...item,
                status: newStatus.status,
                exception_note:
                  newStatus.status === "exception"
                    ? newStatus.exceptionNote ?? item.exception_note
                    : null,
                confirmed_by_venue_at: new Date().toISOString(),
              };
            }
            return item;
          }),
        });
      }

      return { previousData };
    },
    onSuccess: (result) => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setLastSavedTime(`${hours}:${minutes}`);
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        qc.setQueryData(["public-rider", token], context.previousData);
      }
      toast.error(err.message || "Erro ao salvar alteração. Tente novamente.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["public-rider", token] });
    },
  });

  // Ações de confirmação e reversibilidade
  const handleConfirm = (item: ShowRiderItem) => {
    setActiveExceptionItemId(null);
    updateMutation.mutate({
      itemId: item.id,
      status: "confirmed",
      exceptionNote: null,
    });
  };

  const handleOpenException = (item: ShowRiderItem) => {
    setActiveExceptionItemId(item.id);
  };

  const handleSaveException = (item: ShowRiderItem) => {
    const note = exceptionNotes[item.id] || "";
    if (!note.trim()) {
      toast.error("Por favor, descreva a alternativa ou motivo da exceção.");
      return;
    }
    setActiveExceptionItemId(null);
    updateMutation.mutate({
      itemId: item.id,
      status: "exception",
      exceptionNote: note.trim(),
    });
  };

  const handleRevertToPending = (item: ShowRiderItem) => {
    setActiveExceptionItemId(null);
    updateMutation.mutate({
      itemId: item.id,
      status: "pending",
      exceptionNote: null,
    });
  };

  // RF-11: Cálculo de balanço segregado
  const balance = useMemo(() => computeRiderBalance(items), [items]);

  // RF-11: Ordenação por prioridade (inegociáveis pendentes primeiro)
  const sortedItems = useMemo(() => sortRiderItemsByPriority(items), [items]);

  // Filtro por categoria
  const filteredItems = useMemo(() => {
    if (selectedCategory === "todas") return sortedItems;
    return sortedItems.filter((i) => i.category === selectedCategory);
  }, [sortedItems, selectedCategory]);

  // Estados de carregamento e link inválido
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-3/4 rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  if (error || !show) {
    return (
      <main className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full border border-destructive/30 bg-destructive/5 p-6 rounded-2xl text-center space-y-4">
          <AlertTriangle className="size-12 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Link de Rider Inválido ou Expirado</h1>
          <p className="text-sm text-muted-foreground">
            Não encontramos um rider técnico correspondente a este link. Verifique se o endereço foi
            digitado corretamente ou solicite um novo link à produção do artista.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#9184d9]/30">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Cabeçalho do Rider Público (Fixo / Print Otimizado) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="border-b border-line bg-card/60 backdrop-blur-md sticky top-0 z-20 print:static print:bg-transparent print:border-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <img
                src="/branding/logo-completo-fundo-claro.png"
                alt="Hub Manager Tour"
                className="h-9 sm:h-11 w-auto object-contain dark:hidden"
              />
              <img
                src="/branding/logo-card-fundo-escuro.png"
                alt="Hub Manager Tour"
                className="h-9 sm:h-11 w-auto object-contain hidden dark:block"
              />
            </div>
            <div className="h-7 w-px bg-line hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#9184d9] font-semibold">
                  Rider Técnico
                </span>
                <span className="text-[10px] text-muted-foreground print:hidden">·</span>
                <span className="text-[10px] text-muted-foreground print:hidden">Acesso Convidado</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                {show.artist || "Artista não especificado"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {show.city} {show.venue ? `· ${show.venue}` : ""} ·{" "}
                <span className="font-mono font-medium text-foreground">
                  {formatDateBR(show.show_date)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 print:hidden">
            {/* Indicador de Auto-Save em Tempo Real */}
            <div className="text-right">
              {updateMutation.isPending ? (
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#9184d9]">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Salvando...</span>
                </div>
              ) : lastSavedTime ? (
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-500">
                  <CheckCircle2 className="size-3.5" />
                  <span>Salvo em tempo real ({lastSavedTime})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  <span>Sincronizado</span>
                </div>
              )}
            </div>

            {/* Alternador de tema claro/escuro */}
            <ThemeToggle />

            {/* Botão de Impressão da Cópia de Atendimento */}
            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimir ou salvar PDF da cópia de atendimento"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wider border border-line bg-secondary/80 hover:bg-secondary text-foreground rounded-lg transition-all active:scale-[0.97]"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Imprimir Cópia</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RF-11: Indicadores Segregados (Inegociáveis vs Desejáveis) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
          {/* Card 1: Itens Inegociáveis */}
          <div
            className={cn(
              "p-4 rounded-xl border transition-colors",
              balance.hasMandatoryPendingOrException
                ? "border-destructive/40 bg-destructive/5"
                : "border-emerald-500/30 bg-emerald-500/5",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                  Itens Inegociáveis
                </span>
                <span
                  className="text-muted-foreground/70 hover:text-muted-foreground cursor-help transition-colors"
                  title="Item inegociável: a casa de show precisa fornecer, sem alternativa aceitável. Desligado, o item é desejável — pode ser negociado ou substituído sem inviabilizar o show."
                >
                  <HelpCircle className="size-3.5" />
                </span>
              </div>
              <span
                className={cn(
                  "font-mono text-xs font-bold px-2 py-0.5 rounded",
                  balance.mandatory.isComplete
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-destructive/20 text-destructive border border-destructive/30",
                )}
              >
                {balance.mandatory.confirmed} / {balance.mandatory.total} confirmados
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {balance.mandatory.total === 0
                ? "Nenhum item classificado como inegociável neste rider."
                : balance.mandatory.isComplete
                  ? "✓ Todos os itens inegociáveis foram confirmados pela casa."
                  : `Atenção: ${balance.mandatory.pending} pendente(s) e ${balance.mandatory.exceptions} em exceção. Fornecimento estritamente obrigatório.`}
            </p>
          </div>

          {/* Card 2: Itens Desejáveis */}
          <div className="p-4 rounded-xl border border-line bg-card/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                Itens Desejáveis
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-accent/60 text-muted-foreground border border-line">
                {balance.desirable.confirmed} / {balance.desirable.total} confirmados
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {balance.desirable.total === 0
                ? "Nenhum item classificado como desejável."
                : balance.desirable.pending === 0
                  ? "✓ Todos os itens desejáveis foram respondidos."
                  : `${balance.desirable.pending} pendente(s). Podem ser negociados ou substituídos caso necessário.`}
            </p>
          </div>
        </section>

        {/* Alerta de Severidade Crítica para Inegociáveis em Exceção / Pendência (RF-11) */}
        {balance.hasMandatoryPendingOrException && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 flex items-start gap-3 print:border-line">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-0.5">
              <p className="font-semibold text-destructive">
                Prioridade Máxima: Itens Inegociáveis em Aberto
              </p>
              <p className="text-muted-foreground">
                A produção do artista identificou estes equipamentos como fundamentais para a
                realização do espetáculo. Por favor, confirme o atendimento destes itens com
                prioridade antes da montagem técnica.
              </p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Filtros por Categoria com affordance de rolagem */}
        <div className="relative print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("todas")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap active:scale-[0.97]",
                selectedCategory === "todas"
                  ? "bg-[#9184d9] text-white font-medium"
                  : "border border-line bg-secondary/40 text-muted-foreground hover:bg-secondary",
              )}
            >
              Todas ({items.length})
            </button>
            {RIDER_CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap active:scale-[0.97]",
                    selectedCategory === cat.id
                      ? "bg-[#9184d9] text-white font-medium"
                      : "border border-line bg-secondary/40 text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 flex items-center pr-0.5 sm:hidden">
            <div className="rounded-full bg-foreground/10 backdrop-blur-sm p-1 shadow-sm">
              <ChevronRight className="size-3 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Listagem de Itens com Interação e Reversibilidade */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="p-8 border border-dashed border-line rounded-xl text-center text-muted-foreground text-sm">
              Nenhum item de rider cadastrado para esta categoria.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isConfirmed = item.status === "confirmed";
              const isException = item.status === "exception";
              const isPending = item.status === "pending" || !item.status;
              const isEditingException = activeExceptionItemId === item.id;
              const isMandatory = Boolean(item.is_mandatory);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-180 bg-card/60",
                    // Severidade visual distinta conforme RF-11 (TC-11.2)
                    isException && isMandatory
                      ? "border-destructive/50 bg-destructive/5 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                      : isException
                        ? "border-amber-500/40 bg-amber-500/5"
                        : isConfirmed
                          ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                          : "border-line",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Detalhes do Item */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-line bg-accent/30 rounded font-medium">
                          {RIDER_CATEGORIES.find((c) => c.id === item.category)?.label ??
                            item.category}
                        </span>

                        <span className="font-semibold text-sm text-foreground">
                          {item.item_name}
                        </span>

                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          x{item.quantity}
                        </span>

                        {/* Badge de Inegociável / Desejável */}
                        {isMandatory ? (
                          <span className="text-[10px] font-mono border border-destructive/40 text-destructive bg-destructive/10 px-2 py-0.5 rounded font-semibold">
                            Inegociável
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono border border-line text-muted-foreground px-2 py-0.5 rounded">
                            Desejável
                          </span>
                        )}

                        {/* Status Atual do Item */}
                        {isConfirmed && (
                          <span className="text-[10px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Check className="size-3" /> Confirmado pela Casa
                          </span>
                        )}

                        {isException && (
                          <span
                            className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded font-medium flex items-center gap-1 border",
                              isMandatory
                                ? "border-destructive/50 text-destructive bg-destructive/20 font-bold"
                                : "border-amber-500/40 text-amber-400 bg-amber-500/10",
                            )}
                          >
                            <AlertTriangle className="size-3" /> Exceção / Alternativa
                          </span>
                        )}

                        {isPending && (
                          <span className="text-[10px] font-mono border border-line text-muted-foreground px-2 py-0.5 rounded">
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Especificação técnica detalhada */}
                      {item.specification ? (
                        <p className="text-xs text-muted-foreground font-sans">
                          {item.specification}
                        </p>
                      ) : null}

                      {/* Exibição da Nota de Exceção Salva */}
                      {isException && item.exception_note && !isEditingException && (
                        <div
                          className={cn(
                            "mt-2 p-2.5 rounded-lg text-xs font-sans border",
                            isMandatory
                              ? "bg-destructive/10 border-destructive/30 text-foreground"
                              : "bg-amber-500/10 border-amber-500/30 text-foreground",
                          )}
                        >
                          <span className="font-semibold block text-[11px] font-mono text-muted-foreground mb-0.5">
                            Nota de atendimento / alternativa oferecida:
                          </span>
                          {item.exception_note}
                        </div>
                      )}
                    </div>

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* Ações com Reversibilidade Imediata (print:hidden) */}
                    {/* ───────────────────────────────────────────────────────── */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 print:hidden">
                      {/* Botão Confirmar: atende ou reverte exceção para atendido */}
                      <button
                        type="button"
                        onClick={() => handleConfirm(item)}
                        disabled={updateMutation.isPending}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-[0.97]",
                          isConfirmed
                            ? "bg-emerald-600 text-white font-semibold shadow-sm"
                            : "border border-line bg-secondary/50 hover:bg-secondary text-foreground",
                        )}
                      >
                        <Check className="size-3.5" />
                        <span>{isConfirmed ? "Confirmado" : "Confirmar"}</span>
                      </button>

                      {/* Botão Sinalizar Exceção */}
                      <button
                        type="button"
                        onClick={() => handleOpenException(item)}
                        disabled={updateMutation.isPending}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-[0.97]",
                          isException
                            ? isMandatory
                              ? "bg-destructive text-white font-bold"
                              : "bg-amber-600 text-white font-semibold"
                            : "border border-line bg-secondary/50 hover:bg-secondary text-foreground",
                        )}
                      >
                        <AlertTriangle className="size-3.5" />
                        <span>{isException ? "Editar Exceção" : "Sinalizar Exceção"}</span>
                      </button>

                      {/* Botão Voltar para Pendente (se já respondido) */}
                      {!isPending && (
                        <button
                          type="button"
                          onClick={() => handleRevertToPending(item)}
                          disabled={updateMutation.isPending}
                          title="Reverter para pendente"
                          className="p-1.5 border border-line text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors active:scale-[0.95]"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* Caixa de Texto Expansível para Nota de Exceção (0.18s) */}
                  {/* ───────────────────────────────────────────────────────── */}
                  {isEditingException && (
                    <div className="mt-3 pt-3 border-t border-line/60 space-y-2 animate-in fade-in slide-in-from-top-2 duration-180 print:hidden">
                      <label className="block text-[11px] font-mono text-muted-foreground">
                        Descreva a alternativa que a casa possui ou o motivo da impossibilidade:
                      </label>
                      <textarea
                        rows={2}
                        value={exceptionNotes[item.id] ?? ""}
                        onChange={(e) =>
                          setExceptionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Ex.: Não possuímos o modelo exato solicitado, mas oferecemos como alternativa o modelo X com especificações equivalentes."
                        className="w-full border border-line bg-background px-3 py-2 text-xs rounded-lg outline-none focus:border-[#9184d9] font-sans"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveExceptionItemId(null)}
                          className="px-3 py-1 text-xs font-mono uppercase tracking-wider border border-line hover:bg-accent rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveException(item)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1 text-xs font-mono uppercase tracking-wider bg-[#9184d9] text-white font-medium hover:bg-[#8072cb] rounded-lg active:scale-[0.97]"
                        >
                          Salvar Exceção
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Rodapé Informativo para a Casa de Show */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <footer className="pt-6 border-t border-line text-center text-xs text-muted-foreground space-y-1 print:hidden">
          <p>
            Todas as alterações são salvas automaticamente e notificadas à produção do artista.
          </p>
          <p className="font-mono text-[11px]">
            Em caso de dúvidas técnicas, entre em contato diretamente com a produção da turnê.
          </p>
        </footer>
      </main>
    </div>
  );
}
