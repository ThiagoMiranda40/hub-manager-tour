import { PanelLeft, PanelTop } from "lucide-react";
import { useNavigationMode } from "@/hooks/useNavigationMode";
import { cn } from "@/lib/utils";

interface NavModeToggleProps {
  className?: string | undefined;
}

export function NavModeToggle({ className }: NavModeToggleProps) {
  const { isSidebar, setMode } = useNavigationMode();

  const handleToggle = () => {
    setMode(isSidebar ? "header" : "sidebar");
  };

  const title = isSidebar
    ? "Alternar para cabeçalho superior"
    : "Alternar para barra lateral";

  const ariaLabel = isSidebar
    ? "Ativar navegação por cabeçalho superior"
    : "Ativar navegação por barra lateral";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-line p-2 text-muted-foreground",
        "transition-nocturne hover:text-foreground hover:bg-accent/40 touch-feedback cursor-pointer",
        className
      )}
      title={title}
      aria-label={ariaLabel}
    >
      {isSidebar ? (
        <PanelTop className="h-4 w-4 text-primary transition-transform duration-180" />
      ) : (
        <PanelLeft className="h-4 w-4 text-primary transition-transform duration-180" />
      )}
    </button>
  );
}
