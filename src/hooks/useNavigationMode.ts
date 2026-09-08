import { useState, useEffect, useCallback } from "react";

export type NavigationMode = "header" | "sidebar";

export function getInitialNavigationMode(): NavigationMode {
  if (typeof window === "undefined") return "header";
  try {
    const stored = localStorage.getItem("navigation_mode");
    if (stored === "sidebar" || stored === "header") {
      return stored;
    }
  } catch (_) {}
  return "header";
}

export function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (_) {}
  return false;
}

export function useNavigationMode() {
  const [mode, setModeState] = useState<NavigationMode>(getInitialNavigationMode);
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(getInitialSidebarCollapsed);

  const setMode = useCallback((newMode: NavigationMode) => {
    const validMode: NavigationMode = newMode === "sidebar" ? "sidebar" : "header";
    setModeState(validMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("navigation_mode", validMode);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("hub-nav-mode-changed", { detail: validMode }));
    }
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sidebar_collapsed", String(collapsed));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("hub-sidebar-collapse-changed", { detail: collapsed }));
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  useEffect(() => {
    // Sincroniza estado pós-hidratação no cliente
    setModeState(getInitialNavigationMode());
    setIsCollapsedState(getInitialSidebarCollapsed());

    const handleModeCustom = (e: Event) => {
      const customEvent = e as CustomEvent<NavigationMode>;
      if (
        customEvent.detail &&
        (customEvent.detail === "header" || customEvent.detail === "sidebar")
      ) {
        setModeState(customEvent.detail);
      }
    };

    const handleCollapseCustom = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setIsCollapsedState(customEvent.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "navigation_mode" && (e.newValue === "header" || e.newValue === "sidebar")) {
        setModeState(e.newValue);
      }
      if (e.key === "sidebar_collapsed") {
        setIsCollapsedState(e.newValue === "true");
      }
    };

    window.addEventListener("hub-nav-mode-changed", handleModeCustom);
    window.addEventListener("hub-sidebar-collapse-changed", handleCollapseCustom);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("hub-nav-mode-changed", handleModeCustom);
      window.removeEventListener("hub-sidebar-collapse-changed", handleCollapseCustom);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    mode,
    isSidebar: mode === "sidebar",
    isHeader: mode === "header",
    setMode,
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed,
  };
}
