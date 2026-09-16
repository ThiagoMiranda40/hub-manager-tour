import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "confirmado"
  | "confirmed"
  | "pendente"
  | "pending"
  | "excecao"
  | "exception"
  | "sem_exigencia"
  | "no_requirement";

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: "sm" | "default";
}

/**
 * StatusBadge — Componente acessível (WCAG 2.2 AA) cobrindo os 4 estados do Módulo 1:
 * - Confirmado (Verde)
 * - Pendente (Âmbar/Amarelo)
 * - Exceção (Roxo/Alerta)
 * - Sem exigência configurada (Itálico suave sem badge colorido, inconfundível com pendente)
 */
export function StatusBadge({
  status,
  label,
  className,
  size = "default",
}: StatusBadgeProps) {
  const isSm = size === "sm";

  switch (status) {
    case "confirmado":
    case "confirmed":
      return (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
            className,
          )}
        >
          <CheckCircle2
            className={cn(isSm ? "size-3" : "size-3.5", "shrink-0 text-emerald-600 dark:text-emerald-400")}
            aria-hidden="true"
          />
          <span>{label ?? "Confirmado"}</span>
        </span>
      );

    case "pendente":
    case "pending":
      return (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
            className,
          )}
        >
          <Clock
            className={cn(isSm ? "size-3" : "size-3.5", "shrink-0 text-amber-700 dark:text-amber-300")}
            aria-hidden="true"
          />
          <span>{label ?? "Pendente"}</span>
        </span>
      );

    case "excecao":
    case "exception":
      return (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-500/15 text-purple-900 dark:text-purple-300 border border-purple-500/30",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
            className,
          )}
        >
          <AlertTriangle
            className={cn(isSm ? "size-3" : "size-3.5", "shrink-0 text-purple-700 dark:text-purple-300")}
            aria-hidden="true"
          />
          <span>{label ?? "Exceção"}</span>
        </span>
      );

    case "sem_exigencia":
    case "no_requirement":
    default:
      return (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground italic select-none",
            isSm ? "text-[11px]" : "text-xs",
            className,
          )}
        >
          <Minus className="size-3 opacity-60 shrink-0" aria-hidden="true" />
          <span>{label ?? "Sem exigência configurada"}</span>
        </span>
      );
  }
}
