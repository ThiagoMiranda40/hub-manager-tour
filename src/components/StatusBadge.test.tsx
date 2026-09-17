import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge Component (Nocturne)", () => {
  it("renderiza o estado confirmado com ícone e texto padrão", () => {
    const html = renderToStaticMarkup(<StatusBadge status="confirmado" />);
    expect(html).toContain("Confirmado");
    expect(html).toContain("<svg");
    expect(html).toContain("text-emerald-700");
  });

  it("renderiza o estado pendente com ícone e texto padrão", () => {
    const html = renderToStaticMarkup(<StatusBadge status="pendente" />);
    expect(html).toContain("Pendente");
    expect(html).toContain("<svg");
    expect(html).toContain("text-amber-800");
  });

  it("renderiza o estado excecao com ícone e texto padrão", () => {
    const html = renderToStaticMarkup(<StatusBadge status="excecao" />);
    expect(html).toContain("Exceção");
    expect(html).toContain("<svg");
    expect(html).toContain("text-purple-900");
  });

  it("renderiza o estado sem_exigencia com texto itálico sutil", () => {
    const html = renderToStaticMarkup(<StatusBadge status="sem_exigencia" />);
    expect(html).toContain("Sem exigência configurada");
    expect(html).toContain("italic");
    expect(html).toContain("text-muted-foreground");
  });

  it("permite customizar o label mantendo o estado visual", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="confirmado" label="Atendido" />,
    );
    expect(html).toContain("Atendido");
  });

  it("suporta valores de status em inglês (confirmed, pending, exception, no_requirement)", () => {
    const html = renderToStaticMarkup(<StatusBadge status="confirmed" />);
    expect(html).toContain("Confirmado");
    const html2 = renderToStaticMarkup(<StatusBadge status="no_requirement" />);
    expect(html2).toContain("Sem exigência configurada");
  });
});
