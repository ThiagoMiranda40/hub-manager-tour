import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as chatbaseModule from "./chatbase";
import {
  CHATBASE_AGENT_ID,
  CHATBASE_DOMAIN,
  CHATBASE_EMBED_SRC,
  CHATBASE_ENABLED,
  installChatbase,
  resetChatbaseConversation,
  resetChatbaseInstalledForTesting,
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
    resetChatbaseInstalledForTesting();
  });

  it("T1 install cria exatamente 1 script com src, id e domain corretos", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc);

    expect(bodyChildren.length).toBe(1);
    const script = bodyChildren[0];
    expect(script.src).toBe(CHATBASE_EMBED_SRC);
    expect(script.id).toBe(CHATBASE_AGENT_ID);
    expect(script.domain).toBe(CHATBASE_DOMAIN);

    expect(typeof win.chatbase).toBe("function");
    expect(win.chatbase.q).toBeDefined();

    win.chatbase("customAction", { key: "value" });
    expect(win.chatbase.q.length).toBe(1);
    expect(win.chatbase.q[0]).toEqual(["customAction", { key: "value" }]);
  });

  it("T2 duas chamadas não duplicam", () => {
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

    expect(bodyChildren.length).toBe(0);

    win.trigger("load");

    expect(bodyChildren.length).toBe(1);
    expect(bodyChildren[0].id).toBe(CHATBASE_AGENT_ID);
  });

  it("T5 a flag de módulo impede nova injeção mesmo se o script for removido do DOM", () => {
    const { win, doc, bodyChildren } = createMockDom();

    installChatbase(win, doc);
    expect(bodyChildren.length).toBe(1);

    // Remove manualmente o script do DOM
    bodyChildren[0].remove();
    expect(bodyChildren.length).toBe(0);
    expect(doc.getElementById(CHATBASE_AGENT_ID)).toBeNull();

    // Nova chamada a installChatbase na mesma sessão de módulo não reinjeta
    installChatbase(win, doc);
    expect(bodyChildren.length).toBe(0);
  });

  it("T6 o módulo NÃO exporta removeChatbase nem releaseChatbase", () => {
    const mod = chatbaseModule as Record<string, unknown>;
    expect(mod["removeChatbase"]).toBeUndefined();
    expect(mod["releaseChatbase"]).toBeUndefined();
    expect(mod["acquireChatbase"]).toBeUndefined();
  });

  it("T7 useChatbaseWidget não contém função de limpeza (leitura do código-fonte)", () => {
    const chatbaseTsPath = path.resolve(__dirname, "chatbase.ts");
    const content = fs.readFileSync(chatbaseTsPath, "utf-8");

    const hookMatch = content.match(/function\s+useChatbaseWidget\s*\(\s*\)[\s\S]*?\n\}/);
    expect(hookMatch).not.toBeNull();
    const hookBody = hookMatch?.[0] ?? "";

    expect(hookBody).not.toMatch(/return\s*\(\s*\)\s*=>/);
    expect(hookBody).not.toMatch(/return\s+function/);
  });

  it("T7b resetChatbaseConversation chama resetChat e não lança se window.chatbase não existir", () => {
    const winWithChatbase: any = {
      chatbase: vi.fn(),
    };
    resetChatbaseConversation(winWithChatbase);
    expect(winWithChatbase.chatbase).toHaveBeenCalledWith("resetChat");

    expect(() => resetChatbaseConversation(undefined)).not.toThrow();
    expect(() => resetChatbaseConversation({})).not.toThrow();
    expect(() => resetChatbaseConversation({ chatbase: "not-a-function" })).not.toThrow();
  });

  it("T8 __root.tsx, p.$token.tsx e r.$token.tsx continuam sem 'chatbase', e auth.tsx, shows.$id_.ficha.tsx e AppShell.tsx chamam useChatbaseWidget", () => {
    const routesDir = path.resolve(__dirname, "../routes");
    const forbiddenFiles = [
      "__root.tsx",
      "p.$token.tsx",
      "r.$token.tsx",
    ];

    for (const file of forbiddenFiles) {
      const filePath = path.join(routesDir, file);
      expect(fs.existsSync(filePath), `Arquivo ${file} deve existir`).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(
        content.toLowerCase().includes("chatbase"),
        `Arquivo ${file} NÃO pode conter 'chatbase'`,
      ).toBe(false);
    }

    // auth.tsx, shows.$id_.ficha.tsx e AppShell.tsx devem chamar useChatbaseWidget
    const requiredFiles = [
      path.join(routesDir, "auth.tsx"),
      path.join(routesDir, "shows.$id_.ficha.tsx"),
      path.resolve(__dirname, "../components/AppShell.tsx"),
    ];

    for (const filePath of requiredFiles) {
      expect(fs.existsSync(filePath), `Arquivo ${filePath} deve existir`).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("useChatbaseWidget");
      expect(content).toMatch(/useChatbaseWidget\s*\(\s*\)/);
    }
  });

  it("T9 AppShell.tsx chama useChatbaseWidget", () => {
    const appShellPath = path.resolve(__dirname, "../components/AppShell.tsx");
    expect(fs.existsSync(appShellPath)).toBe(true);
    const content = fs.readFileSync(appShellPath, "utf-8");

    expect(content).toContain("useChatbaseWidget");
    expect(content).toMatch(/useChatbaseWidget\s*\(\s*\)/);
  });

  it("T10 AppShell.tsx contém window.location.assign('/auth') e chama resetChatbaseConversation", () => {
    const appShellPath = path.resolve(__dirname, "../components/AppShell.tsx");
    const content = fs.readFileSync(appShellPath, "utf-8");

    expect(content).toContain('window.location.assign("/auth")');
    expect(content).toMatch(/resetChatbaseConversation\s*\(\s*\)/);
  });
});
