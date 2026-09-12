import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Upload,
  AlertTriangle,
  Check,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getPublicShow, submitDocument } from "@/lib/public-show.functions";
import { analyzeDocumentWithAI } from "@/lib/ai-extraction.functions";
import { resizeFileForAI, type ReceiptAnalysisResult } from "@/lib/ai-extraction";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  formatShowDate,
  initials,
  parseReimbursementAmount,
} from "@/lib/g3";

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
      { property: "og:image:alt", content: "Hub Manager Tour — Checklist do Integrante" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://hubmanagertour.triadetecnologiaesolucoes.com.br/og-image-v2.png",
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
  const analyzeAI = useServerFn(analyzeDocumentWithAI);

  const uploadFormRef = useRef<HTMLDivElement>(null);

  const [docTypeId, setDocTypeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [isReimbursement, setIsReimbursement] = useState(false);

  // Estados da análise inteligente por IA (Gemini 2.5 Flash)
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ReceiptAnalysisResult | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);

  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-show", token],
    queryFn: () => fetchShow({ data: { token } }),
  });

  const docTypes = useMemo(() => data?.docTypes ?? [], [data?.docTypes]);
  const requirements = useMemo(() => data?.requirements ?? [], [data?.requirements]);
  const documents = useMemo(() => data?.documents ?? [], [data?.documents]);
  const member = data?.member ?? null;

  const selectedType = useMemo(
    () => docTypes.find((t) => t.id === docTypeId) ?? null,
    [docTypes, docTypeId],
  );

  // Documentos e exigências específicos deste integrante (já isolados no servidor)
  const memberRequirements = useMemo(() => {
    return requirements.filter((r) => r.required !== false);
  }, [requirements]);

  const memberDocuments = useMemo(() => {
    return documents;
  }, [documents]);

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

  // Análise com IA no momento da seleção do arquivo (RF-10 / Adendo 11/09/2026)
  async function handleFileChange(selectedFile: File | null) {
    setFormError(null);
    setDoneMessage(null);
    setAiSuggestion(null);
    setAiDismissed(false);
    setFile(selectedFile);

    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) return;

    try {
      setIsAnalyzingAI(true);
      const { base64, mimeType } = await resizeFileForAI(selectedFile);

      const res = await analyzeAI({
        data: {
          token,
          fileBase64: base64,
          mimeType,
        },
      });

      if (res.success && res.data) {
        setAiSuggestion(res.data);
      } else if (res.rateLimited) {
        // Fallback silencioso conforme RF-10: não exibe erro, segue normalmente no preenchimento manual
        console.info("[AI Extraction] Rate limit de 15 análises atingido; usando formulário manual.");
      } else {
        console.warn("[AI Extraction] Falha ao analisar documento:", res.error);
        toast.info(res.error || "Não foi possível analisar o documento automaticamente. Preencha manualmente.");
      }
    } catch (err) {
      console.warn("[AI Extraction] Falha silenciosa na análise com IA:", err);
      toast.info("Não foi possível analisar o documento automaticamente. Preencha manualmente.");
    } finally {
      setIsAnalyzingAI(false);
    }
  }

  // Aplicação interativa das sugestões da IA com confirmação prévia
  function applyAiSuggestions(suggestion: ReceiptAnalysisResult) {
    if (suggestion.docTypeId) {
      setDocTypeId(suggestion.docTypeId);
    }
    setIsReimbursement(suggestion.isReimbursement);
    if (suggestion.amount !== null && suggestion.amount > 0) {
      setAmount(suggestion.amount.toFixed(2).replace(".", ","));
    }
    if (suggestion.note) {
      setNote(suggestion.note);
    }
    setAiDismissed(true);
    toast.success("Sugestões da IA aplicadas! Revise antes de enviar.");
  }

  // Mutação de upload com validações de BVA (tamanho e valor de reembolso)
  const upload = useMutation({
    mutationFn: async () => {
      if (!data || !file) throw new Error("Selecione um arquivo para enviar.");
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
        parsedAmount = parseReimbursementAmount(amount);
      }

      // Upload do arquivo no bucket do Supabase Storage
      const path = `${data.show.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
      if (upErr) {
        throw new Error(`Falha no upload do arquivo: ${upErr.message}`);
      }

      // Registro seguro do documento via Server Function (o servidor resolve o integrante exclusivamente pelo token)
      await send({
        data: {
          token,
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
      const memberName = member?.name ?? "Integrante";

      setDoneMessage(`${typeName} de ${memberName} enviado com sucesso!`);
      setFile(null);
      setNote("");
      setAmount("");
      setFormError(null);
      setAiSuggestion(null);
      setAiDismissed(false);

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
  if (!data || !data.show || !data.member) {
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
            Não foi possível encontrar este acesso. Verifique se o endereço foi copiado por completo ou
            solicite um novo link à produção da turnê.
          </p>
          <div className="mt-6 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
            Hub Manager Tour · Acesso de Elenco
          </div>
        </div>
      </div>
    );
  }

  const { show, member: activeMember } = data;

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

        {/* Identificação direta do Integrante (RF-04 com Token Individual) */}
        <div className="mt-4 flex items-center gap-3 p-3.5 rounded-xl border border-[#9184d9]/30 bg-[#9184d9]/5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#9184d9] text-white font-mono text-sm font-semibold">
            {initials(activeMember.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#9184d9] font-semibold">
              Checklist Pessoal
            </div>
            <div className="text-sm font-semibold truncate text-foreground">
              {activeMember.name}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {activeMember.role}
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Confira abaixo os documentos solicitados pela produção para este show e envie seus arquivos pendentes.
        </p>
      </header>

      {/* ─────────────────────────────────────────────────────────────────
          PASSO 1: CHECKLIST PESSOAL DINÂMICA (RF-04)
         ───────────────────────────────────────────────────────────────── */}
      <section className="border border-line bg-card p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#9184d9]" />
              <h2 className="font-semibold text-sm sm:text-base text-foreground">
                1 · Checklist de {activeMember.name}
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

      {/* ─────────────────────────────────────────────────────────────────
          PASSO 2: FORMULÁRIO DE ANEXO E UPLOAD (FOTO OU ARQUIVO)
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
              {`2 · Anexar comprovante para ${activeMember.name}`}
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
                  handleFileChange(e.target.files?.[0] ?? null);
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

            {/* Estado de Carregamento da IA com opção de pular */}
            {isAnalyzingAI ? (
              <div className="mt-3 border border-[#9184d9]/40 bg-[#9184d9]/5 p-4 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="size-4 text-[#9184d9] animate-spin" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Analisando comprovante com IA (Gemini)...
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Identificando tipo de documento, despesas e valores.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnalyzingAI(false)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 touch-manipulation"
                >
                  Pular
                </button>
              </div>
            ) : null}

            {/* Card de Sugestão Inteligente (RF-10 / Adendo 11/09/2026) */}
            {aiSuggestion && !aiDismissed ? (
              <div className="mt-3 border border-[#9184d9]/40 bg-[#9184d9]/10 p-4 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-4 text-[#9184d9]" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#9184d9] dark:text-[#b4a9f0]">
                      Sugestão Inteligente (Gemini)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#9184d9]/20 text-[#9184d9] dark:text-[#b4a9f0]">
                      {Math.round(aiSuggestion.confidence * 100)}% confiança
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiDismissed(true)}
                    className="text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/40 touch-manipulation"
                    title="Dispensar sugestão"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Alerta de moeda não-BRL (RF-10 / Adendo 11/09/2026) */}
                {!aiSuggestion.isBrl ? (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Atenção para a moeda detectada:</p>
                      <p className="text-[11px] mt-0.5">{aiSuggestion.currencyWarning}</p>
                    </div>
                  </div>
                ) : null}

                {/* Alerta de Reembolso sem valor legível (RF-10 / Adendo 11/09/2026) */}
                {aiSuggestion.isReimbursement && aiSuggestion.amount === null ? (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Comprovante de reembolso sem valor identificado:</p>
                      <p className="text-[11px] mt-0.5">
                        Não foi possível ler o valor com precisão no documento. Por favor, digite o valor no campo abaixo.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Comparação lado a lado (Atual vs Sugerido) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-background/80 border border-line space-y-1">
                    <span className="label-mono text-[10px] text-muted-foreground block">Tipo de Documento</span>
                    <p className="font-medium text-foreground">
                      {aiSuggestion.docTypeName ?? "Não identificado"}
                    </p>
                    {aiSuggestion.docTypeId && docTypeId !== aiSuggestion.docTypeId ? (
                      <button
                        type="button"
                        onClick={() => setDocTypeId(aiSuggestion.docTypeId!)}
                        className="text-[11px] font-mono text-[#9184d9] hover:underline touch-manipulation"
                      >
                        Aplicar este tipo
                      </button>
                    ) : null}
                  </div>

                  <div className="p-2.5 rounded-lg bg-background/80 border border-line space-y-1">
                    <span className="label-mono text-[10px] text-muted-foreground block">
                      {aiSuggestion.isReimbursement ? "Reembolso e Valor" : "Finalidade"}
                    </span>
                    <p className="font-medium text-foreground">
                      {aiSuggestion.isReimbursement
                        ? aiSuggestion.amount !== null
                          ? `Reembolso · R$ ${aiSuggestion.amount.toFixed(2).replace(".", ",")}`
                          : "Reembolso · Valor manual necessário"
                        : "Documento de turnê (sem reembolso)"}
                    </p>
                    {aiSuggestion.note ? (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {aiSuggestion.note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#9184d9]/20">
                  <span className="text-[11px] text-muted-foreground">
                    Revise as sugestões antes de confirmar o envio.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAiDismissed(true)}
                      className="px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground rounded-lg border border-line hover:bg-background transition-colors touch-manipulation"
                    >
                      Dispensar
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestions(aiSuggestion)}
                      className="inline-flex items-center gap-1.5 bg-[#9184d9] text-white px-3 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#8072c9] active:scale-[0.97] transition-all touch-manipulation shadow-sm"
                    >
                      <Check className="size-3.5" /> Aplicar Sugestões
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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
            disabled={upload.isPending || !file || !docTypeId}
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
