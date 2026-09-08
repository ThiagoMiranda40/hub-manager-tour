import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useCatalog } from "@/hooks/useCatalog";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  computeShowProgress,
  computeMemberRequirementStatus,
  computeRiderBalance,
  formatBRL,
  formatDateBR,
  formatDocumentDescription,
  labelFrom,
  type ShowRequirement,
  type ShowRiderItem,
} from "@/lib/g3";

export const Route = createFileRoute("/shows/$id_/ficha")({
  head: () => ({
    meta: [
      { title: "Relatório de Produção — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Relatório de Produção do show: elenco com exigências individuais, conferência de rider técnico segregado e resumo financeiro, pronto para impressão A4.",
      },
      { property: "og:title", content: "Relatório de Produção — Hub Manager Tour" },
      {
        property: "og:description",
        content: "Relatório imprimível do show: elenco, documentos, rider técnico e reembolsos.",
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
    queryKey: ["show", id, "ficha"],
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
          .select("id, name, role, person_id")
          .eq("show_id", id)
          .order("name"),
        supabase
          .from("documents")
          .select(
            "id, cast_member_id, doc_type, file_path, file_name, note, amount, is_reimbursement, is_reimbursed, created_at",
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
          .select("id, name, phone, pix_type, pix_key, email")
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

  const peopleMap = useMemo(() => {
    const list = data?.people ?? [];
    const map = new Map<string, (typeof list)[number]>();
    for (const p of list) {
      map.set(p.id, p);
    }
    return map;
  }, [data?.people]);

  // Atualiza dinamicamente o título do documento para sugestão ao imprimir / salvar em PDF
  useEffect(() => {
    if (!show) return;
    const artistName = show.artists?.name?.trim() || "Sem Artista";
    const showDate = formatDateBR(show.show_date);
    document.title = `Relatório de Produção — ${artistName} — ${showDate}`;

    return () => {
      document.title = "Relatório de Produção — Hub Manager Tour";
    };
  }, [show]);

  if (loading || !session) return null;

  const effectiveRequirements = requirements.length > 0 ? requirements : docTypes;
  const progress = computeShowProgress(cast, docs, effectiveRequirements);
  const riderBalance = computeRiderBalance(riderItems);

  const reimbursableDocs = docs.filter((d) => d.is_reimbursement);
  const withAmount = reimbursableDocs.filter((d) => d.amount != null);
  const totalAmount = withAmount.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
  const reimbursedAmount = withAmount
    .filter((d) => d.is_reimbursed)
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

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
    <main className="mx-auto max-w-4xl px-5 py-8 print:max-w-none print:px-0 print:py-0 print:text-black">
      {/* Botões de Ação na Tela (Ocultos na Impressão) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/shows/$id"
          params={{ id }}
          className="label-mono hover:text-foreground active:opacity-70 transition-opacity duration-120 touch-manipulation"
        >
          ← Voltar para o show
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-foreground px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-background transition-colors hover:bg-signal active:scale-[0.97] active:opacity-90 duration-120 touch-manipulation cursor-pointer"
          >
            Imprimir / Exportar PDF
          </button>
        </div>
      </div>

      {!show ? (
        <p className="label-mono">Show não encontrado</p>
      ) : (
        <article className="print-sheet space-y-8">
          {/* Cabeçalho do Show */}
          <header className="border-b-2 border-foreground pb-4">
            <p className="label-mono">Relatório de Produção · Hub Manager Tour</p>
            <h1 className="mt-2 text-3xl sm:text-4xl leading-none font-bold">
              {show.artists?.name ?? "SEM ARTISTA"}
            </h1>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Info label="Tour" value={show.tours?.name ?? "Show avulso"} />
              <Info label="Data" value={formatDateBR(show.show_date)} />
              <Info label="Cidade" value={show.city} />
              <Info label="Local" value={show.venue ?? "—"} />
            </dl>
          </header>

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO 1: ELENCO & LOGÍSTICA
             ───────────────────────────────────────────────────────────── */}
          <section className="break-inside-avoid">
            <div className="flex items-center justify-between border-b border-foreground pb-1 mb-3">
              <h2 className="label-mono text-base font-bold text-foreground">
                Elenco & Logística · {cast.length} pessoas
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground print:text-black">
                {progress.activePeople} ativos · {progress.unrequiredPeople} sem exigência
              </span>
            </div>

            {groupsByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>
            ) : (
              groupsByRole.map((g) => (
                <div key={g.role} className="mb-5 break-inside-avoid">
                  <div className="border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.18em] font-semibold">
                    {g.role} · {g.people.length}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {g.people.map((m) => {
                        const person = m.person_id ? peopleMap.get(m.person_id) : null;
                        const reqStatus = computeMemberRequirementStatus(
                          m.id,
                          requirements,
                          docs,
                        );
                        const mine = docs.filter((d) => d.cast_member_id === m.id);

                        return (
                          <tr key={m.id} className="border-b border-line align-top">
                            <td className="w-2/5 py-2 pr-3">
                              <span className="font-medium text-foreground block">{m.name}</span>
                              {person ? (
                                <span className="font-mono text-[10px] text-muted-foreground print:text-black block">
                                  {[
                                    person.phone,
                                    person.email,
                                    person.pix_key && `Pix: ${person.pix_key}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[11px]">
                              {mine.length
                                ? mine.map((d) => labelFrom(docTypes, d.doc_type)).join(" · ")
                                : "nada enviado"}
                            </td>
                            <td className="w-48 py-2 text-right font-mono text-[11px]">
                              {reqStatus.isUnrequired ? (
                                <span className="text-muted-foreground print:text-black">
                                  sem exigência
                                </span>
                              ) : reqStatus.isComplete ? (
                                <span className="text-ok font-semibold">
                                  ✓ completo ({reqStatus.receivedCount}/{reqStatus.expectedCount})
                                </span>
                              ) : (
                                <span className="text-signal font-semibold">
                                  falta{" "}
                                  {reqStatus.missingDocTypeIds
                                    .map((id) => labelFrom(docTypes, id))
                                    .join(", ")}
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
            <p className="font-mono text-[11px] text-muted-foreground print:text-black">
              Progresso: {progress.received}/{progress.expected} documentos obrigatórios ({progress.pct}%) ·{" "}
              {progress.pendingPeople} pessoa(s) pendente(s)
            </p>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO 2: RIDER TÉCNICO DO SHOW (RF-11)
             ───────────────────────────────────────────────────────────── */}
          <section className="break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between border-b border-foreground pb-1 mb-3 gap-2">
              <div>
                <h2 className="label-mono text-base font-bold text-foreground">
                  Rider Técnico · {riderItems.length} itens especificados
                </h2>
              </div>
              <div>
                {riderBalance.total === 0 ? (
                  <span className="font-mono text-xs text-muted-foreground">Sem rider cadastrado</span>
                ) : riderBalance.isComplete ? (
                  <span className="font-mono text-xs font-bold text-ok border border-ok/40 px-2 py-0.5 rounded">
                    ✓ RIDER COMPLETO / ATENDIDO
                  </span>
                ) : riderBalance.hasMandatoryPendingOrException ? (
                  <span className="font-mono text-xs font-bold text-signal border border-signal/40 px-2 py-0.5 rounded">
                    ⚠ ITENS INEGOCIÁVEIS EM ABERTO
                  </span>
                ) : (
                  <span className="font-mono text-xs font-bold text-amber-600 border border-amber-500/40 px-2 py-0.5 rounded">
                    {riderBalance.pending} PENDÊNCIA(S) DESEJÁVEL
                  </span>
                )}
              </div>
            </div>

            {/* Painel Resumo Segregado do Rider (RF-11) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-line bg-line mb-4">
              <Stat label="Total Especificado" value={String(riderBalance.total)} />
              <Stat
                label="Inegociáveis (Obrigatórios)"
                value={`${riderBalance.mandatory.confirmed}/${riderBalance.mandatory.total}`}
              />
              <Stat
                label="Desejáveis (Substituíveis)"
                value={`${riderBalance.desirable.confirmed}/${riderBalance.desirable.total}`}
              />
              <Stat
                label="Exceções da Casa"
                value={String(riderBalance.exceptions)}
              />
            </div>

            {/* Tabela do Rider Técnico */}
            {riderItems.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                Nenhum item cadastrado no rider deste show.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-foreground text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
                    <th className="py-2 pr-3 w-2/5">Item & Especificação</th>
                    <th className="py-2 pr-2 w-24">Categoria</th>
                    <th className="py-2 pr-2 w-12 text-center">Qtd</th>
                    <th className="py-2 pr-2 w-24">Grau</th>
                    <th className="py-2 pr-2 w-32">Status da Casa</th>
                    <th className="py-2 text-right w-36">Conferência Palco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {riderItems.map((item) => (
                    <tr key={item.id} className="align-top text-xs break-inside-avoid">
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-foreground">{item.item_name}</span>
                        {item.specification ? (
                          <p className="font-mono text-[10px] text-muted-foreground print:text-black mt-0.5">
                            {item.specification}
                          </p>
                        ) : null}
                        {item.exception_note ? (
                          <p className="text-[10px] text-purple-700 dark:text-purple-300 print:text-black font-sans mt-0.5">
                            <strong>Nota da Casa:</strong> {item.exception_note}
                          </p>
                        ) : null}
                        {item.physical_divergence_note ? (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 print:text-black font-sans mt-0.5">
                            <strong>Divergência Palco:</strong> {item.physical_divergence_note}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px] uppercase text-muted-foreground print:text-black">
                        {item.category}
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px] text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="py-2 pr-2 font-mono text-[10px] uppercase">
                        {item.is_mandatory ? (
                          <span className="font-bold text-destructive print:text-black">Inegociável</span>
                        ) : (
                          <span className="text-muted-foreground print:text-black">Desejável</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px]">
                        {item.status === "confirmed" ? (
                          <span className="text-ok font-medium">✓ Confirmado</span>
                        ) : item.status === "exception" ? (
                          <span className="text-purple-600 print:text-black font-medium">⚠ Exceção</span>
                        ) : (
                          <span className="text-muted-foreground print:text-black">Pendente</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono text-[11px]">
                        {item.physical_check === "conformed" ? (
                          <span className="text-ok font-semibold">✓ Conforme</span>
                        ) : item.physical_check === "divergent" ? (
                          <span className="text-signal font-bold">⚠ Divergente</span>
                        ) : (
                          <span className="text-muted-foreground print:text-black">Não conferido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO 3: DOCUMENTOS RECEBIDOS
             ───────────────────────────────────────────────────────────── */}
          <section className="break-inside-avoid">
            <h2 className="label-mono mb-3 text-base font-bold text-foreground">
              Documentos recebidos · {docs.length}
            </h2>
            {groupsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento recebido.</p>
            ) : (
              groupsByType.map((g) => (
                <div key={g.type} className="mb-5 break-inside-avoid">
                  <div className="border-b border-line pb-1 font-mono text-[11px] uppercase tracking-[0.18em] font-semibold">
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

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO 4: RESUMO DE REEMBOLSOS (RF-05)
             ───────────────────────────────────────────────────────────── */}
          <section className="break-inside-avoid">
            <h2 className="label-mono mb-3 text-base font-bold text-foreground">Resumo de reembolsos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-line bg-line">
              <Stat label="Solicitações" value={String(reimbursableDocs.length)} />
              <Stat
                label="Sem valor informado"
                value={String(reimbursableDocs.length - withAmount.length)}
              />
              <Stat label="Soma declarada" value={formatBRL(totalAmount)} />
              <Stat label="Total liquidado" value={formatBRL(reimbursedAmount)} />
            </div>

            {withAmount.length > 0 ? (
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {cast.map((m) => {
                    const person = m.person_id ? peopleMap.get(m.person_id) : null;
                    const items = withAmount.filter((d) => d.cast_member_id === m.id);
                    if (items.length === 0) return null;
                    const subtotal = items.reduce((s, d) => s + Number(d.amount ?? 0), 0);
                    return (
                      <tr key={m.id} className="border-b border-line align-top">
                        <td className="w-1/3 py-2 pr-3">
                          <span className="font-medium block">{m.name}</span>
                          {person?.pix_key ? (
                            <span className="font-mono text-[10px] text-muted-foreground print:text-black">
                              Pix ({person.pix_type ?? "chave"}): {person.pix_key}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px]">
                          {items
                            .map(
                              (d) =>
                                `${labelFrom(docTypes, d.doc_type)} ${formatBRL(Number(d.amount))}${d.is_reimbursed ? " (pago)" : ""}`,
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

            <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-muted-foreground print:text-black">
              Valores auto-declarados por quem enviou o documento, com validação e quitação pela
              produção. Este é um resumo operacional para conferência, não um relatório contábil definitivo.
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
    <div className="bg-background p-3 print:bg-white">
      <div className="label-mono">{label}</div>
      <div className="mt-1 font-display text-xl sm:text-2xl leading-none">{value}</div>
    </div>
  );
}
