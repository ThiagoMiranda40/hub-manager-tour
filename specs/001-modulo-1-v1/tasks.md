# Tasks — Módulo 1 V1: Controle de Tour + Rider Técnico Digital

## Sequenciamento de Execução por Dependência

```
T-01 (Setup Vitest / TDD) ──► T-03 (Lógica TDD g3.ts) ──┐
                                                         │
T-02 (Migration Schema & RLS) ──────────────────────────┼──► T-05 (Catálogo de Pessoas + Pix) ──► T-06 (Criação de Show & Sugestão Elenco)
                                                         │                                                   │
T-04 (Design System Nocturne Calibrado) ────────────────┴──► T-07 (Painel Show, Presets & Pix) ◄────────────┘
                                                                 │
                                                                 ├──► T-08 (Envio Público com Checklist Dinâmica)
                                                                 ├──► T-09 (Catálogo Rider Padrão)
                                                                 ├──► T-10 (Confirmação Rider com Auto-Save)
                                                                 └──► T-11 (Modo Palco Mobile & Ficha A4)
                                                                          │
                                                                 ┌────────┴───────────────────────────┐
                                                                 ▼                                    ▼
                                                          T-12 (Extração IA - Stretch)      T-13 (Validação E2E & Build)
```

---

## T-01 — Infraestrutura de Testes Automatizados com Vitest
- **Depende de:** Nenhuma
- **Arquivos afetados:**
  - `package.json`
  - `vite.config.ts`
- **Fazer:**
  1. Instalar `vitest` como dependência de desenvolvimento: `npm install -D vitest`.
  2. Adicionar o script `"test": "vitest run"` no `package.json`.
  3. Criar teste rápido de sanidade para garantir execução limpa no ambiente.
- **Verificação técnica:** `npm test`
- **Tradução em linguagem simples:** "O ambiente de testes foi configurado: o Antigravity agora pode escrever e executar testes unitários sozinho com um comando, garantindo que a lógica de negócios não quebre ao longo do desenvolvimento."

---

## T-02 — Banco de Dados: Migração das Novas Entidades, Pix e Políticas RLS
- **Depende de:** Nenhuma
- **Arquivos afetados:**
  - `[NEW] supabase/migrations/20260904100000_modulo1_v1_schema.sql`
- **Fazer:**
  1. Escrever o script SQL criando as tabelas: `people` (com `pix_type`, `pix_key`), `person_artists`, `show_requirements`, `artist_rider_template_items`, `show_rider_items`.
  2. Adicionar as colunas `rider_public_token` na tabela `shows` e `person_id` na tabela `cast_members`.
  3. Adicionar as colunas `is_reimbursed boolean DEFAULT false` e `reimbursed_at timestamptz` na tabela `documents`.
  4. Criar constraints (`UNIQUE`, `CHECK`), chaves estrangeiras e índices de performance descritos em `data-model.md`.
  5. Habilitar RLS em todas as tabelas com políticas estritas para administradores autenticados (a permissão pontual do token público é validada pela Server Function, sem grants diretos no papel anon).
  6. Incluir rotina de migração/backfill para povoar `people` a partir dos nomes existentes em `cast_members`.
- **Verificação técnica:** Script SQL com sintaxe PostgreSQL rigorosa e validação de schema.
- **Tradução em linguagem simples:** "O banco de dados recebeu a estrutura para guardar pessoas uma só vez com seus contatos e Chave Pix, definir exigências por pessoa e show, controlar o pagamento de reembolsos e armazenar o rider técnico."

---

## T-03 — Ciclo TDD: Lógica de Cálculo de Pendências Individuais e Estatísticas do Rider
- **Depende de:** T-01
- **Referência:** Casos de teste derivados em `specs/001-modulo-1-v1/qa-plan.md` (TC-03.1 a TC-03.4)
- **Arquivos afetados:**
  - `[NEW] src/lib/g3.test.ts`
  - `[MODIFY] src/lib/g3.ts`
- **Fazer:**
  1. **Escrever testes unitários que falham** em `src/lib/g3.test.ts`:
     - Teste 1: Membro com exigências pendentes (Passagem + Hotel) -> contabiliza 2 pendências.
     - Teste 2 (BVA TC-03.2): Membro sem exigência configurada -> `hasRequirement: false`, NUNCA adiciona pendência ao total e é identificado expressamente como dispensado.
     - Teste 3: Contador consolidado discriminado (ex.: "15 integrantes: 11 ativos [8 concluídos, 3 pendentes], 4 sem exigência nesta data").
     - Teste 4: Cálculo do balanço do rider (total de itens, confirmados, exceções, pendentes).
     - Teste 5 (TC-03.3): Idempotência de presets em lote (aplicar duas vezes o mesmo preset não duplica exigências).
  2. **Implementar em `src/lib/g3.ts`** a nova assinatura de `computeShowProgress` aceitando `requirements: ShowRequirement[]` e helpers de estatísticas até todos os testes passarem.
  3. Rodar a suíte completa de testes.
- **Verificação técnica:** `npm test -- src/lib/g3.test.ts`
- **Tradução em linguagem simples:** "Testei os cálculos do sistema: se uma pessoa não precisa de passagem, ela não é contada como pendente; a contagem do show discrimina quem tem pendência de quem foi dispensado nesta data. Todos os cálculos matemáticos foram provados com casos de fronteira."

---

## T-04 — Sistema Visual Definitivo: Direção "Nocturne" Calibrada (WCAG 2.2 AA)
- **Depende de:** Nenhuma
- **Arquivos afetados:**
  - `[MODIFY] src/styles.css`
  - `[MODIFY] src/components/AppShell.tsx`
  - `[NEW] src/components/StatusBadge.tsx`
- **Fazer:**
  1. Atualizar `src/styles.css` com os tokens da direção **Nocturne** inspirados em `Hub Manager Tour (standalone).html`:
     - Fundo escuro `#161826` com acento lilás `#9184d9` (contraste ~6.5:1).
     - Calibração de contraste no tema claro: textos interativos e ícones utilizam `#5f4eb8` (contraste > 5.5:1, aprovado WCAG AA).
     - Tipografia: Inter para títulos e corpo, monospace moderno para códigos/tokens.
     - Cantos de 8px a 14px e transições suaves de 0.18s (`fade + slide-up`).
  2. Criar `StatusBadge.tsx` com ícone + texto cobrindo os 4 estados:
     - `confirmado` (badge verde)
     - `pendente` (badge amarelo/alerta)
     - `excecao` (badge roxo/vermelho)
     - `sem_exigencia` (texto itálico sutil sem badge colorido).
  3. Atualizar `AppShell.tsx` com navegação para Agenda, Pessoas & Equipe, e Configurações no padrão Nocturne.
  4. Garantir feedback tátil `:active` (RNF-01) em todos os elementos interativos: botões (`buttonVariants` e regras base CSS com `scale(0.97)`), links de navegação (`touch-nav`), cards clicáveis (`touch-card`), tabs e dropzones, com transição rápida de 120ms, mantendo os estados `:hover` desktop intactos.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O design do sistema foi atualizado para a direção visual definitiva Nocturne: cores elegantes em tons de lilás e grafite, cantos suaves, ícones acessíveis com alto contraste (WCAG AA), microinterações de 0.18s e resposta tátil imediata (120ms) ao toque no celular."

---

## T-05 — Catálogo Centralizado de Pessoas, Contatos e Chave Pix
- **Depende de:** T-02, T-04
- **Arquivos afetados:**
  - `[NEW] src/routes/people.tsx`
  - `src/routeTree.gen.ts`
- **Fazer:**
  1. Criar a rota protegida `/people` com a lista de integrantes e equipe sob a conta do administrador.
  2. Implementar formulário/modal para criar e editar pessoa: nome, telefone com máscara, e-mail, função padrão, tipo/chave Pix e observações.
  3. Implementar seção de vínculos: checkboxes para marcar artistas vinculados ou checkbox "Equipe Geral" (participa de todas as turnês).
  4. Adicionar filtros por função, artista ou busca textual.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O produtor cadastra seus músicos e técnicos uma única vez, informando contatos, chave Pix para pagamentos e indicando a quais bandas eles pertencem ou se fazem parte da equipe geral."

---

## T-06 — Criação de Show com Elenco Sugerido Automaticamente e Instanciação do Rider
- **Depende de:** T-02, T-05
- **Arquivos afetados:**
  - `[MODIFY] src/routes/index.tsx`
- **Fazer:**
  1. No modal de criação de show da Agenda (`/`), ao selecionar um Artista, consultar automaticamente as pessoas vinculadas a esse artista mais as marcadas como "Equipe Geral".
  2. Ao salvar o show:
     - Inserir o show em `shows` (gerando `public_token` e `rider_public_token`).
     - Inserir os registros correspondentes em `cast_members` pré-populando o elenco.
     - Inserir os itens do rider do show em `show_rider_items` clonando o rider padrão daquele artista.
  3. Atualizar o card do show na Agenda com visual Nocturne, progresso e resumo do rider.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "Ao cadastrar um novo show para uma banda, o elenco e o rider técnico padrão são carregados automaticamente sem que o produtor precise redigitar tudo do zero."

---

## T-07 — Prancheta do Show: Presets de Exigência em Lote, Reembolsos com Pix e Links
- **Depende de:** T-03, T-04, T-06
- **Arquivos afetados:**
  - `[MODIFY] src/routes/shows.$id.tsx`
- **Fazer:**
  1. Atualizar a tela de detalhe do show com abas: Elenco & Exigências, Documentos, Rider Técnico, Reembolsos e Ações Rápidas.
  2. Implementar ação em lote / preset de exigências: botão "Aplicar padrão: Toda a Banda (Passagem + Hotel)" que configura múltiplos integrantes em 1 clique.
  3. Integrar `computeShowProgress` para exibir os contadores detalhados e status "Sem exigência configurada".
  4. Na aba "Reembolsos", listar comprovantes com Nome, Valor, Recibo, Chave Pix do integrante, botão de 1 toque "Copiar Pix" e switch para marcar "Reembolsado".
  5. Criar cards de links separados para compartilhamento (Link do Elenco 📱 vs Link do Rider 🏛️) com toasts explicativos ao copiar.
- **Verificação técnica:** `npm test && npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "No painel do show, o produtor aplica exigências em lote para toda a banda com um clique, copia a chave Pix do integrante para pagar reembolsos na hora e compartilha os links com orientações claras."

---

## T-08 — Página Pública do Integrante com Checklist Pessoal Dinâmica
- **Depende de:** T-04, T-07
- **Arquivos afetados:**
  - `[MODIFY] src/routes/p.$token.tsx`
- **Fazer:**
  1. Atualizar a tela pública `/p/$token` para o design Nocturne responsivo.
  2. Ao selecionar um integrante no seletor de nomes, renderizar imediatamente sua **checklist pessoal dinâmica**:
     - Documentos já enviados aparecem marcados com badge verde "Recebido", nome do arquivo e data.
     - Documentos pendentes aparecem em destaque para envio imediato.
  3. No formulário de upload, incluir campo opcional de valor em R$ e checkbox "Solicitar reembolso deste item".
  4. Tratar estados de token inválido com mensagem amigável e acessível.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O integrante abre o link no celular, seleciona seu nome e vê na hora o que já entregou e o que ainda falta, podendo anexar o arquivo pendente e solicitar reembolso sem mandar comprovantes repetidos."

---

## T-09 — Catálogo de Rider Padrão por Artista nas Configurações
- **Depende de:** T-02, T-04
- **Arquivos afetados:**
  - `[MODIFY] src/routes/settings.tsx`
- **Fazer:**
  1. Adicionar nas Configurações a gestão de Rider Padrão agrupado por Artista.
  2. Cadastrar itens divididos por categorias (`backline`, `som`, `iluminacao`, `camarim`, `outros`), informando especificação detalhada, quantidade e se é mandatório.
  3. Permitir editar, excluir e reordenar itens do rider padrão.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O produtor cadastra a lista oficial de equipamentos de palco e camarim de cada artista uma vez só, para servir de modelo em todos os shows futuros."

---

## T-10 — Página Pública de Confirmação do Rider com Auto-Save e Impressão Local
- **Depende de:** T-04, T-06, T-09
- **Arquivos afetados:**
  - `[MODIFY] src/lib/g3.ts`
  - `[MODIFY] src/lib/g3.test.ts`
  - `[NEW] src/routes/r.$token.tsx`
  - `src/routeTree.gen.ts`
- **Fazer:**
  1. Criar a rota pública `/r/$token` acessada pela casa de show/promotor sem login.
  2. Exibir cabeçalho do evento com indicador de auto-save: *"Salvo em tempo real (HH:MM)"*.
  3. Implementar interação item a item com reversibilidade:
     - Botão "Confirmar": marca como atendido (badge verde).
     - Botão "Sinalizar Exceção": revela com animação suave (0.18s) caixa de texto para a nota.
     - Clicar de volta em "Confirmar" reverte o status imediatamente.
  4. Adicionar botão "Imprimir Cópia de Atendimento" que abre visão limpa sem botões para a equipe técnica do teatro.
  5. Blindagem de segurança anti-IDOR/BOLA (A01:2025): a Server Function de mutação deve exigir obrigatoriamente a validação composta `WHERE id = itemId AND show_id = show.id`, impedindo que uma casa com token altere itens de outro show.
  6. Aplicar RF-11: consumir os contadores segregados (inegociável/desejável) de computeRiderBalance e exibir dois indicadores separados, com itens inegociáveis pendentes ordenados antes dos desejáveis.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "A casa de show confirma item a item pelo celular com salvamento automático e proteção de segurança garantindo que ninguém consiga alterar dados de outro evento."

---

## T-11 — Modo Palco Mobile para Conferência Física e Ficha de Produção A4
- **Depende de:** T-07, T-10
- **Arquivos afetados:**
  - `[MODIFY] src/routes/shows.$id.tsx`
  - `[MODIFY] src/routes/shows.$id_.ficha.tsx`
- **Fazer:**
  1. Na aba de Rider Técnico de `shows.$id.tsx`, adicionar o botão de alternância para **"Modo Palco"**:
     - Visualização em cards amplos otimizados para toque de polegar em smartphone (altura >= 48px).
     - Botões grandes: "OK Recebido" (verde) e "Divergência" (alerta) para auditoria presencial em ambiente com pouca luz.
  2. Atualizar a rota `shows.$id_.ficha.tsx` para impressão A4 incorporando a nova estrutura de pessoas e o balanço do rider técnico.
  3. Aplicar RF-11: no Modo Palco, itens inegociáveis pendentes/em divergência aparecem destacados e ordenados antes dos desejáveis.
- **Verificação técnica:** `npm test && npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "No dia do show, a equipe no palco usa o celular com botões grandes de polegar para checar se o equipamento entregue bate com o prometido. A Ficha de Produção A4 foi atualizada com os novos dados."

---

## T-12 — Extração Inteligente de Comprovantes e Rider por IA (Stretch Goal)
- **Depende de:** T-07, T-09
- **Arquivos afetados:**
  - `[NEW] src/lib/ai-extraction.ts`
  - `src/routes/shows.$id.tsx`
  - `src/routes/settings.tsx`
- **Fazer:**
  1. Implementar helper `ai-extraction.ts` conectado a modelo multimodal (Gemini Flash).
  2. Função 1: Ler PDF/foto de passagem ou nota e extrair número de voo, hotel ou valor para aprovação rápida do produtor.
  3. Função 2: Importar PDF de rider técnico legado e transformá-lo em checklist estruturado.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "Funcionalidade inteligente: ao anexar um PDF de passagem ou rider antigo, a IA reconhece o conteúdo e pré-preenche os dados para o produtor apenas aprovar."

---

## T-14 — Tema Claro/Escuro Alternável pelo Usuário (RF-12)
- **Depende de:** T-04
- **Arquivos afetados:**
  - `[MODIFY] src/routes/__root.tsx`
  - `[MODIFY] src/components/AppShell.tsx`
  - `[MODIFY] src/routes/settings.tsx`
  - `[MODIFY] src/routes/p.$token.tsx`
  - `[MODIFY] src/routes/r.$token.tsx`
- **Fazer:**
  1. Implementar mecanismo de classe `.dark` no elemento raiz (`html`/`body`), com fallback inicial baseado em `prefers-color-scheme` do navegador quando não houver preferência salva.
  2. Implementar alternador de tema com ícone lua/sol:
     - No rodapé da sidebar quando em modo sidebar.
     - No canto superior direito quando em modo cabeçalho.
  3. Salvar a escolha do usuário ('light'/'dark') em `localStorage`, fazendo com que prevaleça sobre a preferência do sistema operacional em acessos subsequentes.
  4. Garantir que todas as telas (internas e rotas públicas `/p/$token` e `/r/$token`), tipografia, cartões e variantes da logo respeitem a paleta escura calibrada na T-04 sem quebra de contraste.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O usuário pode alternar entre tema claro e escuro a qualquer momento com um clique; a escolha fica gravada no navegador e todas as telas, inclusive as páginas públicas de envio e rider, adaptam suas cores e logotipos mantendo contraste perfeito."

---

## T-15 — Navegação Adaptável: Cabeçalho ou Barra Lateral Recolhível (RF-13)
- **Depende de:** T-04
- **Arquivos afetados:**
  - `[MODIFY] src/components/AppShell.tsx`
  - `[MODIFY] src/routes/settings.tsx`
- **Fazer:**
  1. Em desktop/tablet (acima de 640px), permitir ao usuário escolher em Configurações entre modo cabeçalho superior e modo barra lateral (sidebar).
  2. Implementar a barra lateral esquerda com largura de 240px (expandida) e 76px (recolhida), incluindo botão de alternância recolher/expandir com ícones de caret (esquerda/direita).
  3. No estado recolhido (76px), exibir apenas os ícones de navegação e o símbolo da marca (`marca-simbolo`), ocultando os textos e o wordmark completo.
  4. No modo cabeçalho (padrão atual), manter a barra horizontal superior fixada no topo.
  5. Persistir a preferência do modo de navegação e o estado de recolhimento em `localStorage`.
  6. Em telas móveis (abaixo de 640px / breakpoint `sm:`), a navegação deve sempre se comportar como menu hambúrguer no topo, independentemente da configuração salva para desktop.
- **Verificação técnica:** `npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "O usuário pode escolher se prefere o menu no topo ou numa barra lateral que encolhe para dar mais espaço à tela. No celular, a navegação se adapta automaticamente para menu hambúrguer compacto."

---

## T-13 — Verificação Ponta a Ponta dos Cenários de Aceite, DoD de QA e Build de Produção
- **Depende de:** T-01 até T-15
- **Referência:** Checklist de "Pronto para Produção" (DoD) em `specs/001-modulo-1-v1/qa-plan.md`
- **Arquivos afetados:** Todos os componentes e rotas do Módulo 1 V1
- **Fazer:**
  1. Executar os 3 cenários-chave ponta a ponta definidos em `spec.md`:
     - Cenário 1: Preset em lote de exigências e contadores detalhados de elenco.
     - Cenário 2: Checklist dinâmica pessoal do integrante e liquidação de reembolso com botão "Copiar Pix".
     - Cenário 3: Confirmação pública do rider com auto-save, reversibilidade e conferência no "Modo Palco".
  2. Rodar a suíte de testes unitários: `npm test`.
  3. Executar typecheck estrito: `npx tsc --noEmit`.
  4. Gerar o build de produção: `npm run build` e validar pacote para deploy Cloudflare Workers.
  5. Validar os itens do checklist Definition of Done (técnico e linguagem simples) de `qa-plan.md`.
- **Verificação técnica:** `npm test && npx tsc --noEmit && npm run build`
- **Tradução em linguagem simples:** "Todos os 3 fluxos completos do Módulo 1 foram executados de ponta a ponta, todos os testes unitários passaram e o checklist de pronto para produção foi validado com 100% de integridade."
