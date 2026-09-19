import { useEffect, useState, useCallback } from "react";

export type FontSizeLevel = "normal" | "large" | "xlarge";

const STORAGE_KEY = "hub_font_size";
const CHANGE_EVENT = "hub-font-size-change";

export const FONT_SIZE_CONFIG: Record<
  FontSizeLevel,
  {
    percentage: string;
    label: string;
    nextLevel: FontSizeLevel;
    dots: number; // 1, 2 ou 3
  }
> = {
  normal: {
    percentage: "100%",
    label: "Normal (100%)",
    nextLevel: "large",
    dots: 1,
  },
  large: {
    percentage: "115%",
    label: "Grande (115%)",
    nextLevel: "xlarge",
    dots: 2,
  },
  xlarge: {
    percentage: "130%",
    label: "Extra Grande (130%)",
    nextLevel: "normal",
    dots: 3,
  },
};

export function getInitialFontSize(): FontSizeLevel {
  if (typeof window === "undefined") return "normal";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "large" || stored === "xlarge" || stored === "normal") {
      return stored;
    }
  } catch (_) {
    // localStorage indisponível
  }

  // Fallback para atributo já existente no DOM
  try {
    if (
      typeof document !== "undefined" &&
      document.documentElement &&
      typeof document.documentElement.getAttribute === "function"
    ) {
      const domAttr = document.documentElement.getAttribute("data-font-size");
      if (domAttr === "large" || domAttr === "xlarge" || domAttr === "normal") {
        return domAttr;
      }
    }
  } catch (_) {}

  return "normal";
}

export function applyFontSizeToDOM(level: FontSizeLevel) {
  if (typeof document === "undefined" || !document.documentElement) return;

  try {
    const root = document.documentElement;
    if (typeof root.setAttribute === "function") {
      root.setAttribute("data-font-size", level);
    }

    if (root.style) {
      if (level === "normal") {
        root.style.fontSize = "";
      } else {
        root.style.fontSize = FONT_SIZE_CONFIG[level].percentage;
      }
    }
  } catch (_) {}
}

export function useFontSize() {
  const [level, setLevelState] = useState<FontSizeLevel>(getInitialFontSize);

  const setLevel = useCallback((newLevel: FontSizeLevel, persist = true) => {
    setLevelState(newLevel);
    applyFontSizeToDOM(newLevel);

    if (persist && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLevel);
      } catch (_) {}

      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  const cycleFontSize = useCallback(() => {
    const next = FONT_SIZE_CONFIG[level].nextLevel;
    setLevel(next);
  }, [level, setLevel]);

  useEffect(() => {
    // Sincroniza estado inicial com DOM ao montar
    const current = getInitialFontSize();
    setLevelState(current);
    applyFontSizeToDOM(current);

    const handleCustomChange = () => {
      const updated = getInitialFontSize();
      setLevelState(updated);
      applyFontSizeToDOM(updated);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (
          e.newValue === "normal" ||
          e.newValue === "large" ||
          e.newValue === "xlarge"
        ) {
          setLevelState(e.newValue);
          applyFontSizeToDOM(e.newValue);
        }
      }
    };

    window.addEventListener(CHANGE_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    level,
    setLevel,
    cycleFontSize,
    config: FONT_SIZE_CONFIG[level],
  };
}
