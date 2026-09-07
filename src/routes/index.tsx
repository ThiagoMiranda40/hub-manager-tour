import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  computeShowProgress,
  computeRiderBalance,
  formatShowDate,
  formatWeekday,
} from "@/lib/g3";
import { useCatalog } from "@/hooks/useCatalog";
import { toast } from "sonner";
import {
  Users,
  Calendar,
  MapPin,
  Plus,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hub Manager Tour — Gerenciamento de Turnês" },
      {
        name: "description",
        content:
          "Agenda de shows com status de documentos: veja num relance quem já enviou passagem, hotel e nota, e quem ainda falta.",
      },
      { property: "og:title", content: "Hub Manager Tour — Gerenciamento de Turnês" },
      {
        property: "og:description",
        content: "Agenda de shows com status de documentos da produção de turnê.",
      },
    ],
  }),
  component: Dashboard,
});

type ShowRow = {
  id: string;
  city: string;
  venue: string | null;
  show_date: string;
  public_token: string;
  rider_public_token?: string;
  artists: { id: string; name: string } | null;
  tours: { id: string; name: string } | null;
};

function Dashboard() {
  const router = useRouter();
  const { session, loading } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "complete">("all");

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const enabled = !!session;
  const { docTypes } = useCatalog(enabled);

  const { data, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["dashboard"],
    enabled,
    queryFn: async () => {
      const [
        { data: shows },
        { data: cast },
        { data: docs },
        { data: requirements },
        { data: riderItems },
      ] = await Promise.all([
        supabase
          .from("shows")
          .select("id, city, venue, show_date, public_token, rider_public_token, artists(id, name), tours(id, name)")
          .order("show_date"),
        supabase.from("cast_members").select("id, show_id, name, role, person_id"),
        supabase.from("documents").select("id, show_id, cast_member_id, doc_type"),
        supabase.from("show_requirements").select("id, show_id, cast_member_id, document_type_id, required"),
        supabase.from("show_rider_items").select("id, show_id, status, is_mandatory"),
      ]);

      return {
        shows: (shows ?? []) as unknown as ShowRow[],
        cast: cast ?? [],
        docs: docs ?? [],
        requirements: requirements ?? [],
        riderItems: riderItems ?? [],
      };
    },
  });

  const shows = data?.shows ?? [];
  const stats = shows.map((show) => {
    const members = (data?.cast ?? []).filter((c) => c.show_id === show.id);
    const docs = (data?.docs ?? []).filter((d) => d.show_id === show.id);
    const showReqs = (data?.requirements ?? []).filter((r) => r.show_id === show.id);
    const showRider = (data?.riderItems ?? []).filter((r) => r.show_id === show.id);

    const reqList = showReqs.length > 0 ? showReqs : docTypes;
    const progress = computeShowProgress(members, docs, reqList);
    const rider = computeRiderBalance(showRider);

    return {
      show,
      progress,
      rider,
      memberCount: members.length,
    };
  });

  const completeDocs = stats.filter((s) => s.progress.done).length;
  const pendingDocs = stats.filter((s) => s.progress.hasRequirement && !s.progress.done).length;
  const totalRiderItems = stats.reduce((acc, s) => acc + s.rider.total, 0);
  const totalRiderExceptions = stats.reduce((acc, s) => acc + s.rider.exceptions, 0);

  const artists = Array.from(
    new Map(stats.map((s) => [s.show.artists?.name ?? "", s.show.artists?.name ?? ""])).entries(),
  )
    .map(([, name]) => name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filteredStats = stats.filter(({ show, progress }) => {
    const text = `${show.city} ${show.venue ?? ""} ${show.artists?.name ?? ""} ${show.tours?.name ?? ""}`.toLowerCase();
    const matchesSearch = text.includes(search.trim().toLowerCase());
    const matchesArtist = artistFilter === "all" || show.artists?.name === artistFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && progress.hasRequirement && !progress.done) ||
      (statusFilter === "complete" && progress.done);
    return matchesSearch && matchesArtist && matchesStatus;
  });

  if (!loading && !session) return null;

  if (loading || isLoadingDashboard || !data) {
    return (
      <AppShell email={session?.user.email}>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell email={session?.user.email}>
      {/* Top Banner & Stats */}
      <section className="grid grid-cols-1 items-end gap-6 border-b border-line pb-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="label-mono flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#9184d9]" />
            (a) Agenda de produção
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[0.92] tracking-tight sm:text-6xl text-foreground">
            Prancheta
            <br />
            de Turnê
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md font-sans">
            Controle integrado de elenco, pendências documentais e conferência de rider técnico por data.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px self-end border border-line bg-line lg:col-span-6 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-card/90 p-4 backdrop-blur-xs">
            <div className="label-mono text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3 text-[#9184d9]" />
              Shows
            </div>
            <div className="mt-2 font-display text-3xl leading-none text-foreground">{shows.length}</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {totalRiderItems} itens de rider
            </div>
          </div>
          <div className="bg-card/90 p-4 backdrop-blur-xs">
            <div className="label-mono text-amber-500/90 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3" />
              Docs Pendentes
            </div>
            <div className="mt-2 font-display text-3xl leading-none text-amber-600 dark:text-amber-400">
              {pendingDocs}
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {totalRiderExceptions > 0 ? `${totalRiderExceptions} exc. no rider` : "0 exc. no rider"}
            </div>
          </div>
          <div className="bg-card/90 p-4 backdrop-blur-xs">
            <div className="label-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="size-3" />
              Docs 100%
            </div>
            <div className="mt-2 font-display text-3xl leading-none text-emerald-600 dark:text-emerald-400">
              {completeDocs}
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              prontos p/ embarque
            </div>
          </div>
        </div>
      </section>

      {/* Main Section */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="label-mono flex items-center gap-2">
            <span>(b) Próximas datas da temporada</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
              {filteredStats.length} {filteredStats.length === 1 ? "data" : "datas"}
            </span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 bg-foreground px-4 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-[0.14em] text-background transition-all duration-120 hover:bg-[#9184d9] hover:text-white active:scale-[0.96] active:opacity-90 touch-manipulation cursor-pointer shadow-xs"
          >
            {open ? (
              "Fechar formulário"
            ) : (
              <>
                <Plus className="size-3.5" />
                Novo show
              </>
            )}
          </button>
        </div>

        {/* Modal / Inline Form for Show Creation */}
        {open ? (
          <NewShowForm
            onDone={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        ) : null}

        {/* Filters and Search */}
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-line bg-card/40 p-4 backdrop-blur-xs sm:grid-cols-12 shadow-2xs">
          <div className="sm:col-span-5">
            <label className="label-mono block text-muted-foreground">Buscar por cidade, local, artista ou turnê</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: São Paulo, Allianz Parque, Turnê 2026..."
              className="mt-1.5 w-full rounded-lg border border-line bg-background/80 px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label-mono block text-muted-foreground">Filtrar Artista</label>
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-background/80 px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
            >
              <option value="all">Todos os Artistas ({artists.length})</option>
              {artists.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="label-mono block text-muted-foreground">Status de Documentação</label>
            <div className="mt-1.5 flex rounded-lg border border-line p-0.5 bg-background/60">
              {(["all", "pending", "complete"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-120 active:scale-[0.95] touch-manipulation cursor-pointer ${
                    statusFilter === key
                      ? "bg-[#9184d9] text-white font-medium shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key === "all" ? "Todos" : key === "pending" ? "Pendentes" : "100%"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shows Cards Grid / List with Nocturne Visual Style */}
        <div className="space-y-3">
          {filteredStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line/80 py-16 text-center">
              <ClipboardList className="mx-auto size-9 text-muted-foreground/50 stroke-[1.5]" />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {stats.length === 0
                  ? "Nenhum show cadastrado ainda na temporada"
                  : "Nenhum show encontrado para os filtros selecionados"}
              </p>
              {stats.length === 0 ? (
                <button
                  onClick={() => setOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-mono text-xs text-foreground hover:border-[#9184d9] transition-colors"
                >
                  <Plus className="size-3.5 text-[#9184d9]" />
                  Cadastrar o primeiro show
                </button>
              ) : null}
            </div>
          ) : null}

          {filteredStats.map(({ show, progress, rider, memberCount }) => {
            const { hasRequirement, expected, received, pct, done, unrequiredPeople, activePeople } =
              progress;

            return (
              <Link
                key={show.id}
                to="/shows/$id"
                params={{ id: show.id }}
                className="group block rounded-xl border border-line/80 bg-card/60 p-4 transition-all duration-120 hover:border-[#9184d9]/70 hover:bg-card/90 hover:shadow-xs active:scale-[0.99] touch-manipulation cursor-pointer sm:p-5"
              >
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12 sm:gap-6">
                  {/* Coluna 1: Data & Dia da Semana */}
                  <div className="flex items-center gap-3 sm:col-span-3 sm:block">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-background/80 font-mono sm:size-14">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9184d9]">
                        {formatWeekday(show.show_date)}
                      </span>
                      <span className="font-display text-xl leading-none text-foreground sm:text-2xl">
                        {show.show_date.slice(8, 10)}
                      </span>
                    </div>
                    <div className="sm:mt-2">
                      <div className="font-mono text-[11px] text-muted-foreground uppercase">
                        {formatShowDate(show.show_date)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <Users className="size-3 text-[#9184d9]" />
                        <span>
                          {memberCount} {memberCount === 1 ? "integrante" : "integrantes"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Artista, Turnê, Cidade e Local */}
                  <div className="sm:col-span-4">
                    <div className="font-display text-2xl leading-none tracking-tight text-foreground group-hover:text-[#9184d9] transition-colors">
                      {show.artists?.name ?? "SEM ARTISTA"}
                    </div>
                    {show.tours?.name ? (
                      <div className="mt-1 inline-flex items-center gap-1 rounded bg-accent/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                        <span>Turnê: {show.tours.name}</span>
                      </div>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                      <span className="font-medium text-foreground/90">{show.city}</span>
                      {show.venue ? (
                        <>
                          <span className="text-line">·</span>
                          <span className="truncate">{show.venue}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Coluna 3: Progresso de Documentos */}
                  <div className="sm:col-span-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-1.5">
                      <span className="label-mono text-[10px] text-muted-foreground">Docs</span>
                      {!hasRequirement ? (
                        <StatusBadge status="no_requirement" label="Sem exigência" size="sm" />
                      ) : done ? (
                        <StatusBadge status="confirmed" label="100% Entregue" size="sm" />
                      ) : (
                        <StatusBadge
                          status="pending"
                          label={`${expected - received} pendente${expected - received === 1 ? "" : "s"}`}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Barra de Progresso Docs */}
                    <div className="h-1.5 w-full rounded-full bg-line/80 overflow-hidden">
                      {hasRequirement ? (
                        <div
                          className={`h-full transition-all duration-300 ${
                            done ? "bg-emerald-500" : "bg-[#9184d9]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      ) : null}
                    </div>

                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span>
                        {hasRequirement ? `${received}/${expected} arquivos` : `${memberCount} no elenco`}
                      </span>
                      {hasRequirement && unrequiredPeople > 0 ? (
                        <span className="italic text-[9px] text-muted-foreground/80">
                          {unrequiredPeople} dispensado{unrequiredPeople === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Coluna 4: Resumo do Rider Técnico */}
                  <div className="sm:col-span-2">
                    <div className="mb-1.5 flex items-center justify-between gap-1.5">
                      <span className="label-mono text-[10px] text-muted-foreground">Rider</span>
                      {rider.total === 0 ? (
                        <StatusBadge status="no_requirement" label="Sem rider" size="sm" />
                      ) : rider.isComplete ? (
                        <StatusBadge status="confirmed" label="Rider OK" size="sm" />
                      ) : rider.hasExceptions ? (
                        <StatusBadge
                          status="exception"
                          label={`${rider.exceptions} exc.`}
                          size="sm"
                        />
                      ) : (
                        <StatusBadge
                          status="pending"
                          label={`${rider.pending} pend.`}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Barra de Progresso Rider */}
                    <div className="h-1.5 w-full rounded-full bg-line/80 overflow-hidden">
                      {rider.total > 0 ? (
                        <div
                          className={`h-full transition-all duration-300 ${
                            rider.isComplete
                              ? "bg-emerald-500"
                              : rider.hasExceptions
                                ? "bg-amber-500"
                                : "bg-[#9184d9]"
                          }`}
                          style={{ width: `${rider.pct}%` }}
                        />
                      ) : null}
                    </div>

                    <div className="mt-1 font-mono text-[10px] text-muted-foreground truncate">
                      {rider.total > 0
                        ? `${rider.confirmed}/${rider.total} confirmados`
                        : "Não instanciado"}
                    </div>
                  </div>

                  {/* Coluna 5: Ação / Seta */}
                  <div className="hidden text-right sm:col-span-0.5 sm:flex sm:justify-end">
                    <div className="rounded-full p-1 text-muted-foreground/60 transition-transform duration-120 group-hover:translate-x-1 group-hover:text-foreground">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

/**
 * Formulário / Modal de Criação de Show com Elenco Sugerido Automaticamente e Instanciação do Rider
 */
function NewShowForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [newArtistName, setNewArtistName] = useState<string>("");
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [newTourName, setNewTourName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Consulta lista de artistas cadastrados
  const { data: artists = [] } = useQuery({
    queryKey: ["artists-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Consulta turnês do artista selecionado
  const { data: tours = [] } = useQuery({
    queryKey: ["artist-tours", selectedArtistId],
    enabled: !!selectedArtistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, name")
        .eq("artist_id", selectedArtistId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // T-06: Consulta elenco sugerido automaticamente (pessoas do artista + equipe geral)
  const { data: suggestedPeople = [], isLoading: isLoadingPeople } = useQuery({
    queryKey: ["suggested-people", selectedArtistId],
    queryFn: async () => {
      let query = supabase
        .from("person_artists")
        .select("person_id, is_general_crew, artist_id, people(id, name, default_role, is_active, phone)");

      if (selectedArtistId) {
        query = query.or(`artist_id.eq.${selectedArtistId},is_general_crew.eq.true`);
      } else {
        query = query.eq("is_general_crew", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const peopleMap = new Map<
        string,
        { id: string; name: string; default_role: string; is_general_crew: boolean }
      >();

      for (const row of data ?? []) {
        const p = row.people as unknown as {
          id: string;
          name: string;
          default_role?: string | null;
          is_active?: boolean | null;
        } | null;

        if (p && p.is_active !== false && !peopleMap.has(p.id)) {
          peopleMap.set(p.id, {
            id: p.id,
            name: p.name,
            default_role: p.default_role || "integrante",
            is_general_crew: Boolean(row.is_general_crew),
          });
        }
      }

      return Array.from(peopleMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      );
    },
  });

  // T-06: Consulta itens do rider template do artista selecionado
  const { data: riderTemplates = [] } = useQuery({
    queryKey: ["artist-rider-templates", selectedArtistId],
    enabled: !!selectedArtistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_rider_template_items")
        .select("*")
        .eq("artist_id", selectedArtistId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pré-marca todas as pessoas sugeridas por padrão quando a lista carregar
  useEffect(() => {
    if (suggestedPeople && suggestedPeople.length > 0) {
      setSelectedPersonIds(suggestedPeople.map((p) => p.id));
    } else {
      setSelectedPersonIds([]);
    }
  }, [suggestedPeople]);

  const togglePerson = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllPeople = () => {
    setSelectedPersonIds(suggestedPeople.map((p) => p.id));
  };

  const deselectAllPeople = () => {
    setSelectedPersonIds([]);
  };

  // Mutação para salvar show com elenco e rider
  const mutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

      // 1. Resolve artista
      let finalArtistId = selectedArtistId;
      if (mode === "create" || !finalArtistId) {
        if (!newArtistName.trim()) {
          throw new Error("Informe o nome do artista.");
        }

        // Verifica se já existe com mesmo nome
        const { data: existing } = await supabase
          .from("artists")
          .select("id")
          .ilike("name", newArtistName.trim())
          .maybeSingle();

        if (existing) {
          finalArtistId = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from("artists")
            .insert({ name: newArtistName.trim(), user_id: userId })
            .select("id")
            .single();
          if (error) throw new Error(`Erro ao criar artista: ${error.message}`);
          finalArtistId = created.id;
        }
      }

      // 2. Resolve turnê
      let finalTourId: string | null = selectedTourId || null;
      if (newTourName.trim()) {
        const { data: createdTour, error } = await supabase
          .from("tours")
          .insert({ name: newTourName.trim(), artist_id: finalArtistId, user_id: userId })
          .select("id")
          .single();
        if (error) throw new Error(`Erro ao criar turnê: ${error.message}`);
        finalTourId = createdTour.id;
      }

      // 3. Gera tokens públicos seguros
      const publicToken = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
      const riderPublicToken = crypto.randomUUID().replace(/-/g, "").slice(0, 18);

      // 4. Insere show em shows
      const { data: createdShow, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: userId,
          artist_id: finalArtistId,
          tour_id: finalTourId,
          city: city.trim(),
          show_date: date,
          venue: venue.trim() || null,
          public_token: publicToken,
          rider_public_token: riderPublicToken,
        })
        .select("id")
        .single();

      if (showError) throw new Error(`Erro ao cadastrar show: ${showError.message}`);
      const showId = createdShow.id;

      // 5. T-06: Pré-popula elenco com as pessoas sugeridas selecionadas
      if (selectedPersonIds.length > 0) {
        const castRows = selectedPersonIds.map((personId) => {
          const person = suggestedPeople.find((p) => p.id === personId);
          return {
            user_id: userId,
            show_id: showId,
            person_id: personId,
            name: person?.name || "Integrante",
            role: person?.default_role || "integrante",
          };
        });

        const { error: castError } = await supabase.from("cast_members").insert(castRows);
        if (castError) {
          console.error("Aviso: falha ao inserir elenco sugerido:", castError.message);
        }
      }

      // 6. T-06: Instancia itens de rider clonando o rider padrão daquele artista
      const { data: templates } = await supabase
        .from("artist_rider_template_items")
        .select("*")
        .eq("artist_id", finalArtistId)
        .order("position");

      if (templates && templates.length > 0) {
        const riderRows = templates.map((tmpl) => ({
          user_id: userId,
          show_id: showId,
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

        const { error: riderError } = await supabase.from("show_rider_items").insert(riderRows);
        if (riderError) {
          console.error("Aviso: falha ao clonar rider técnico padrão:", riderError.message);
        }
      }
    },
    onSuccess: () => {
      toast.success("Show cadastrado com sucesso! Elenco e rider técnico foram inicializados.");
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="mb-8 rounded-2xl border border-line bg-card p-5 sm:p-7 shadow-lg backdrop-blur-md transition-all animate-in fade-in duration-200"
    >
      <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-[#9184d9]" />
            Novo Show da Turnê
          </h2>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            Cadastre a data. O elenco vinculado e o rider técnico padrão serão instanciados automaticamente.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive font-mono">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Seletor de Artista */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-mono text-muted-foreground">Artista / Banda *</label>
            <button
              type="button"
              onClick={() => {
                if (mode === "select") {
                  setMode("create");
                  setSelectedArtistId("");
                } else {
                  setMode("select");
                  setNewArtistName("");
                }
              }}
              className="font-mono text-[10px] text-[#9184d9] hover:underline cursor-pointer"
            >
              {mode === "select" ? "+ Novo Artista" : "Selecionar existente"}
            </button>
          </div>

          {mode === "select" ? (
            <select
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
            >
              <option value="">Selecione um artista...</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              placeholder="Nome do novo artista ou banda"
              className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
            />
          )}
        </div>

        {/* Turnê */}
        <div>
          <label className="label-mono block text-muted-foreground mb-1.5">Turnê (opcional)</label>
          {tours.length > 0 ? (
            <div className="space-y-1.5">
              <select
                value={selectedTourId}
                onChange={(e) => {
                  setSelectedTourId(e.target.value);
                  if (e.target.value) setNewTourName("");
                }}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
              >
                <option value="">Nenhuma / Definir nova turnê...</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {!selectedTourId ? (
                <input
                  type="text"
                  value={newTourName}
                  onChange={(e) => setNewTourName(e.target.value)}
                  placeholder="Ou digite o nome de uma nova turnê"
                  className="w-full rounded-lg border border-line bg-background px-3 py-1.5 text-xs outline-none focus:border-[#9184d9] transition-colors"
                />
              ) : null}
            </div>
          ) : (
            <input
              type="text"
              value={newTourName}
              onChange={(e) => setNewTourName(e.target.value)}
              placeholder="Ex: Turnê Acústico 2026"
              className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
            />
          )}
        </div>

        {/* Data do Show */}
        <div>
          <label className="label-mono block text-muted-foreground mb-1.5">Data do Show *</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
          />
        </div>

        {/* Cidade */}
        <div>
          <label className="label-mono block text-muted-foreground mb-1.5">Cidade *</label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Curitiba / PR"
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
          />
        </div>

        {/* Local / Casa de Show */}
        <div className="lg:col-span-2">
          <label className="label-mono block text-muted-foreground mb-1.5">Local / Casa de Show</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Ex: Ópera de Arame, Teatro Positivo, Praça da Liberdade..."
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] transition-colors"
          />
        </div>
      </div>

      {/* Seção T-06: Elenco Sugerido Automaticamente */}
      <div className="mt-7 rounded-xl border border-line/80 bg-background/50 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#9184d9]" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Elenco Sugerido Automaticamente ({suggestedPeople.length})
            </h3>
          </div>
          {suggestedPeople.length > 0 ? (
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <button
                type="button"
                onClick={selectAllPeople}
                className="text-[#9184d9] hover:underline cursor-pointer"
              >
                Marcar todos
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={deselectAllPeople}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Desmarcar todos
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-muted-foreground font-sans">
          Integrantes vinculados a este artista e membros marcados como "Equipe Geral" no catálogo. Desmarque quem não participa desta data específica.
        </p>

        {isLoadingPeople ? (
          <div className="mt-3 py-4 text-center font-mono text-xs text-muted-foreground">
            Consultando catálogo e vínculos...
          </div>
        ) : suggestedPeople.length === 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line/60 bg-accent/30 p-3 font-mono text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 text-[#9184d9]" />
            <span>
              Nenhum integrante vinculado a este artista ainda. O elenco poderá ser adicionado individualmente na prancheta do show.
            </span>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedPeople.map((person) => {
              const checked = selectedPersonIds.includes(person.id);
              return (
                <label
                  key={person.id}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all duration-120 cursor-pointer text-xs ${
                    checked
                      ? "border-[#9184d9]/70 bg-[#9184d9]/10 text-foreground"
                      : "border-line/70 bg-card/40 text-muted-foreground hover:border-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePerson(person.id)}
                    className="size-4 rounded accent-[#9184d9] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">{person.name}</div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <span>{person.default_role}</span>
                      {person.is_general_crew ? (
                        <span className="rounded bg-accent px-1 text-[9px] text-[#9184d9]">
                          Equipe Geral
                        </span>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção T-06: Rider Técnico Padrão */}
      <div className="mt-4 rounded-xl border border-line/80 bg-background/50 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-line/60 pb-3">
          <ClipboardList className="size-4 text-[#9184d9]" />
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            Rider Técnico Padrão
          </h3>
        </div>
        <div className="mt-2 text-xs font-sans">
          {riderTemplates.length > 0 ? (
            <div className="flex items-start gap-2 text-foreground/90">
              <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#9184d9] font-mono">{riderTemplates.length} itens de rider</strong> serão instanciados automaticamente para este show (som, iluminação, backline e camarim).
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground font-mono text-[11px]">
              {selectedArtistId
                ? "Este artista ainda não possui rider padrão cadastrado no catálogo. O rider poderá ser preenchido na prancheta do show."
                : "Selecione um artista cadastrado para verificar itens de rider padrão a serem instanciados."}
            </p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-all duration-120 hover:text-foreground active:scale-[0.97] cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-background transition-all duration-120 hover:bg-[#9184d9] hover:text-white disabled:opacity-50 active:scale-[0.97] touch-manipulation cursor-pointer shadow-sm"
        >
          {mutation.isPending ? (
            "Salvando e Instanciando..."
          ) : (
            <>
              <Check className="size-3.5" />
              Salvar show e abrir prancheta
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className="grid grid-cols-1 items-end gap-6 border-b border-line pb-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="mt-4 h-14 w-full max-w-md" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
        </div>
        <div className="grid grid-cols-3 gap-px self-end border border-line bg-line lg:col-span-6 rounded-xl overflow-hidden">
          <div className="bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-2.5 w-20" />
          </div>
          <div className="bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-2.5 w-20" />
          </div>
          <div className="bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-2.5 w-20" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-line bg-card/40 p-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-9 w-full rounded-lg" />
          </div>
          <div className="sm:col-span-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-9 w-full rounded-lg" />
          </div>
          <div className="sm:col-span-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-9 w-full rounded-lg" />
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-line/80 bg-card/60 p-5"
            >
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
                <div className="flex items-center gap-3 sm:col-span-3 sm:block">
                  <Skeleton className="size-14 rounded-lg" />
                  <div className="mt-2 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <div className="sm:col-span-4 space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="sm:col-span-2.5 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="hidden sm:col-span-0.5 sm:block">
                  <Skeleton className="size-4 rounded-full ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
