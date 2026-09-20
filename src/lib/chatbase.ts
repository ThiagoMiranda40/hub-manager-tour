import { useEffect } from "react";

export const CHATBASE_ENABLED = true;
export const CHATBASE_AGENT_ID = "_m6CWyhPFo4Ep7Yuc1-g0";
export const CHATBASE_EMBED_SRC = "https://www.chatbase.co/embed.min.js";
export const CHATBASE_DOMAIN = "www.chatbase.co";

let chatbaseEnabled = CHATBASE_ENABLED;
let refCount = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
const DEFAULT_RELEASE_DELAY_MS = 1000;

export function setChatbaseEnabledForTesting(val: boolean): void {
  chatbaseEnabled = val;
}

export function getChatbaseRefCountForTesting(): number {
  return refCount;
}

export function resetChatbaseStateForTesting(): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  refCount = 0;
  chatbaseEnabled = CHATBASE_ENABLED;
}

export function installChatbase(
  win: any = typeof window !== "undefined" ? window : undefined,
  doc: any = typeof document !== "undefined" ? document : undefined,
  enabled: boolean = chatbaseEnabled,
): void {
  if (!enabled || !win || !doc) return;

  // Idempotência: se o script já existe no documento ou está com instalação pendente, não duplica
  if (
    (typeof doc.getElementById === "function" && doc.getElementById(CHATBASE_AGENT_ID)) ||
    (doc as any).__chatbase_installing
  ) {
    return;
  }

  // Fila window.chatbase com Proxy (reprodução fiel da lógica do script oficial do Chatbase)
  if (
    !win.chatbase ||
    (typeof win.chatbase === "function" && win.chatbase("getState") !== "initialized")
  ) {
    const chatbaseFn: any = (...args: any[]) => {
      if (!chatbaseFn.q) {
        chatbaseFn.q = [];
      }
      chatbaseFn.q.push(args);
    };
    chatbaseFn.q = [];
    win.chatbase = new Proxy(chatbaseFn, {
      get(target: any, prop: string | symbol) {
        if (prop === "q") {
          return target.q;
        }
        return (...args: any[]) => target(prop, ...args);
      },
    });
  }

  const injectScript = () => {
    delete (doc as any).__chatbase_installing;
    if (typeof doc.getElementById === "function" && doc.getElementById(CHATBASE_AGENT_ID)) {
      return;
    }
    if (typeof doc.createElement !== "function") {
      return;
    }
    const script = doc.createElement("script");
    script.src = CHATBASE_EMBED_SRC;
    script.id = CHATBASE_AGENT_ID;
    script.domain = CHATBASE_DOMAIN; // atribuição de propriedade, exatamente como no script oficial
    if (doc.body && typeof doc.body.appendChild === "function") {
      doc.body.appendChild(script);
    }
  };

  if (doc.readyState === "complete") {
    injectScript();
  } else {
    (doc as any).__chatbase_installing = true;
    if (typeof win.addEventListener === "function") {
      win.addEventListener("load", injectScript, { once: true });
    }
  }
}

export function removeChatbase(
  win: any = typeof window !== "undefined" ? window : undefined,
  doc: any = typeof document !== "undefined" ? document : undefined,
): void {
  if (win && typeof win.chatbase === "function") {
    try {
      win.chatbase("resetChat");
    } catch {
      // silencioso
    }
  }

  if (doc) {
    delete (doc as any).__chatbase_installing;

    // Remove o script pelo id
    try {
      const script = doc.getElementById ? doc.getElementById(CHATBASE_AGENT_ID) : null;
      if (script) {
        if (typeof script.remove === "function") {
          script.remove();
        } else if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }
    } catch {
      // silencioso
    }

    // Remove do documento os elementos cujo id comece com "chatbase"
    try {
      if (doc.querySelectorAll) {
        const elements = doc.querySelectorAll('[id^="chatbase"]');
        if (elements && typeof elements.forEach === "function") {
          elements.forEach((el: any) => {
            try {
              if (typeof el.remove === "function") {
                el.remove();
              } else if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
            } catch {
              // silencioso
            }
          });
        }
      }
    } catch {
      // silencioso
    }
  }

  // Apaga win.chatbase
  if (win) {
    try {
      delete win.chatbase;
    } catch {
      try {
        win.chatbase = undefined;
      } catch {
        // silencioso
      }
    }
  }
}

export function acquireChatbase(
  win: any = typeof window !== "undefined" ? window : undefined,
  doc: any = typeof document !== "undefined" ? document : undefined,
): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  refCount++;
  installChatbase(win, doc);
}

export function releaseChatbase(
  win: any = typeof window !== "undefined" ? window : undefined,
  doc: any = typeof document !== "undefined" ? document : undefined,
  delayMs: number = DEFAULT_RELEASE_DELAY_MS,
): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    if (releaseTimer) {
      clearTimeout(releaseTimer);
    }
    releaseTimer = setTimeout(() => {
      if (refCount === 0) {
        removeChatbase(win, doc);
      }
      releaseTimer = null;
    }, delayMs);
  }
}

export function useChatbaseWidget(): void {
  useEffect(() => {
    acquireChatbase();
    return () => {
      releaseChatbase();
    };
  }, []);
}
