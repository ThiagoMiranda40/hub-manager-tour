import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  AlertTriangle,
  ArrowDown,
  Check,
  Smartphone,
  Sparkles,
  Receipt,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getPublicShow, submitDocument } from "@/lib/public-show.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, formatShowDate, initials } from "@/lib/g3";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Checklist do Integrante — Hub Manager Tour" },
      {
        name: "description",
        content:
          "Envie sua passagem, voucher de hotel ou nota fiscal para a produção do show com checklist dinâmica em tempo real. Sem cadastro, sem login.",
      },
      { property: "og:title", content: "Checklist do Integrante — Hub Manager Tour" },
      {
        property: "og:description",
        content:
          "Checklist personalizada de documentos da turnê: confira o que já entregou e envie o que falta.",
      },
    ],
  }),
  component: PublicUpload,
});

function formatSubmissionDate(dateString: string) {
  try {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    const month = months[d.getMonth()] ?? "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month} às ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

function PublicUpload() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const fetchShow = useServerFn(getPublicShow);
  const send = useServerFn(submitDocument);

  const uploadFormRef = useRef<HTMLDivElement>(null);

  const [memberId, setMemberId] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [isReimbursement, setIsReimbursement] = useState(false);

  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-show", token],
    queryFn: () => fetchShow({ data: { token } }),
  });

  const docTypes = useMemo(() => data?.docTypes ?? [], [data?.docTypes]);
  const cast = useMemo(() => data?.cast ?? [], [data?.cast]);
  const requirements = useMemo(() => data?.requirements ?? [], [data?.requirements]);
  const documents = useMemo(() => data?.documents ?? [], [data?.documents]);

  const selectedMember = useMemo(
    () => cast.find((c) => c.id === memberId) ?? null,
    [cast, memberId],
  );

  const selectedType = useMemo(
    () => docTypes.find((t) => t.id === docTypeId) ?? null,
    [docTypes, docTypeId],
  );

  // Documentos e exigências específicos do integrante selecionado
  const memberRequirements = useMemo(() => {
    if (!memberId) return [];
    return requirements.filter((r) => r.castMemberId === memberId && r.required !== false);
  }, [requirements, memberId]);

  const memberDocuments = useMemo(() => {
    if (!memberId) return [];
    return documents.filter((d) => d.castMemberId === memberId);
  }, [documents, memberId]);

  // Seletor automático do primeiro tipo de documento caso nenhum esteja marcado
  useEffect(() => {
    if (!docTypeId && docTypes[0]) {
      setDocTypeId(docTypes[0].id);
    }
  }, [docTypeId, docTypes]);

  // Atualiza sugestão de reembolso quando o tipo de documento muda
  useEffect(() => {
    if (selectedType) {
      setIsReimbursement(selectedType.reimbursable);
    }
  }, [selectedType]);

  // Pré-visualização de imagem quando selecionada
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Ação ao clicar em "Anexar agora" a partir da checklist pessoal
  function handleSelectRequirementToUpload(targetDocTypeId: string) {
    setDocTypeId(targetDocTypeId);
    setFormError(null);
    setDoneMessage(null);
    if (uploadFormRef.current) {
      uploadFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Mutação de upload com validações de BVA (tamanho e valor de reembolso)
  const upload = useMutation({
    mutationFn: async () => {
      if (!data || !file) throw new Error("Selecione um arquivo para enviar.");
      if (!memberId) throw new Error("Selecione seu nome no elenco.");
      if (!docTypeId) throw new Error("Selecione o tipo de documento.");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error("Formato não aceito. Envie uma imagem (JPG, PNG, WEBP) ou PDF.");
      }

      // TC-04.1: BVA no tamanho do arquivo (20 MB máximo)
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Arquivo acima de 20 MB. Envie um arquivo menor.");
      }

      // TC-04.2: BVA no valor de reembolso
      let parsedAmount: number | undefined = undefined;
      if (isReimbursement && amount.trim()) {
        const cleanAmount = Number(amount.replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
          throw new Error("O valor de reembolso deve ser maior que R$ 0,00.");
        }
        parsedAmount = cleanAmount;
      }

      // Upload do arquivo no bucket do Supabase Storage
      const path = `${data.show.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
      if (upErr) {
        throw new Error(`Falha no upload do arquivo: ${upErr.message}`);
      }

      // Registro seguro do documento via Server Function com token de validação
      await send({
        data: {
          token,
          castMemberId: memberId,
          docTypeId,
          filePath: path,
          fileName: file.name,
          note: note.trim() || undefined,
          isReimbursement,
          amount: parsedAmount,
        },
      });
    },

    onSuccess: () => {
      const typeName = selectedType?.name ?? "Documento";
      const memberName = selectedMember?.name ?? "Integrante";

      setDoneMessage(`${typeName} de ${memberName} enviado com sucesso!`);
      setFile(null);
      setNote("");
      setAmount("");
      setFormError(null);

      // Invalida a query para atualizar a checklist em tempo real
      qc.invalidateQueries({ queryKey: ["public-show", token] });
      toast.success("Documento enviado e registrado com sucesso!");
    },

    onError: (e: Error) => {
      setFormError(e.message);
      toast.error(e.message);
    },
  });

  // Estado de Carregamento inicial
  if (isLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-lg px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // TC-04.4: Estado de Token Inválido com mensagem amigável e sem vazamento técnico
  if (!data || !data.show) {
    return (
      <div className="relative grid min-h-screen place-items-center px-4 py-12 text-center bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md border border-line bg-card p-8 rounded-2xl shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-500/15 text-amber-500 mb-4">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Link Inválido ou Expirado
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Não foi possível encontrar este show. Verifique se o endereço foi copiado por completo ou
            solicite um novo link à produção da turnê.
          </p>
          <div className="mt-6 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
            Hub Manager Tour · Acesso de Elenco
          </div>
        </div>
      </div>
    );
  }

  const { show } = data;

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8 sm:py-12 space-y-8">
      {/* Cabeçalho do Show (Direção Nocturne Responsiva) */}
      <header className="border-b border-line pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9184d9] font-medium bg-[#9184d9]/10 px-2.5 py-1 rounded-full">
              📱 Acesso de Elenco
            </span>
          </div>
        </div>

        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-foreground">
          {show.artist ?? "SHOW"}
        </h1>

        <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {show.city}
          {show.venue ? ` · ${show.venue}` : ""} · {formatShowDate(show.show_date)}
        </p>

        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          Selecione seu nome abaixo para conferir o que a produção já recebeu e enviar seus arquivos
          pendentes.
        </p>
      </header>

      {/* ─────────────────────────────────────────────────────────────────
          PASSO 1: SELEÇÃO DO INTEGRANTE NO ELENCO
         ───────────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="label-mono font-medium text-foreground">1 · Quem é você no elenco?</h2>
          {selectedMember ? (
            <span className="text-xs text-[#9184d9] font-mono font-medium">Selecionado ✓</span>
          ) : null}
        </div>

        {cast.length === 0 ? (
          <div className="mt-3 border border-dashed border-line p-6 rounded-xl text-center">
            <p className="font-mono text-xs text-muted-foreground">
              A produção ainda não cadastrou os integrantes deste show.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {cast.map((m) => {
              const isSelected = memberId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMemberId(m.id);
                    setDoneMessage(null);
                    setFormError(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full text-left p-3 rounded-xl border transition-all duration-120 touch-manipulation min-h-[48px] active:scale-[0.98]",
                    isSelected
                      ? "border-[#9184d9] bg-[#9184d9]/10 shadow-sm ring-1 ring-[#9184d9]"
                      : "border-line bg-card hover:bg-accent/30",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold",
                      isSelected ? "bg-[#9184d9] text-white" : "bg-accent/40 border border-line",
                    )}
                  >
                    {initials(m.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate text-foreground">{m.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{m.role}</div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={cn(
                        "size-4 rounded-full border grid place-items-center",
                        isSelected
                          ? "border-[#9184d9] bg-[#9184d9] text-white"
                          : "border-line bg-background",
                      )}
                    >
                      {isSelected ? <Check className="size-2.5" /> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          PASSO 2: CHECKLIST PESSOAL DINÂMICA (RF-04)
          Aparece imediatamente após a seleção do nome
         ───────────────────────────────────────────────────────────────── */}
      {selectedMember ? (
        <section className="border border-line bg-card p-5 rounded-2xl space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#9184d9]" />
                <h2 className="font-semibold text-sm sm:text-base text-foreground">
                  Checklist Pessoal de {selectedMember.name}
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                Documentos exigidos e recebidos para esta data
              </p>
            </div>
          </div>

          {/* Situação 1: O integrante possui exigências configuradas */}
          {memberRequirements.length > 0 ? (
            <div className="space-y-3">
              {memberRequirements.map((req) => {
                const docType = docTypes.find((t) => t.id === req.docTypeId);
                const submitted = memberDocuments.find((d) => d.docTypeId === req.docTypeId);
                const isReceived = Boolean(submitted);

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all",
                      isReceived
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/40 bg-amber-500/10",
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isReceived ? (
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {docType?.name ?? "Documento"}
                          </span>
                          <StatusBadge
                            status={isReceived ? "confirmed" : "pending"}
                            label={isReceived ? "Recebido" : "Pendente"}
                            size="sm"
                          />
                        </div>

                        {isReceived ? (
                          <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
                            <span className="truncate">{submitted?.fileName ?? "Arquivo enviado"}</span>
                            <span className="mx-1">·</span>
                            <span>{formatSubmissionDate(submitted!.createdAt)}</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Aguardando envio para esta apresentação.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex sm:justify-end">
                      {isReceived ? (
                        <button
                          type="button"
                          onClick={() => handleSelectRequirementToUpload(req.docTypeId)}
                          className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 touch-manipulation"
                        >
                          Reenviar novo arquivo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectRequirementToUpload(req.docTypeId)}
                          className="inline-flex items-center gap-1 bg-[#9184d9] text-white px-3 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all touch-manipulation shadow-sm"
                        >
                          <Upload className="size-3.5" /> Anexar agora
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Situação 2: Integrante sem exigência configurada para esta data */
            <div className="border border-dashed border-line p-4 rounded-xl text-center space-y-2">
              <StatusBadge status="no_requirement" label="Sem exigência configurada nesta data" />
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Você não possui documentos obrigatórios pendentes para este show. Se você tiver
                despesas para reembolso (táxi, alimentação, etc.), pode anexar o comprovante abaixo.
              </p>
            </div>
          )}

          {/* Documentos extras enviados pelo integrante que não estão nas exigências obrigatórias */}
          {memberDocuments.filter((d) => !memberRequirements.some((r) => r.docTypeId === d.docTypeId))
            .length > 0 ? (
            <div className="pt-3 border-t border-line space-y-2">
              <div className="label-mono text-xs text-muted-foreground">
                Outros comprovantes enviados por você:
              </div>
              <div className="space-y-1.5">
                {memberDocuments
                  .filter((d) => !memberRequirements.some((r) => r.docTypeId === d.docTypeId))
                  .map((d) => {
                    const docType = docTypes.find((t) => t.id === d.docTypeId);
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-accent/20 border border-line"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          <span className="font-medium">{docType?.name ?? "Documento"}</span>
                          <span className="text-muted-foreground truncate">
                            ({d.fileName ?? "arquivo"})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {formatSubmissionDate(d.createdAt)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────
          PASSO 3: FORMULÁRIO DE ANEXO E UPLOAD (FOTO OU ARQUIVO)
         ───────────────────────────────────────────────────────────────── */}
      <section ref={uploadFormRef} className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            setDoneMessage(null);
            upload.mutate();
          }}
          className="border border-line bg-card p-5 sm:p-6 rounded-2xl space-y-6 shadow-sm"
        >
          <div>
            <h2 className="label-mono font-medium text-foreground">
              {selectedMember
                ? `2 · Anexar comprovante para ${selectedMember.name}`
                : "2 · Anexar comprovante ou documento"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Selecione o tipo, anexe a foto ou PDF e envie diretamente para a produção.
            </p>
          </div>

          {/* Seleção do Tipo de Documento */}
          <div>
            <span className="label-mono text-xs">Tipo de Documento</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {docTypes.map((t) => {
                const isSelected = docTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocTypeId(t.id)}
                    className={cn(
                      "px-3 py-2 font-mono text-xs uppercase tracking-wider rounded-lg border transition-all duration-120 touch-manipulation min-h-[40px] active:scale-[0.97]",
                      isSelected
                        ? "bg-[#9184d9] text-white border-[#9184d9] font-medium shadow-sm"
                        : "border-line bg-background text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropzone / Upload de Arquivo com Validações Visuais */}
          <div>
            <span className="label-mono text-xs">Arquivo ou Foto</span>
            <label
              className={cn(
                "mt-2 grid cursor-pointer place-items-center border-2 border-dashed rounded-xl p-6 text-center select-none touch-manipulation transition-all duration-120 active:scale-[0.98]",
                file
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-line bg-background hover:bg-accent/20",
              )}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  setFormError(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
              />

              {preview ? (
                <img
                  src={preview}
                  alt="Pré-visualização do comprovante"
                  className="mb-3 max-h-48 w-auto rounded-lg border border-line object-contain shadow-sm"
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-xl bg-accent/40 border border-line text-muted-foreground mb-3">
                  <Upload className="size-6" />
                </div>
              )}

              <span
                className={cn(
                  "font-mono text-xs uppercase tracking-wider font-medium",
                  file ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                )}
              >
                {file ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="size-4" /> {file.name}
                  </span>
                ) : (
                  "Toque para escolher foto ou PDF"
                )}
              </span>

              <span className="label-mono mt-1 text-[11px] text-muted-foreground">
                {file
                  ? `(${(file.size / (1024 * 1024)).toFixed(2)} MB) · Toque para trocar`
                  : "JPG, PNG, WEBP ou PDF · até 20 MB"}
              </span>
            </label>
          </div>

          {/* Opção de Reembolso & Campo de Valor (RF-04 / TC-04.2) */}
          <div className="space-y-3 pt-2 border-t border-line">
            <label className="flex cursor-pointer items-start gap-3 p-3 rounded-xl border border-line bg-accent/10 hover:bg-accent/20 transition-colors select-none touch-manipulation">
              <input
                type="checkbox"
                checked={isReimbursement}
                onChange={(e) => setIsReimbursement(e.target.checked)}
                className="mt-0.5 size-4 accent-[#9184d9] rounded"
              />
              <span className="leading-tight">
                <span className="block text-sm font-medium text-foreground">
                  Solicitar reembolso deste item
                </span>
                <span className="label-mono mt-0.5 block normal-case text-xs text-muted-foreground">
                  Marque para que o valor seja incluído no relatório de reembolsos do show.
                </span>
              </span>
            </label>

            {isReimbursement ? (
              <div className="p-3.5 border border-[#9184d9]/30 bg-[#9184d9]/5 rounded-xl space-y-2 animate-in fade-in-50 duration-150">
                <label className="block">
                  <span className="label-mono text-xs text-foreground">Valor a reembolsar (R$)</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setFormError(null);
                      setAmount(e.target.value);
                    }}
                    placeholder="Ex.: 45,50"
                    className="mt-1.5 w-full border border-line bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-[#9184d9] rounded-lg"
                  />
                </label>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Valor auto-declarado para conferência da produção (deve ser maior que R$ 0,00).
                </p>
              </div>
            ) : null}
          </div>

          {/* Campo de Observação (Opcional) */}
          <div>
            <label className="block">
              <span className="label-mono text-xs">Observação (opcional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: voo LA3271, chegada 14:20 ou táxi aeroporto"
                className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-sm outline-none focus:border-[#9184d9] rounded-lg"
              />
            </label>
          </div>

          {/* Alertas de Erro e Sucesso */}
          {formError ? (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive text-destructive text-xs font-mono rounded-lg">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          ) : null}

          {doneMessage ? (
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-semibold text-sm">Comprovante Registrado!</div>
                <div className="text-xs font-mono mt-0.5">{doneMessage}</div>
              </div>
            </div>
          ) : null}

          {/* Botão de Envio (>= 48px Touch Target) */}
          <button
            type="submit"
            disabled={upload.isPending || !memberId || !file || !docTypeId}
            className="w-full min-h-[48px] bg-[#9184d9] text-white py-3 px-4 font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#8072c9] disabled:opacity-40 disabled:cursor-not-allowed select-none touch-manipulation active:scale-[0.98] transition-all duration-120 shadow-sm flex items-center justify-center gap-2"
          >
            {upload.isPending ? (
              <>
                <Upload className="size-4 animate-bounce" />
                <span>Enviando arquivo...</span>
              </>
            ) : (
              <>
                <Upload className="size-4" />
                <span>Enviar documento para a produção</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Rodapé Informativo */}
      <footer className="text-center pt-6 border-t border-line space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Hub Manager Tour · Sistema de Produção de Shows
        </p>
        <p className="text-xs text-muted-foreground/60">
          Seus arquivos são transmitidos com segurança e armazenados diretamente para a equipe da
          turnê.
        </p>
      </footer>
    </div>
  );
}
