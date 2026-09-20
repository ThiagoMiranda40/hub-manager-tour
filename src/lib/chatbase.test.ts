import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CHATBASE_AGENT_ID,
  CHATBASE_DOMAIN,
  CHATBASE_EMBED_SRC,
  CHATBASE_ENABLED,
  installChatbase,
  removeChatbase,
  acquireChatbase,
  releaseChatbase,
  resetChatbaseStateForTesting,
  setChatbaseEnabledForTesting,
} from "./chatbase";

function createMockDom({ readyState = "complete" }: { readyState?: string } = {}) {
  const listeners: Record<string, Array<{ handler: Function; options?: any }>> = {};
  const elementsById = new Map<string, any>();
  const bodyChildren: any[] = [];

  const doc: any = {
    readyState,
    body: {
      appendChild(child: any) {
        bodyChildren.push(child);
        if (child.id) {
          elementsById.set(child.id, child);
        }
        child.parentNode = doc.body;
      },
      removeChild(child: any) {
        const index = bodyChildren.indexOf(child);
        if (index > -1) {
          bodyChildren.splice(index, 1);
        }
        if (child.id) {
          elementsById.delete(child.id);
        }
        child.parentNode = null;
      },
    },
    createElement(tag: string) {
      const el: any = {
        tagName: tag.toUpperCase(),
        parentNode: null,
        remove() {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        },
      };
      return el;
    },
    getElementById(id: string) {
      return elementsById.get(id) ?? null;
    },
    querySelectorAll(selector: string) {
      if (selector === '[id^="chatbase"]') {
        const result: any[] = [];
        for (const [id, el] of elementsById.entries()) {
          if (id.startsWith("chatbase")) {
            result.push(el);
          }
        }
        return result;
      }
      return [];
    },
  };

  const win: any = {
    addEventListener(event: string, handler: Function, options?: any) {
      listeners[event] = listeners[event] || [];
      listeners[event].push({ handler, options });
    },
    trigger(event: string) {
      if (listeners[event]) {
        const list = [...listeners[event]];
        listeners[event] = list.filter((item) => !item.options?.once);
        list.forEach((item) => item.handler());
      }
    },
  };

  return { win, doc, elementsById, bodyChildren };
}

describe("Chatbase Widget Module (src/lib/chatbase.ts)", () => {
  beforeEach(() => {
    resetChatbaseStateForTesting();
  });

  afterEach(() => {
    resetChatbaseStateForTesting();
  });

  it("T1 install injeta exatamente 1 script com src, id e domain corretos", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc);

    expect(bodyChildren.length).toBe(1);
    const script = bodyChildren[0];
    expect(script.src).toBe(CHATBASE_EMBED_SRC);
    expect(script.id).toBe(CHATBASE_AGENT_ID);
    expect(script.domain).toBe(CHATBASE_DOMAIN);

    // Verifica que window.chatbase foi configurado com Proxy e fila q
    expect(typeof win.chatbase).toBe("function");
    expect(win.chatbase.q).toBeDefined();

    win.chatbase("customAction", { key: "value" });
    expect(win.chatbase.q.length).toBe(1);
    expect(win.chatbase.q[0]).toEqual(["customAction", { key: "value" }]);
  });

  it("T2 chamar duas vezes não duplica", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc);
    installChatbase(win, doc);

    expect(bodyChildren.length).toBe(1);
  });

  it("T3 CHATBASE_DOMAIN === 'www.chatbase.co' e não contém '[', ']', '(', ')' nem 'http'", () => {
    expect(CHATBASE_DOMAIN).toBe("www.chatbase.co");
    expect(CHATBASE_DOMAIN).not.toMatch(/[\[\]\(\)]/);
    expect(CHATBASE_DOMAIN).not.toContain("http");
  });

  it("T4 com readyState != 'complete' espera o 'load'", () => {
    const { win, doc, bodyChildren } = createMockDom({ readyState: "loading" });

    installChatbase(win, doc);

    // Ainda não deve ter injetado enquanto loading
    expect(bodyChildren.length).toBe(0);

    // Dispara o evento load na janela
    win.trigger("load");

    expect(bodyChildren.length).toBe(1);
    expect(bodyChildren[0].id).toBe(CHATBASE_AGENT_ID);
  });

  it("T5 remove tira script e elementos 'chatbase*', apaga window.chatbase, chama resetChat quando existe e não lança quando não existe", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc);

    // Adiciona elementos extras com prefixo chatbase
    const bubble = doc.createElement("div");
    bubble.id = "chatbase-bubble";
    doc.body.appendChild(bubble);

    const frame = doc.createElement("iframe");
    frame.id = "chatbase-message-container";
    doc.body.appendChild(frame);

    expect(bodyChildren.length).toBe(3);

    let resetChatCalled = false;
    win.chatbase = vi.fn((cmd: string) => {
      if (cmd === "resetChat") resetChatCalled = true;
    });

    removeChatbase(win, doc);

    expect(resetChatCalled).toBe(true);
    expect(doc.getElementById(CHATBASE_AGENT_ID)).toBeNull();
    expect(doc.getElementById("chatbase-bubble")).toBeNull();
    expect(doc.getElementById("chatbase-message-container")).toBeNull();
    expect(bodyChildren.length).toBe(0);
    expect(win.chatbase).toBeUndefined();

    // Verificação de tolerância a nulos/vazios (não deve lançar erro)
    expect(() => removeChatbase(undefined, undefined)).not.toThrow();
    expect(() => removeChatbase({}, {})).not.toThrow();
  });

  it("T6 contador (fake timers): acquire, acquire, release não remove; release final remove após o adiamento; acquire entre release e o timer cancela a remoção", () => {
    vi.useFakeTimers();

    const { win, doc, bodyChildren } = createMockDom();

    // 1) acquire, acquire
    acquireChatbase(win, doc);
    expect(bodyChildren.length).toBe(1);

    acquireChatbase(win, doc);
    expect(bodyChildren.length).toBe(1);

    // 2) release (refCount ainda é 1) -> não remove
    releaseChatbase(win, doc, 1000);
    expect(bodyChildren.length).toBe(1);

    vi.advanceTimersByTime(1500);
    expect(bodyChildren.length).toBe(1);

    // 3) release final (refCount vai a 0) -> adiado por 1000ms
    releaseChatbase(win, doc, 1000);
    // Imediatamente após release, ainda NÃO removeu
    expect(bodyChildren.length).toBe(1);

    // Após o timer disparar, deve remover
    vi.advanceTimersByTime(1000);
    expect(bodyChildren.length).toBe(0);

    // 4) acquire entre release e o timer cancela a remoção
    acquireChatbase(win, doc);
    expect(bodyChildren.length).toBe(1);

    releaseChatbase(win, doc, 1000);
    expect(bodyChildren.length).toBe(1);

    // Avança 500ms (ainda não disparou)
    vi.advanceTimersByTime(500);
    expect(bodyChildren.length).toBe(1);

    // Novo acquire cancela o timer de remoção
    acquireChatbase(win, doc);

    // Avança mais 1000ms
    vi.advanceTimersByTime(1000);
    // Permanece presente
    expect(bodyChildren.length).toBe(1);

    vi.useRealTimers();
  });

  it("T7 CHATBASE_ENABLED=false não instala", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc, false);

    expect(bodyChildren.length).toBe(0);
    expect(win.chatbase).toBeUndefined();

    // Também testa via helper de configuração de teste
    setChatbaseEnabledForTesting(false);
    installChatbase(win, doc);
    expect(bodyChildren.length).toBe(0);
    setChatbaseEnabledForTesting(true);
  });

  it("T8 (leitura do código-fonte) __root.tsx, auth.tsx, p.$token.tsx, r.$token.tsx e shows.$id_.ficha.tsx não contêm 'chatbase'", () => {
    const routesDir = path.resolve(__dirname, "../routes");
    const filesToCheck = [
      "__root.tsx",
      "auth.tsx",
      "p.$token.tsx",
      "r.$token.tsx",
      "shows.$id_.ficha.tsx",
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(routesDir, file);
      expect(fs.existsSync(filePath), `Arquivo ${file} deve existir`).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(
        content.toLowerCase().includes("chatbase"),
        `Arquivo ${file} NÃO pode conter 'chatbase'`,
      ).toBe(false);
    }
  });

  it("T9 AppShell.tsx chama useChatbaseWidget", () => {
    const appShellPath = path.resolve(__dirname, "../components/AppShell.tsx");
    expect(fs.existsSync(appShellPath)).toBe(true);
    const content = fs.readFileSync(appShellPath, "utf-8");

    expect(content).toContain("useChatbaseWidget");
    expect(content).toMatch(/useChatbaseWidget\s*\(\s*\)/);
  });
});
