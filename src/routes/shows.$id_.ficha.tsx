import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCatalog } from "@/hooks/useCatalog";
import { computeShowProgress, formatBRL, formatDocumentDescription, labelFrom } from "@/lib/g3";

export const Route = createFileRoute("/shows/$id_/ficha")({
  head: () => ({
    meta: [
      { title: "Relatório de Produção — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Relatório de Produção do show: elenco por função, documentos recebidos por tipo e resumo de reembolsos, pronto para impressão.",
      },
      { property: "og:title", content: "Relatório de Produção — Hub Manager Tour" },
      {
        property: "og:description",
        content: "Relatório imprimível do show: elenco, documentos e reembolsos.",
      },
    ],
  }),
  component: FichaProducao,
});

function FichaProducao() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { session, loading } = useSession();
  const { roles, docTypes } = useCatalog(!!session);

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/auth" });
  }, [loading, session, router]);

  const { data } = useQuery({
    queryKey: ["show", id],
    enabled: !!session,
    queryFn: async () => {
      const [{ data: show }, { data: cast }, { data: docs }] = await Promise.all([
        supabase
          .from("shows")
          .select(
            "id, city, venue, show_date, public_token, artist_id, tour_id, artists(name), tours(name)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase.from("cast_members").select("id, name, role").eq("show_id", id).order("name"),
        supabase
          .from("documents")
          .select(
            "id, cast_member_id, doc_type, file_path, file_name, note, amount, is_reimbursement, created_at",
          )
          .eq("show_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return { show, cast: cast ?? [], docs: docs ?? [] };
    },
  });

  if (loading || !session) return null;

  const show = data?.show;
  const cast = data?.cast ?? [];
  const docs = data?.docs ?? [];
  const progress = computeShowProgress(cast, docs, docTypes);
  const requiredTypes = docTypes.filter((t) => t.required);

  const reimbursableDocs = docs.filter((d) => d.is_reimbursement);
  const withAmount = reimbursableDocs.filter((d) => d.amount != null);
  const totalAmount = withAmount.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

  const memberName = (memberId: string) =>
    cast.find((m) => m.id === memberId)?.name ?? "—";

  const groupsByRole = roles
    .map((r) => ({ role: r.name, people: cast.filter((m) => m.role === r.id) }))
    .concat([
      {
        role: "Sem função",
        people: cast.filter((m) => !roles.some((r) => r.id === m.role)),
      },
    ])
    .filter((g) => g.people.length > 0);

  const groupsByType = docTypes
    .map((t) => ({ type: t.name, items: docs.filter((d) => d.doc_type === t.id) }))
    .concat([
      {
        type: "Outros",
        items: docs.filter((d) => !docTypes.some((t) => t.id === d.doc_type)),
      },
    ])
    .filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/shows/$id"
          params={{ id }}
          className="label-mono hover:text-foreground active:opacity-70 transition-opacity duration-120 touch-manipulation"
        >
          ← Voltar para o show
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-foreground px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-background transition-colors hover:bg-signal active:scale-[0.97] active:opacity-90 duration-120 touch-manipulation"
        >
          Imprimir / Exportar PDF
        </button>
      </div>

      {!show ? (
        <p className="label-mono">Show não encontrado</p>
      ) : (
        <article className="print-sheet">
          <header className="border-b-2 border-foreground pb-4">
            <p className="label-mono">Relatório de Produção · Hub Manager Tour</p>
            <h1 className="mt-2 text-4xl leading-none">{show.artists?.name ?? "SEM ARTISTA"}</h1>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Info label="Tour" value={show.tours?.name ?? "Show avulso"} />
              <Info label="Data" value={show.show_date} />
              <Info label="Cidade" value={show.city} />
              <Info label="Local" value={show.venue ?? "—"} />
            </dl>
          </header>

          <section className="mt-8 break-inside-avoid">
            <h2 className="label-mono mb-3">Elenco · {cast.length} pessoas</h2>
            {groupsByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>
            ) : (
              groupsByRole.map((g) => (
                <div key={g.role} className="mb-5 break-inside-avoid">
                  <div className="border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.18em]">
                    {g.role} · {g.people.length}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {g.people.map((m) => {
                        const mine = docs.filter((d) => d.cast_member_id === m.id);
                        const missing = requiredTypes.filter(
                          (t) => !mine.some((d) => d.doc_type === t.id),
                        );
                        return (
                          <tr key={m.id} className="border-b border-line align-top">
                            <td className="w-1/3 py-2 pr-3 font-medium">{m.name}</td>
                            <td className="py-2 pr-3 font-mono text-[11px]">
                              {mine.length
                                ? mine.map((d) => labelFrom(docTypes, d.doc_type)).join(" · ")
                                : "nada enviado"}
                            </td>
                            <td className="w-40 py-2 text-right font-mono text-[11px]">
                              {requiredTypes.length === 0 ? (
                                <span className="text-muted-foreground">sem exigência</span>
                              ) : missing.length === 0 ? (
                                <span className="text-ok">completo</span>
                              ) : (
                                <span className="text-signal">
                                  falta {missing.map((t) => t.name).join(", ")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
            {requiredTypes.length > 0 ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                Progresso: {progress.received}/{progress.expected} documentos obrigatórios (
                {progress.pct}%) · {progress.pendingPeople} pessoa(s) pendente(s)
              </p>
            ) : null}
          </section>

          <section className="mt-8">
            <h2 className="label-mono mb-3">Documentos recebidos · {docs.length}</h2>
            {groupsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento recebido.</p>
            ) : (
              groupsByType.map((g) => (
                <div key={g.type} className="mb-5 break-inside-avoid">
                  <div className="border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.18em]">
                    {g.type} · {g.items.length}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {g.items.map((d) => (
                        <tr key={d.id} className="border-b border-line">
                          <td className="w-1/3 py-2 pr-3">{memberName(d.cast_member_id)}</td>
                          <td className="py-2 pr-3 font-mono text-[11px] break-all">
                            {formatDocumentDescription(d)}
                          </td>
                          <td className="w-32 py-2 text-right font-mono text-[11px]">
                            {d.amount != null ? formatBRL(Number(d.amount)) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>

          <section className="mt-8 break-inside-avoid">
            <h2 className="label-mono mb-3">Resumo de reembolsos</h2>
            <div className="grid grid-cols-3 gap-px border border-line bg-line">
              <Stat label="Documentos reembolsáveis" value={String(reimbursableDocs.length)} />
              <Stat
                label="Sem valor informado"
                value={String(reimbursableDocs.length - withAmount.length)}
              />
              <Stat label="Soma declarada" value={formatBRL(totalAmount)} />
            </div>

            {withAmount.length > 0 ? (
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {cast.map((m) => {
                    const items = withAmount.filter((d) => d.cast_member_id === m.id);
                    if (items.length === 0) return null;
                    const subtotal = items.reduce((s, d) => s + Number(d.amount ?? 0), 0);
                    return (
                      <tr key={m.id} className="border-b border-line align-top">
                        <td className="w-1/3 py-2 pr-3 font-medium">{m.name}</td>
                        <td className="py-2 pr-3 font-mono text-[11px]">
                          {items
                            .map(
                              (d) =>
                                `${labelFrom(docTypes, d.doc_type)} ${formatBRL(Number(d.amount))}`,
                            )
                            .join(" · ")}
                        </td>
                        <td className="w-32 py-2 text-right font-mono text-[11px]">
                          {formatBRL(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                Nenhum valor informado até agora.
              </p>
            )}

            <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              Valores auto-declarados por quem enviou o documento, sem conferência automática.
              Este é um resumo operacional, não um relatório fiscal.
            </p>
          </section>
        </article>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-mono">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-3">
      <div className="label-mono">{label}</div>
      <div className="mt-1 font-display text-2xl leading-none">{value}</div>
    </div>
  );
}
