import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  
  // Prioridade 1: Preferência explícita salva em localStorage
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch (_) {
    // localStorage indisponível ou bloqueado
  }

  // Prioridade 2: Classe já aplicada no DOM (ex.: pelo script em head)
  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  // Prioridade 3: prefers-color-scheme do navegador/sistema
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch (_) {
    // matchMedia indisponível
  }

  return "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const applyTheme = useCallback((newTheme: Theme, persist = true) => {
    const validTheme: Theme = newTheme === "dark" ? "dark" : "light";
    setThemeState(validTheme);
    if (typeof window !== "undefined") {
      if (persist) {
        try {
          localStorage.setItem("theme", validTheme);
        } catch (_) {}
      }
      if (validTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      window.dispatchEvent(new CustomEvent("hub-theme-changed", { detail: validTheme }));
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark", true);
  }, [theme, applyTheme]);

  useEffect(() => {
    // Garante sincronização imediata no cliente pós-hidratação
    const currentTheme = getInitialTheme();
    setThemeState(currentTheme);
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Ouvir alterações no prefers-color-scheme do sistema operacional
    let mediaQuery: MediaQueryList | null = null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem("theme");
        if (!stored) {
          applyTheme(e.matches ? "dark" : "light", false);
        }
      } catch (_) {}
    };

    try {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleMediaChange);
    } catch (_) {}

    // Sincronizar instâncias simultâneas na mesma página
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (
        customEvent.detail &&
        (customEvent.detail === "dark" || customEvent.detail === "light") &&
        customEvent.detail !== theme
      ) {
        setThemeState(customEvent.detail);
      }
    };

    // Sincronizar entre diferentes abas do navegador
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
        applyTheme(e.newValue, false);
      }
    };

    window.addEventListener("hub-theme-changed", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery?.removeEventListener("change", handleMediaChange);
      window.removeEventListener("hub-theme-changed", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [theme, applyTheme]);

  return {
    theme,
    isDark: theme === "dark",
    setTheme: applyTheme,
    toggleTheme,
  };
}
