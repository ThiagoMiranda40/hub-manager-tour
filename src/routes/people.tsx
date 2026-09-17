import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  QrCode,
  Copy,
  Check,
  Edit2,
  X,
  Music,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCatalog } from "@/hooks/useCatalog";
import { AppShell } from "@/components/AppShell";
import { ConfirmButton } from "@/components/ConfirmButton";

export const Route = createFileRoute("/people")({
  head: () => ({
    meta: [
      { title: "Pessoas & Equipe — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Catálogo centralizado de integrantes, equipe técnica, contatos, chave Pix e vínculos com artistas.",
      },
      { property: "og:title", content: "Pessoas & Equipe — Hub Manager Tour" },
      {
        property: "og:description",
        content:
          "Gerenciamento de pessoas, músicos, técnicos e equipe geral de turnês.",
      },
    ],
  }),
  component: PeoplePage,
});

type PixType = "cpf" | "email" | "phone" | "random" | "";

type PersonFormData = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  default_role_id: string;
  pix_type: PixType;
  pix_key: string;
  notes: string;
  is_general_crew: boolean;
  selected_artist_ids: string[];
};

const initialFormData: PersonFormData = {
  name: "",
  phone: "",
  email: "",
  default_role_id: "",
  pix_type: "",
  pix_key: "",
  notes: "",
  is_general_crew: false,
  selected_artist_ids: [],
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

function formatPixKey(value: string, type: PixType) {
  if (type === "cpf") {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  if (type === "phone") {
    return formatPhone(value);
  }
  return value;
}

function cleanPixKeyForCopy(key: string, type: PixType | null) {
  if (type === "cpf" || type === "phone") {
    return key.replace(/\D/g, "");
  }
  return key.trim();
}

function PeoplePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const qc = useQueryClient();
  const { roles } = useCatalog(!!session);

  const [search, setSearch] = useState("");
  const [filterArtist, setFilterArtist] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<PersonFormData>(initialFormData);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  // Busca catálogo de artistas do usuário
  const { data: artists = [] } = useQuery({
    queryKey: ["user-artists"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Busca catálogo de pessoas com vínculos
  const {
    data: people = [],
    isLoading: loadingPeople,
    refetch,
  } = useQuery({
    queryKey: ["people-catalog"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select(
          `
          id,
          user_id,
          name,
          phone,
          email,
          pix_type,
          pix_key,
          default_role_id,
          notes,
          created_at,
          updated_at,
          person_artists (
            id,
            artist_id,
            is_general_crew,
            artists ( id, name )
          )
        `,
        )
        .order("name");

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Mutação para salvar pessoa e sincronizar vínculos
  const savePerson = useMutation({
    mutationFn: async (payload: PersonFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const cleanName = payload.name.trim();
      if (cleanName.length < 2) {
        throw new Error("O nome da pessoa deve ter pelo menos 2 caracteres.");
      }

      const personRecord = {
        user_id: user.id,
        name: cleanName,
        phone: payload.phone.trim() || null,
        email: payload.email.trim() || null,
        default_role_id: payload.default_role_id || null,
        pix_type: payload.pix_type || null,
        pix_key: payload.pix_key.trim() || null,
        notes: payload.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let personId = payload.id;

      if (personId) {
        // Atualiza pessoa existente
        const { error: updateErr } = await supabase
          .from("people")
          .update(personRecord)
          .eq("id", personId);
        if (updateErr) throw new Error(updateErr.message);
      } else {
        // Insere nova pessoa
        const { data: newPerson, error: insertErr } = await supabase
          .from("people")
          .insert(personRecord)
          .select("id")
          .single();
        if (insertErr) throw new Error(insertErr.message);
        personId = newPerson.id;
      }

      if (!personId) throw new Error("Falha ao identificar pessoa salva");

      // Sincroniza tabela associativa person_artists
      // 1. Remove vínculos anteriores
      const { error: delErr } = await supabase
        .from("person_artists")
        .delete()
        .eq("person_id", personId);
      if (delErr) throw new Error(delErr.message);

      // 2. Insere novos vínculos
      if (payload.is_general_crew) {
        const { error: insCrewErr } = await supabase
          .from("person_artists")
          .insert({
            user_id: user.id,
            person_id: personId,
            is_general_crew: true,
            artist_id: null,
          });
        if (insCrewErr) throw new Error(insCrewErr.message);
      } else if (payload.selected_artist_ids.length > 0) {
        const linksToInsert = payload.selected_artist_ids.map((artistId) => ({
          user_id: user.id,
          person_id: personId!,
          artist_id: artistId,
          is_general_crew: false,
        }));
        const { error: insLinksErr } = await supabase
          .from("person_artists")
          .insert(linksToInsert);
        if (insLinksErr) throw new Error(insLinksErr.message);
      }
    },
    onSuccess: () => {
      toast.success(
        formData.id
          ? "Cadastro atualizado com sucesso"
          : "Pessoa cadastrada com sucesso",
      );
      setModalOpen(false);
      setFormData(initialFormData);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["people-catalog"] });
      refetch();
    },
    onError: (err: Error) => {
      setFormError(err.message);
      toast.error(err.message);
    },
  });

  // Mutação para excluir pessoa
  const deletePerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Pessoa removida do catálogo");
      qc.invalidateQueries({ queryKey: ["people-catalog"] });
      refetch();
    },
    onError: (err: Error) => {
      toast.error(`Não foi possível excluir: ${err.message}`);
    },
  });

  function openCreateModal() {
    setFormData({
      ...initialFormData,
      default_role_id: roles[0]?.id ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(person: (typeof people)[number]) {
    const isGeneral = (person.person_artists ?? []).some(
      (pa) => pa.is_general_crew,
    );
    const artistIds = (person.person_artists ?? [])
      .filter((pa) => !pa.is_general_crew && pa.artist_id)
      .map((pa) => pa.artist_id as string);

    setFormData({
      id: person.id,
      name: person.name,
      phone: person.phone ?? "",
      email: person.email ?? "",
      default_role_id: person.default_role_id ?? "",
      pix_type: (person.pix_type as PixType) ?? "",
      pix_key: person.pix_key ?? "",
      notes: person.notes ?? "",
      is_general_crew: isGeneral,
      selected_artist_ids: artistIds,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function copyPix(person: (typeof people)[number]) {
    if (!person.pix_key) return;
    const cleanKey = cleanPixKeyForCopy(
      person.pix_key,
      person.pix_type as PixType,
    );
    navigator.clipboard.writeText(cleanKey);
    setCopiedId(person.id);
    toast.success(`Chave Pix de ${person.name} copiada!`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filtragem da lista
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      // Busca textual (nome, email, telefone, pix)
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchEmail = (p.email ?? "").toLowerCase().includes(q);
        const matchPhone = (p.phone ?? "").includes(q);
        const matchPix = (p.pix_key ?? "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchPix) return false;
      }

      // Filtro por função
      if (filterRole !== "all") {
        if (p.default_role_id !== filterRole) return false;
      }

      // Filtro por Artista
      if (filterArtist !== "all") {
        const links = p.person_artists ?? [];
        if (filterArtist === "general") {
          const isGen = links.some((l) => l.is_general_crew);
          if (!isGen) return false;
        } else {
          const hasArtist = links.some((l) => l.artist_id === filterArtist);
          const isGen = links.some((l) => l.is_general_crew);
          if (!hasArtist && !isGen) return false;
        }
      }

      return true;
    });
  }, [people, search, filterRole, filterArtist]);

  return (
    <AppShell email={session?.user?.email}>
      <div className="space-y-6">
        {/* Cabeçalho da página */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Pessoas & Equipe
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Catálogo único de integrantes, funções habituais, contatos, dados
              Pix e vínculos com artistas.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-nocturne hover:opacity-90 touch-feedback cursor-pointer shadow-sm"
          >
            <UserPlus className="size-4" />
            <span>Nova Pessoa</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="rounded-xl border border-line bg-card p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail, telefone ou chave Pix..."
                className="w-full rounded-lg border border-line bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            {/* Filtro por Artista */}
            <div className="w-full sm:w-56">
              <select
                value={filterArtist}
                onChange={(e) => setFilterArtist(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
              >
                <option value="all">Todos os Vínculos</option>
                <option value="general">★ Apenas Equipe Geral</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Função */}
            <div className="w-full sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
              >
                <option value="all">Todas as Funções</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Exibindo <strong>{filteredPeople.length}</strong> de{" "}
              <strong>{people.length}</strong> pessoas cadastradas
            </span>
            {search || filterArtist !== "all" || filterRole !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterArtist("all");
                  setFilterRole("all");
                }}
                className="text-primary hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>

        {/* Lista de Pessoas */}
        {loadingPeople ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando catálogo de pessoas...
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card/50 p-12 text-center">
            <Users className="mx-auto size-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {people.length === 0
                ? "Nenhuma pessoa cadastrada ainda"
                : "Nenhum resultado para os filtros selecionados"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              {people.length === 0
                ? "Cadastre músicos, técnicos e equipe de produção uma única vez para escalá-los com agilidade nos shows."
                : "Tente buscar com outro termo ou redefinir os filtros de artista e função."}
            </p>
            {people.length === 0 ? (
              <button
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-nocturne touch-feedback cursor-pointer"
              >
                <UserPlus className="size-4" />
                <span>Cadastrar primeira pessoa</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map((person) => {
              const roleName =
                roles.find((r) => r.id === person.default_role_id)?.name ??
                "Integrante";
              const isGeneral = (person.person_artists ?? []).some(
                (pa) => pa.is_general_crew,
              );
              const artistLinks = (person.person_artists ?? []).filter(
                (pa) => !pa.is_general_crew && pa.artists?.name,
              );

              return (
                <div
                  key={person.id}
                  className="rounded-xl border border-line bg-card p-5 shadow-sm transition-nocturne hover:border-primary/40 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground leading-tight">
                          {person.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md">
                          <Briefcase className="size-3" />
                          {roleName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(person)}
                          title="Editar pessoa"
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-nocturne touch-feedback cursor-pointer"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <ConfirmButton
                          onConfirm={() => deletePerson.mutate(person.id)}
                          label="Excluir"
                          confirmLabel="Sim, excluir"
                          className="rounded-lg p-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          confirmClassName="rounded-lg px-2 py-1 text-xs bg-destructive text-destructive-foreground font-semibold"
                        />
                      </div>
                    </div>

                    {/* Vínculos */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {isGeneral ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent/70 px-2 py-0.5 text-[11px] font-semibold text-foreground border border-line">
                          ★ Equipe Geral
                        </span>
                      ) : null}
                      {artistLinks.map((al) => (
                        <span
                          key={al.id}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground border border-line"
                        >
                          <Music className="size-3 opacity-60" />
                          {al.artists?.name}
                        </span>
                      ))}
                      {!isGeneral && artistLinks.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">
                          Sem vínculos de artista
                        </span>
                      ) : null}
                    </div>

                    {/* Contatos */}
                    <div className="space-y-1.5 pt-2 border-t border-line/60 text-xs text-muted-foreground">
                      {person.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 shrink-0 opacity-70" />
                          <span>{person.phone}</span>
                        </div>
                      ) : null}
                      {person.email ? (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{person.email}</span>
                        </div>
                      ) : null}
                      {!person.phone && !person.email ? (
                        <span className="italic text-muted-foreground/70">
                          Nenhum contato cadastrado
                        </span>
                      ) : null}
                    </div>

                    {/* Chave Pix */}
                    {person.pix_key ? (
                      <div className="pt-2 border-t border-line/60">
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2 border border-line">
                          <div className="min-w-0 flex items-center gap-2">
                            <QrCode className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                                Pix ({person.pix_type ?? "Chave"})
                              </div>
                              <div className="text-xs font-mono font-medium text-foreground truncate">
                                {person.pix_key}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyPix(person)}
                            title="Copiar Chave Pix"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-nocturne touch-feedback cursor-pointer"
                          >
                            {copiedId === person.id ? (
                              <Check className="size-4 text-ok" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Observações */}
                    {person.notes ? (
                      <p className="pt-1 text-[11px] text-muted-foreground line-clamp-2 italic">
                        "{person.notes}"
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Pessoa */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-slide-up">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="text-lg font-bold text-foreground">
                {formData.id ? "Editar Pessoa" : "Cadastrar Nova Pessoa"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-nocturne"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePerson.mutate(formData);
              }}
              className="space-y-4 text-sm"
            >
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome Completo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Carlos Eduardo da Silva"
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
                />
              </div>

              {/* Função Padrão */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Função Habitual
                </label>
                <select
                  value={formData.default_role_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_role_id: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
                >
                  <option value="">Selecione uma função...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contatos (Telefone e E-mail) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Telefone com DDD
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: formatPhone(e.target.value),
                      })
                    }
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-lg border border-line bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="carlos@exemplo.com"
                    className="w-full rounded-lg border border-line bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
                  />
                </div>
              </div>

              {/* Dados Pix */}
              <div className="rounded-xl border border-line bg-background/50 p-3 space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <QrCode className="size-4 text-primary" />
                  Dados Pix para Reembolsos Operacionais
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Tipo de Chave
                    </label>
                    <select
                      value={formData.pix_type}
                      onChange={(e) => {
                        const newType = e.target.value as PixType;
                        setFormData({
                          ...formData,
                          pix_type: newType,
                          pix_key: formatPixKey(formData.pix_key, newType),
                        });
                      }}
                      className="w-full rounded-lg border border-line bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Não informado</option>
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Chave Pix
                    </label>
                    <input
                      type="text"
                      value={formData.pix_key}
                      disabled={!formData.pix_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pix_key: formatPixKey(
                            e.target.value,
                            formData.pix_type,
                          ),
                        })
                      }
                      placeholder={
                        formData.pix_type === "cpf"
                          ? "000.000.000-00"
                          : formData.pix_type === "phone"
                            ? "(11) 99999-9999"
                            : formData.pix_type === "email"
                              ? "nome@exemplo.com"
                              : formData.pix_type === "random"
                                ? "Chave aleatória UUID"
                                : "Selecione o tipo primeiro"
                      }
                      className="w-full rounded-lg border border-line bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Vínculos */}
              <div className="rounded-xl border border-line bg-background/50 p-3 space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Music className="size-4 text-primary" />
                  Vínculos com Artistas / Equipe
                </div>

                {/* Checkbox Equipe Geral */}
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg bg-card border border-line hover:border-primary/50 transition-nocturne">
                  <input
                    type="checkbox"
                    checked={formData.is_general_crew}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_general_crew: e.target.checked,
                        selected_artist_ids: e.target.checked
                          ? []
                          : formData.selected_artist_ids,
                      })
                    }
                    className="mt-0.5 size-4 accent-primary rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-xs text-foreground block">
                      ★ Equipe Geral (Todos os Artistas e Shows)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Marque se este profissional atua em todas as turnês do
                      produtor (ex: produtor geral, roadie principal).
                    </span>
                  </div>
                </label>

                {/* Checkboxes de Artistas Específicos */}
                {!formData.is_general_crew ? (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Ou vincule a artistas específicos:
                    </span>
                    {artists.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum artista cadastrado na conta.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 max-h-36 overflow-y-auto pr-1">
                        {artists.map((artist) => {
                          const checked = formData.selected_artist_ids.includes(
                            artist.id,
                          );
                          return (
                            <label
                              key={artist.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-nocturne ${
                                checked
                                  ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                                  : "bg-card border-line text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const ids = e.target.checked
                                    ? [
                                        ...formData.selected_artist_ids,
                                        artist.id,
                                      ]
                                    : formData.selected_artist_ids.filter(
                                        (id) => id !== artist.id,
                                      );
                                  setFormData({
                                    ...formData,
                                    selected_artist_ids: ids,
                                  });
                                }}
                                className="size-3.5 accent-primary rounded cursor-pointer"
                              />
                              <span className="truncate">{artist.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Observações Gerais
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Restrições alimentares, tamanho de uniforme, etc."
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-nocturne"
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-nocturne touch-feedback cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savePerson.isPending}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-nocturne touch-feedback cursor-pointer shadow-sm"
                >
                  {savePerson.isPending
                    ? "Salvando..."
                    : formData.id
                      ? "Salvar Alterações"
                      : "Cadastrar Pessoa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
