import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmButton } from "./ConfirmButton";

describe("ConfirmButton Component", () => {
  it("renderiza o title padrão quando nenhum title é informado", () => {
    const html = renderToStaticMarkup(<ConfirmButton onConfirm={() => {}} />);
    expect(html).toContain('title="Clique para excluir. Será pedida uma segunda confirmação."');
    expect(html).toContain("Excluir");
  });

  it("renderiza o title customizado quando informado e não armado", () => {
    const html = renderToStaticMarkup(
      <ConfirmButton onConfirm={() => {}} title="Excluir item de rider" />,
    );
    expect(html).toContain('title="Excluir item de rider"');
  });

  it("renderiza o title e label de confirmação quando o botão está armado", () => {
    const html = renderToStaticMarkup(
      <ConfirmButton
        onConfirm={() => {}}
        defaultArmed={true}
        confirmLabel="Tem certeza?"
      />,
    );
    expect(html).toContain(
      'title="Clique novamente para confirmar. A confirmação expira em alguns segundos."',
    );
    expect(html).toContain("Tem certeza?");
  });
});
