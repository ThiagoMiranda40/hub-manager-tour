import { useEffect } from "react";

export const CHATBASE_ENABLED = true;
export const CHATBASE_AGENT_ID = "_m6CWyhPFo4Ep7Yuc1-g0";
export const CHATBASE_EMBED_SRC = "https://www.chatbase.co/embed.min.js";
export const CHATBASE_DOMAIN = "www.chatbase.co";

let isInstalled = false;

export function resetChatbaseInstalledForTesting(): void {
  isInstalled = false;
}

export function installChatbase(
  win: any = typeof window !== "undefined" ? window : undefined,
  doc: any = typeof document !== "undefined" ? document : undefined,
  enabled: boolean = CHATBASE_ENABLED,
): void {
  if (!enabled || !win || !doc) return;
  if (isInstalled) return;

  // Se o script já existe no documento ou está com instalação pendente, marca instalado e não duplica
  if (
    (typeof doc.getElementById === "function" && doc.getElementById(CHATBASE_AGENT_ID)) ||
    (doc as any).__chatbase_installing
  ) {
    isInstalled = true;
    return;
  }

  isInstalled = true;

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
    script.domain = CHATBASE_DOMAIN; // atribuição de propriedade, como no script oficial
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

export function resetChatbaseConversation(
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  if (win && typeof win.chatbase === "function") {
    try {
      win.chatbase("resetChat");
    } catch {
      // silencioso se ocorrer erro
    }
  }
}

export function useChatbaseWidget(): void {
  useEffect(() => {
    installChatbase();
  }, []);
}
