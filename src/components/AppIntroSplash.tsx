import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SPLASH_SESSION_KEY = "hmt_intro_splash_seen";

export function AppIntroSplash() {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return !sessionStorage.getItem(SPLASH_SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!showSplash) return;

    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // Ignora restrições em navegadores com storage bloqueado
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Se preferir movimento reduzido: pula o delay de 800ms e faz transição breve
    const displayDuration = prefersReducedMotion ? 120 : 750;
    const fadeDuration = prefersReducedMotion ? 100 : 250;

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, displayDuration);

    const removeTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, displayDuration + fadeDuration);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [showSplash]);

  if (!showSplash) return null;

  return (
    <div
      role="status"
      aria-label="Carregando Hub Manager Tour"
      className={cn(
        "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background select-none transition-opacity duration-250 ease-out",
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
    >
      <style>{`
        .eq-bar {
          transform-box: fill-box;
          transform-origin: center;
        }
        .eq-bar-1 { animation: eq-pulse-1 0.70s ease-in-out infinite alternate; }
        .eq-bar-2 { animation: eq-pulse-2 0.60s ease-in-out infinite alternate; }
        .eq-bar-3 { animation: eq-pulse-3 0.80s ease-in-out infinite alternate; }
        .eq-bar-4 { animation: eq-pulse-4 0.65s ease-in-out infinite alternate; }
        .eq-bar-5 { animation: eq-pulse-5 0.55s ease-in-out infinite alternate; }
        .eq-bar-6 { animation: eq-pulse-6 0.75s ease-in-out infinite alternate; }

        @keyframes eq-pulse-1 {
          0% { transform: scaleY(0.45); }
          100% { transform: scaleY(1.9); }
        }
        @keyframes eq-pulse-2 {
          0% { transform: scaleY(1.25); }
          100% { transform: scaleY(0.4); }
        }
        @keyframes eq-pulse-3 {
          0% { transform: scaleY(0.8); }
          100% { transform: scaleY(1.15); }
        }
        @keyframes eq-pulse-4 {
          0% { transform: scaleY(0.45); }
          100% { transform: scaleY(1.45); }
        }
        @keyframes eq-pulse-5 {
          0% { transform: scaleY(1.3); }
          100% { transform: scaleY(0.5); }
        }
        @keyframes eq-pulse-6 {
          0% { transform: scaleY(0.6); }
          100% { transform: scaleY(2.2); }
        }

        @media (prefers-reduced-motion: reduce) {
          .eq-bar {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Ícone de Onda Sonora Animado (Equalizador) */}
      <div className="flex flex-col items-center gap-3">
        <svg
          viewBox="0 0 64 44"
          className="w-16 h-11 text-primary overflow-visible"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect className="eq-bar eq-bar-1" x="2" y="18" width="6" height="8" rx="3" />
          <rect className="eq-bar eq-bar-2" x="13" y="10" width="6" height="24" rx="3" />
          <rect className="eq-bar eq-bar-3" x="24" y="2" width="6" height="40" rx="3" />
          <rect className="eq-bar eq-bar-4" x="35" y="12" width="6" height="20" rx="3" />
          <rect className="eq-bar eq-bar-5" x="46" y="16" width="6" height="12" rx="3" />
          <rect className="eq-bar eq-bar-6" x="57" y="19" width="5" height="6" rx="2.5" />
        </svg>

        <span className="text-[0.6875rem] font-mono tracking-widest text-muted-foreground uppercase select-none">
          Hub Manager Tour
        </span>
      </div>
    </div>
  );
}
