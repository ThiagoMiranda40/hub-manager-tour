<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Hub Manager Tour — Convenções e Comandos

## Comandos de Desenvolvimento
- `npm run dev`: Inicia o servidor Vite de desenvolvimento.
- `npx tsc --noEmit`: Validação estrita de tipos do TypeScript.
- `npm run build`: Compilação de produção (Vite + Nitro preset cloudflare-module).
- `npm test`: Execução da suíte de testes unitários com Vitest.

## Convenções de Arquitetura e Código
- **Stack:** TanStack Start (React 19) + Nitro + Supabase (Postgres, Storage, Auth) + Tailwind CSS v4.
- **Identidade Visual:** Direção **Nocturne** (acento roxo/lilás `#9184d9`, tipografia Inter, cantos 8–14px, hairlines sutis, microinterações de 0.18s).
- **Segurança e RLS:** Todas as tabelas têm Row Level Security ativo, garantindo isolamento estrito por `user_id = auth.uid()`.
- **Regra de Pendência:** Pendências são calculadas estritamente por **pessoa + show** via `show_requirements`. O estado "sem exigência configurada" é visualmente e logicamente distinto de "pendente" (nunca onera a contagem de pendências).
- **Rotas Públicas (`/p/$token` e `/r/$token`):** Acesso anônimo opera com validação de token exclusivo por show; nunca expor dados financeiros ou credenciais de serviço no cliente.

## Relatórios de Entrega
- Todo relatório de entrega de tarefa deve declarar **100% dos arquivos alterados no commit**, incluindo ajustes que não fazem parte do escopo formal pedido (ex.: um ajuste visual de UI feito por decisão própria, uma correção pontual encontrada no caminho). Nunca afirmar "sem alteração de código" ou equivalente se qualquer arquivo de código foi tocado no mesmo commit.
- Ajustes de UI/UX feitos por decisão própria (não derivados de um requisito formal do spec.md) devem ser explicitamente rotulados como tal no resumo da entrega — ex.: "Ajuste de UI por decisão própria: [o que mudou e por quê]" — para diferenciar claramente do que decorre de um RF/critério de aceite formal.
- Se um ajuste desse tipo alterar uma medida (tamanho, espaçamento, cor) definida anteriormente por instrução explícita do Thiago em uma entrega anterior, mencionar isso também (ex.: "Alterado de X para Y, definido anteriormente no commit [hash]").
