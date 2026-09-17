# Plano de QA e Estratégia de Testes — Módulo 1 V1 (Controle de Tour + Rider Técnico)

Este documento estabelece a estratégia de qualidade, priorização por risco, casos de teste derivados (além do caminho feliz), cartas de teste exploratório e checklist de "pronto para produção" para o Módulo 1 V1 do **Hub Manager Tour**.

---

## 1. Estratégia de Teste por Camada (Pirâmide Adaptada)

O Hub Manager Tour combina lógica de negócios pura (cálculo de pendências pessoa+show, discriminação de dispensados, balanço do rider), integrações com banco/storage via Supabase e rotas públicas sem autenticação operando sob tokens exclusivos.

A pirâmide adotada para este projeto **não é a proporção teórica cega**, mas sim calibrada para a realidade da arquitetura (TanStack Start + Nitro + Supabase):

```
                 / \
                / E2E \             Topo (10%): 3 Cenários-Chave Ponta a Ponta
               /───────\            (Playwright / Navegador real)
              / Integr. \           Meio-Alto (25%): Server Functions + Anti-IDOR
             /───────────\          + Upload Storage + Validação de Token Público
            / Componentes \         Meio-Baixo (25%): Microinterações touch (:active),
           /───────────────\        StatusBadge 4 estados, Modais de Confirmação
          /   Unitários     \       Base (40%): Lógica g3.ts, Schemas Zod,
         /───────────────────\      Cálculo de Pendências, Chave Pix e BVA
```

### Justificativa da Distribuição
1. **Base Unitária Forte (40%):** O motor de cálculo de pendências (`g3.ts`) possui dezenas de combinações de exigências (membros com pendências, membros dispensados, múltiplos tipos de documentos, balanço financeiro). Testar isso em milissegundos sem subir banco de dados dá feedback imediato aos desenvolvedores durante refatorações.
2. **Componentes com Foco em Touch (25%):** Como o sistema é amplamente operado em smartphones (no palco ou em trânsito por músicos e roadies), a camada de componentes valida estados táteis `:active`, acessibilidade de contraste (WCAG 2.2 AA) e renderização condicional dos 4 estados de badge.
3. **Integração com Foco em Segurança e Tokens (25%):** As rotas públicas (`/p/$token` e `/r/$token`) são pontos vitais. A camada de integração valida isolamento anti-IDOR/BOLA (garantir que um token do Show A não consiga alterar dados do Show B nem do Rider C) e limites de upload (20 MB, tipos MIME permitidos).
4. **E2E Focado nos 3 Cenários-Chave (10%):** O topo da pirâmide é reservado estritamente para os 3 fluxos completos descritos no `spec.md`, evitando suítes lentas e frágeis.

---

## 2. Matriz de Priorização de Testes por Risco

Escala: **Probabilidade de Falha (1 a 3)** × **Impacto se Falhar (1 a 3)** = **Score de Risco (1 a 9)**.

| Requisito / Componente | Probabilidade (1-3) | Impacto (1-3) | Score | Nível de Rigor | Justificativa |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **BOLA / IDOR em Rotas Públicas (`/r/` e `/p/`)** | 2 | 3 | **6** | **Máximo** | Exposição ou alteração indevida de dados entre diferentes shows ou contratantes compromete a integridade do sistema. |
| **Cálculo de Pendências Pessoa + Show (RF-03)** | 2 | 3 | **6** | **Alto** | Falha pode deixar músico sem passagem/hotel ou indicar pendência inexistente para integrante dispensado, gerando atrito com a produção. |
| **Upload de Comprovantes & Storage (RF-04)** | 2 | 3 | **6** | **Alto** | Risco de envio de arquivo corrompido, tipo não suportado, arquivo acima de 20MB ou bypass de validação. |
| **Reembolsos e Cópia de Chave Pix (RF-01 / RF-05)** | 1 | 3 | **3** | **Alto** | Envolve transação financeira. Copiar chave errada ou truncada gera pagamento indevido. |
| **Auto-Save & Reversibilidade do Rider (RF-07)** | 3 | 2 | **6** | **Alto** | Corrida de requisições assíncronas (race condition) pode sobrescrever exceções acordadas com a casa de show. |
| **Modo Palco Mobile em Luz Baixa (RF-08)** | 2 | 2 | **4** | **Médio** | Falha de usabilidade sob pressão física no palco (botão pequeno, toque acidental). |
| **Sugestão de Elenco por Vínculo (RF-02)** | 1 | 2 | **2** | **Médio** | Se falhar, o produtor pode adicionar manualmente sem perda de dados. |
| **Catálogo de Rider Padrão do Artista (RF-06)** | 1 | 2 | **2** | **Médio** | Alteração em catálogo padrão não deve quebrar histórico de shows já contratados. |
| **Ficha de Produção A4 para Impressão (RF-09)** | 1 | 1 | **1** | **Básico** | Quebra de página de impressão ou formatação cosmética sem perda de dados. |
| **Extração Inteligente IA - Stretch (RF-10)** | 3 | 1 | **3** | **Básico** | Recurso opcional (stretch goal) onde o humano sempre valida antes de gravar. |

---

## 3. Casos de Teste Completos Derivados (Além do Caminho Feliz)

Aplicando **Particionamento de Equivalência (EP)**, **Análise de Valor Limite (BVA)** e **Error Guessing (EG)** sobre os critérios de aceite do `spec.md`.

---

### RF-01: Cadastro de Pessoas, Vínculos e Chave Pix

#### Partições de Equivalência (EP)
- **Nome:** [Válido: 2 a 120 caracteres com letras e acentos] | [Inválido: vazio, espaços em branco, > 120 caracteres, tags HTML/script].
- **Telefone:** [Válido: 10 a 11 dígitos com DDD numérico] | [Inválido: vazio, letras, < 10 dígitos, > 15 dígitos com DDI mal formatado].
- **Tipo de Pix:** `cpf`, `cnpj`, `email`, `phone`, `random`.
- **Chave Pix (por tipo):**
  - CPF: [Válido: 11 dígitos com ou sem pontuação] | [Inválido: 10 dígitos, 12 dígitos, CPF com todos dígitos iguais].
  - E-mail: [Válido: `nome@dominio.com`] | [Inválido: `nome@`, `@dominio.com`, espaços].
  - Telefone: [Válido: `+55DD9XXXXXXXX`] | [Inválido: texto alfanumérico].
  - Chave aleatória (EVP): [Válido: UUID 36 caracteres] | [Inválido: string arbitrária curta].

#### Análise de Valor Limite (BVA)
- **TC-01.1 (BVA):** Nome com 1 caractere (inválido — rejeitar com mensagem clara) vs 2 caracteres (válido — aceitar).
- **TC-01.2 (BVA):** Nome com 120 caracteres (válido no limite superior) vs 121 caracteres (truncar ou rejeitar com erro amigável).
- **TC-01.3 (BVA):** Telefone celular com DDD: 10 dígitos (fixo, válido), 11 dígitos (celular, válido), 9 dígitos (inválido, falta DDD).

#### Error Guessing & Casos de Exceção
- **TC-01.4 (EG):** Inserção de injeção XSS no campo de chave Pix ou nome (`<script>alert(1)</script>`) -> sanitizado e tratado como texto puro sem execução.
- **TC-01.5 (EG):** Duplo clique rápido no botão "Salvar pessoa" -> desabilitado durante envio para evitar duplicação de registro no banco.

---

### RF-02: Sugestão e Ajuste de Elenco por Show

#### Casos Derivados
- **TC-02.1 (Caminho feliz):** Criar show para Artista A -> pré-carrega músicos do Artista A + pessoas marcadas como "equipe geral".
- **TC-02.2 (Fronteira):** Criar show para artista sem nenhum integrante vinculado previamente -> elenco inicia vazio, exibe placeholder incentivando cadastro sem travar a interface.
- **TC-02.3 (Isolamento de Show):** Adicionar pessoa avulsa no Show #10 -> verificar no banco de dados que Show #11 do mesmo artista não foi afetado.
- **TC-02.4 (Exclusão com Dependência):** Tentar excluir do elenco do show um integrante que já possui 2 documentos enviados -> botão bloqueado com aviso explicativo orientando exclusão dos documentos antes de remover a pessoa.

---

### RF-03: Exigências Individuais com Presets em Lote e Cálculo de Pendências

#### Partições de Equivalência (EP)
- **Estado de Exigência do Integrante:**
  - `com_exigencias_completas`: todos os tipos exigidos para ele foram recebidos.
  - `com_exigencias_pendentes`: possui pelo menos 1 documento obrigatório faltando.
  - `sem_exigencia_configurada`: nenhuma exigência associada para esta data específica.

#### Análise de Valor Limite (BVA)
- **TC-03.1 (BVA - Zero pendências):** Integrante tem 1 exigência e 1 documento recebido -> status `concluído`.
- **TC-03.2 (BVA - Sem exigência não onera total):** Show com 5 integrantes locais (todos sem exigência configurada) e 1 integrante com 2 exigências pendentes:
  - Total de integrantes: 5
  - Total com exigências ativas: 1
  - Total pendente: 2
  - Dispensados: 4
  - **Critério estrito:** O integrante sem exigência NUNCA incrementa o contador de pendências do cabeçalho.
- **TC-03.3 (Preset em lote):** Selecionar 10 integrantes e aplicar "Passagem + Hotel":
  - Se 2 integrantes já tinham "Passagem", não duplica no banco (idempotência garantida pela chave única composta `show_id + cast_member_id + doc_type`).

#### Error Guessing
- **TC-03.4 (EG):** Desmarcar todas as exigências de um integrante que estava com pendência -> status atualiza imediatamente para "Sem exigência configurada" em itálico, reduzindo a contagem global do show.

---

### RF-04: Envio Público com Checklist Dinâmica e Reembolso (`/p/$token`)

#### Partições de Equivalência (EP)
- **Tamanho do Arquivo:**
  - Válido: de 1 byte até 20.971.520 bytes (20 MB).
  - Inválido: 0 bytes (vazio), > 20 MB.
- **Extensões de Arquivo:**
  - Válidas: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`.
  - Inválidas: `.exe`, `.sh`, `.zip`, `.docx`, `.svg`, sem extensão.
- **Valor do Reembolso:**
  - Válido: R$ 0,01 a R$ 999.999,99.
  - Inválido: R$ 0,00, negativo, texto alfanumérico não conversível.

#### Análise de Valor Limite (BVA)
- **TC-04.1 (BVA - Tamanho):** Arquivo de 20.971.520 bytes (20,00 MB) -> aceito. Arquivo de 20.971.521 bytes (20,00 MB + 1 byte) -> rejeitado com mensagem "Arquivo acima de 20 MB".
- **TC-04.2 (BVA - Valor):** Campo de valor de reembolso com "0,00" -> rejeitado. Valor "0,01" -> aceito como R$ 0,01.

#### Error Guessing & Segurança (BOLA / Spoofing)
- **TC-04.3 (Segurança - MIME Spoofing):** Arquivo `malware.exe` renomeado para `foto.jpg` -> verificação de cabeçalho binário (magic bytes) no upload para impedir execução.
- **TC-04.4 (Segurança - Token Inexistente):** Acesso a `/p/token-falso-12345` -> exibe tela amigável "Link Inválido" com instrução de contato com a produção, sem vazar stack trace ou detalhes do servidor.
- **TC-04.5 (EG - Queda de Conexão no Upload):** Simular falha de rede a 80% do envio -> botão volta ao estado inicial habilitado com mensagem "Falha no envio. Toque para tentar novamente", sem criar registro incompleto no banco.

---

### RF-05: Painel de Reembolsos, Cópia de Pix e Compartilhamento

#### Casos Derivados
- **TC-05.1 (Cópia de Chave Pix):** Clicar no botão "Copiar Pix" de integrante com chave CPF formatada (`123.456.789-00`) -> transfere para a área de transferência do sistema operacional a chave limpa e aciona toast: "Chave Pix de [Nome] copiada!".
- **TC-05.2 (Fronteira - Sem Pix Cadastrado):** Integrante solicita reembolso mas não tem chave Pix no cadastro -> exibe aviso sutil "Pix não cadastrado" com link direto para editar a pessoa.
- **TC-05.3 (Diferenciação dos Links de Compartilhamento):**
  - Clicar no card 📱 "Link do Elenco" -> copia URL `/p/[token]` e toast avisa "Link de envio do elenco copiado".
  - Clicar no card 🏛️ "Link do Rider" -> copia URL `/r/[token]` e toast avisa "Link do rider para a casa copiado".

---

### RF-06: Catálogo de Rider Padrão por Artista

#### Casos Derivados
- **TC-06.1 (Caminho feliz):** Cadastrar 8 itens de Backline e 4 de Camarim para Artista B com quantidades e flag "Mandatório".
- **TC-06.2 (Imutabilidade de Shows Passados):** Alterar especificação de item no catálogo padrão do Artista B -> shows já criados anteriormente mantêm a especificação contratada intacta (cópia desacoplada de dados).

---

### RF-07: Rider do Show com Auto-Save e Reversibilidade (`/r/$token`)

#### Partições de Equivalência (EP)
- **Ações no Item do Rider:**
  - `confirmado`: status verde, nota opcional limpa.
  - `excecao`: status roxo/alerta, exige justificativa ou nota de alternativa.
  - `pendente`: status neutro antes de qualquer conferência pela casa.

#### Análise de Valor Limite (BVA) & Concorrência
- **TC-07.1 (Reversibilidade Imediata):** Clicar em "Sinalizar Exceção", abrir campo de nota, digitar texto, e em seguida clicar em "Confirmar" -> status reverte imediatamente para confirmado, grava no servidor e atualiza o timestamp "Salvo às HH:MM".
- **TC-07.2 (Concorrência / Debounce):** Usuário digita rápido na nota de exceção (50 caracteres em 2 segundos) -> o salvamento automático utiliza debounce (500ms) para não disparar 50 requisições desnecessárias ao servidor.
- **TC-07.3 (BOLA em Rider Items):** Tentar enviar via endpoint a alteração do item #999 usando o token do Show #10, sendo que o item #999 pertence ao Show #20 -> a query do servidor com cláusula `WHERE show_id = (SELECT id FROM shows WHERE rider_public_token = :token)` retorna 0 linhas afetadas / erro 403, impedindo contaminação entre shows.

---

### RF-08: Conferência no Palco Mobile (Modo Palco)

#### Casos Derivados
- **TC-08.1 (Target de Toque):** Botões "Recebido Conforme" e "Divergência" medem no mínimo 48x48px no viewport mobile (WCAG 2.5.5).
- **TC-08.2 (Feedback Tátil):** Toque no botão emite encolhimento tátil `:active` de 120ms (`scale(0.97)`) com confirmação imediata antes do fechamento da requisição.
- **TC-08.3 (Divergência com Observação):** Marcar divergência em amplificador e ditar texto -> observação gravada visível para o produtor geral no dashboard administrativo.

---

### RF-09: Ficha de Produção Consolidada (Impressão A4)

#### Casos Derivados
- **TC-09.1 (Mídia Print):** Ao acionar `window.print()` ou visualização de impressão:
  - Barra de navegação e botões de ação somem (`print:hidden`).
  - Cores forçadas para preto no branco (`#000` em `#fff`) garantindo legibilidade em qualquer impressora.
  - Tabelas e blocos possuem regra CSS `break-inside: avoid` impedindo que um integrante seja cortado ao meio entre duas páginas.

---

### RF-11: Priorização de Itens Inegociáveis

#### Casos Derivados
- **TC-11.1 (Bloqueio de conclusão):** Rider com todos os desejáveis confirmados e 1 inegociável pendente -> status geral não pode indicar "completo".
- **TC-11.2 (Severidade de exceção):** Exceção em item inegociável exibe alerta visualmente distinto (mais crítico) de exceção em item desejável.
- **TC-11.3 (Ordenação):** Lista com itens pendentes dos dois tipos exibe inegociáveis pendentes antes dos desejáveis pendentes.
- **TC-11.4 (Contadores segregados):** Tela exibe dois contadores separados, nunca um percentual único misturando os dois grupos.

---

### RF-12: Tema Claro/Escuro

#### Casos Derivados
- **TC-12.1 (Padrão do sistema via prefers-color-scheme):**
  - **Dado** o primeiro acesso do usuário sem preferência salva em `localStorage`,
  - **quando** a página carrega,
  - **então** o tema segue `prefers-color-scheme` do navegador (claro ou escuro).
- **TC-12.2 (Alternador de tema e persistência em localStorage):**
  - **Dado** o alternador de tema (ícone lua/sol, no rodapé da sidebar em modo sidebar, ou canto superior direito em modo cabeçalho),
  - **quando** o usuário clica,
  - **então** o tema muda imediatamente e a escolha é salva em `localStorage`, prevalecendo sobre a preferência do sistema em visitas futuras.
- **TC-12.3 (Preservação de contraste e tema escuro global):**
  - **Dado** qualquer tela (interna ou pública, `/p/[token]` e `/r/[token]`),
  - **quando** o tema é escuro,
  - **então** todos os componentes, incluindo a logo, respeitam a paleta escura calibrada na T-04 sem quebra de contraste.

---

### RF-13: Navegação Adaptável

#### Casos Derivados
- **TC-13.1 (Modo sidebar desktop/tablet e botão recolher/expandir):**
  - **Dado** o usuário em desktop/tablet (acima de 640px),
  - **quando** ele escolhe o modo sidebar em Configurações,
  - **então** a navegação migra para uma barra lateral esquerda, largura 240px expandida / 76px recolhida, com botão de recolher/expandir (caret esquerda/direita).
- **TC-13.2 (Sidebar recolhida com ícones e símbolo da marca):**
  - **Dado** a sidebar recolhida,
  - **quando** exibida,
  - **então** mostra só ícones de navegação e o símbolo da marca (sem o wordmark completo).
- **TC-13.3 (Modo cabeçalho superior padrão):**
  - **Dado** o modo cabeçalho (padrão atual),
  - **quando** escolhido,
  - **então** a navegação permanece no topo como hoje.
- **TC-13.4 (Persistência da escolha em localStorage):**
  - **Dado** a escolha entre os dois modos,
  - **quando** feita,
  - **então** é salva em `localStorage` e mantida entre sessões.
- **TC-13.5 (Menu hambúrguer obrigatório em mobile):**
  - **Dado** o acesso em mobile (abaixo de 640px, breakpoint `sm:` já usado no resto do sistema),
  - **quando** a tela carrega,
  - **então** a navegação sempre vira menu hambúrguer, independente da preferência desktop salva.

---

## 4. Cartas de Teste Exploratório (Session-Based Test Charters)

As sessões exploratórias focam no comportamento dinâmico que testes automatizados não captam com facilidade (percepção visual, usabilidade em luz baixa, comportamento em conexões instáveis de turnê).

---

### Carta 1: Experiência Mobile do Integrante em Conexão Lenta e Instável
- **Objetivo:** Investigar a usabilidade e robustez do link público `/p/[token]` em condições reais de smartphone (rua, van ou bastidores).
- **Tempo:** 45 minutos.
- **Foco:**
  - Throttle de rede simulado em "Slow 3G" e modo Offline intermitente.
  - Seleção de integrante na lista suspensa com nomes extensos ou homônimos.
  - Envio de foto de documento tirada na hora pela câmera do celular (alta resolução / orientação invertida).
  - Feedback visual `:active` em cada botão e card ao tocar na tela com polegar.
- **Fora do foco:** Telas desktop de administração, exportação de relatórios.

---

### Carta 2: Auto-Save, Reversibilidade e Concorrência no Link do Rider
- **Objetivo:** Descobrir falhas no fluxo de preenchimento da casa de show em `/r/[token]`.
- **Tempo:** 30 minutos.
- **Foco:**
  - Abrir o mesmo link de rider em duas abas simultâneas e alterar itens diferentes ao mesmo tempo.
  - Alternar freneticamente entre "Confirmar" e "Sinalizar Exceção" no mesmo item observando se o indicador "Salvo às HH:MM" mente ou desalinha do banco.
  - Colar textos gigantescos com quebras de linha e emojis no campo de nota de exceção.
- **Fora do foco:** Upload de documentos de elenco.

---

### Carta 3: Presets em Lote e Preservação de Integrantes Dispensados
- **Objetivo:** Validar se ações em lote da prancheta do show conseguem causar acidentalmente pendências indevidas.
- **Tempo:** 30 minutos.
- **Foco:**
  - Aplicar preset "Banda Completa" repetidamente no mesmo show.
  - Adicionar integrante local (ex.: motorista local) e verificar se nenhuma ação coletiva força exigência sobre ele.
  - Excluir e readicionar integrantes observando se os badges de balanço no cabeçalho mantêm a integridade matemática exata.
- **Fora do foco:** Telas de login e configurações globais de sistema.

---

## 5. Definition of Done (DoD) / Checklist "Pronto para Produção"

Antes de liberar qualquer funcionalidade do Módulo 1 V1 para uso real em turnê, o seguinte checklist deve ser cumprido integralmente:

### Checklist Técnico
- [ ] **Testes unitários automatizados:** Todos os testes em `src/lib/g3.test.ts` e suíte Vitest executam com 100% de aprovação (`npm test`).
- [ ] **Validação estrita de tipos:** `npx tsc --noEmit` conclui com código de saída 0 (zero erros de tipagem TypeScript).
- [ ] **Compilação de produção:** `npm run build` compila sem erros no preset Nitro Cloudflare-module.
- [ ] **Cobertura de risco alto:** Os requisitos classificados com Score de Risco >= 6 possuem casos de fronteira e cenários de exceção implementados e validados.
- [ ] **Segurança RLS e Tokens:** Testes de penetração lógica confirmam isolamento BOLA/IDOR nos endpoints de token público (`/p/` e `/r/`).
- [ ] **Acessibilidade de Contraste:** Cores do tema Nocturne atendem WCAG 2.2 AA (contraste >= 4.5:1 para texto normal e >= 3:1 para controles táteis).
- [ ] **Feedback Tátil Mobile:** Todos os elementos interativos possuem transição ativa de 120ms (`active:scale-[0.97]` ou equivalente) sem quebra do `:hover` desktop.
- [ ] **Zero Bugs Críticos/Altos:** Nenhum defeito de severidade crítica ou alta em aberto sem plano de mitigação aceito.

---

### Checklist Traduzido para Quem Não Lê Código

Para que a pessoa responsável pelo produto possa aprovar a entrega com total autonomia e clareza:

| Pergunta em Linguagem Simples | O que foi verificado na prática |
| :--- | :--- |
| **"Os cálculos matemáticos do sistema estão certos?"** | Sim. Testamos automaticamente dezenas de combinações: pessoas com pendências, pessoas dispensadas e cálculos de reembolso. O sistema nunca inventa pendência para quem não tem exigência. |
| **"Se alguém tentar invadir ou alterar outro show pelo link público, o sistema barra?"** | Sim. O link de um show só acessa os dados daquele show específico. Testamos tentativas deliberadas de adulterar itens de outros shows e todas foram bloqueadas. |
| **"Se o músico tentar enviar um arquivo gigante ou com vírus, o sistema aceita?"** | Não. O sistema só aceita fotos (JPG, PNG, WEBP) ou PDF de até 20 MB. Qualquer arquivo estranho ou acima do tamanho é recusado com aviso claro. |
| **"A chave Pix copiada é confiável para pagar o reembolso?"** | Sim. O botão de cópia de 1 toque copia exatamente a chave Pix cadastrada do integrante e confirma com notificação na tela qual pessoa foi copiada. |
| **"O contratante consegue preencher o rider no celular sem travar?"** | Sim. Cada clique em 'Confirmar' ou 'Exceção' salva na hora e avisa o horário do salvamento. Se ele mudar de ideia, pode reverter imediatamente sem recarregar a tela. |
| **"A tela responde ao toque no celular com sensação rápida?"** | Sim. Todo botão e card no celular encolhe levemente ao toque em 120 milissegundos, confirmando imediatamente que o clique foi registrado. |
| **"Existe algum problema grave conhecido pendente?"** | Não. Todos os itens de alto risco foram cobertos e aprovados na verificação. |

---

## 6. Template e Classificação de Bugs Encontrados

Caso qualquer anomalia seja detectada durante os testes ou homologação:

```markdown
# Bug — [Título sucinto e descritivo]

## Severidade vs. Prioridade
- **Severidade:** [Crítica | Alta | Média | Baixa]
  *(Crítica = dados vazados/perdidos; Alta = recurso quebrado sem contorno; Média = recurso quebrado com contorno; Baixa = cosmético)*
- **Prioridade:** [P1 - Imediata | P2 - Próxima Task | P3 - Backlog de Ajustes]
  *(Cruza a severidade com o Score de Risco da Matriz)*

## Passos para Reproduzir
1. Acessar a tela [...]
2. Clicar no botão [...] com o valor [...]
3. Observar a resposta do sistema.

## Resultado Esperado
[Descrever o comportamento correto conforme a especificação]

## Resultado Observado
[O que de fato aconteceu no sistema]

## Ambiente
- Dispositivo / OS: [ex.: iPhone 14 / iOS 17 / Safari Mobile ou Windows 11 / Chrome]
- Resolução / Rede: [ex.: 390x844 / Conexão móvel 4G]

## Evidência
[Anexar screenshot, log de console ou mensagem de erro]
```
