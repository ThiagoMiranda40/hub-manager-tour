import { useFontSize } from "@/hooks/useFontSize";
import { cn } from "@/lib/utils";

interface FontSizeToggleProps {
  className?: string | undefined;
}

export function FontSizeToggle({ className }: FontSizeToggleProps) {
  const { level, cycleFontSize, config } = useFontSize();

  const getAriaLabel = () => {
    switch (level) {
      case "normal":
        return "Tamanho do texto: Normal (100%). Ativar tamanho Grande.";
      case "large":
        return "Tamanho do texto: Grande (115%). Ativar tamanho Extra Grande.";
      case "xlarge":
        return "Tamanho do texto: Extra Grande (130%). Ativar tamanho Normal.";
    }
  };

  const getTitle = () => {
    return `Tamanho da fonte: ${config.label} (clique para alternar)`;
  };

  return (
    <button
      type="button"
      onClick={cycleFontSize}
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-md border border-line p-1 text-muted-foreground",
        "transition-nocturne hover:text-foreground hover:bg-accent/40 touch-feedback cursor-pointer select-none",
        "min-w-[2rem] min-h-[2rem]",
        className
      )}
      title={getTitle()}
      aria-label={getAriaLabel()}
    >
      {/* Glifo tipográfico indicativo */}
      <div className="flex items-center justify-center leading-none font-bold">
        <span
          className={cn(
            "transition-all duration-180 font-mono text-xs",
            level !== "normal" ? "text-primary" : "text-foreground"
          )}
        >
          A
        </span>
        {level === "large" && (
          <span className="font-mono text-[0.625rem] text-primary leading-none ml-0.5 font-bold">
            +
          </span>
        )}
        {level === "xlarge" && (
          <span className="font-mono text-[0.5625rem] text-primary leading-none ml-0.5 font-bold">
            ++
          </span>
        )}
      </div>

      {/* Micro-régua indicadora de 3 níveis */}
      <div className="flex items-center gap-[2.5px] mt-0.5" aria-hidden="true">
        <span
          className={cn(
            "size-[3px] rounded-full transition-colors duration-180",
            level === "normal"
              ? "bg-foreground/70"
              : "bg-primary shadow-[0_0_4px_rgba(145,132,217,0.5)]"
          )}
        />
        <span
          className={cn(
            "size-[3px] rounded-full transition-colors duration-180",
            level === "large" || level === "xlarge"
              ? "bg-primary shadow-[0_0_4px_rgba(145,132,217,0.5)]"
              : "bg-muted-foreground/30"
          )}
        />
        <span
          className={cn(
            "size-[3px] rounded-full transition-colors duration-180",
            level === "xlarge"
              ? "bg-primary shadow-[0_0_4px_rgba(145,132,217,0.5)]"
              : "bg-muted-foreground/30"
          )}
        />
      </div>
    </button>
  );
}
