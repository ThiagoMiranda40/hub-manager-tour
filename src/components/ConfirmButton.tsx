import { useEffect, useRef, useState } from "react";

/**
 * Botão de exclusão com confirmação leve: o primeiro clique troca o rótulo para
 * "Confirmar exclusão?" por alguns segundos; o segundo clique executa a ação.
 */
export function ConfirmButton({
  onConfirm,
  label = "Excluir",
  confirmLabel = "Confirmar exclusão?",
  className = "",
  confirmClassName = "",
  disabled,
  title,
  timeoutMs = 4000,
  defaultArmed = false,
}: {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  className?: string;
  confirmClassName?: string;
  disabled?: boolean;
  title?: string;
  timeoutMs?: number;
  defaultArmed?: boolean;
}) {
  const [armed, setArmed] = useState(defaultArmed);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const currentTitle = armed
    ? "Clique novamente para confirmar. A confirmação expira em alguns segundos."
    : (title ?? "Clique para excluir. Será pedida uma segunda confirmação.");

  return (
    <button
      type="button"
      title={currentTitle}
      disabled={disabled}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), timeoutMs);
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        setArmed(false);
        onConfirm();
      }}
      className={`${armed ? confirmClassName || className : className} transition-all duration-120 active:scale-[0.97] touch-manipulation select-none`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
