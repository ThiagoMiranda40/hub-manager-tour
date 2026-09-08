import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-line p-2 text-muted-foreground",
        "transition-nocturne hover:text-foreground hover:bg-accent/40 touch-feedback cursor-pointer",
        className
      )}
      title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-300 transition-transform duration-180" />
      ) : (
        <Moon className="h-4 w-4 text-primary transition-transform duration-180" />
      )}
    </button>
  );
}
