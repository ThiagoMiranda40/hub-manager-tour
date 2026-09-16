# Desenho de UI/UX e Especificação de Experiência
**Funcionalidade:** RF-14 — Negociação de Exceção do Rider Técnico via Réplica/Tréplica  
**Tarefa Relacionada:** T-17  
**Direção Visual:** Nocturne (acento roxo/lilás `#9184d9`, tipografia Inter, cantos 8–14px, hairlines sutis, microinterações de 0.18s, WCAG 2.2 AA)

---

## 1. Mapeamento de Estados Visuais do Item de Rider

O RF-14 introduz uma evolução na máquina de estados do item de rider para evitar bloqueios indefinidos no cálculo de completude (`hasMandatoryPendingOrException`), mantendo total clareza e rastreabilidade sobre acordos e itens em aberto.

### Matriz de Estados, Cores, Ícones e Rótulos (Nocturne)

| Estado Interno (`status`) | Condição / Gatilho | Rótulo Visível (Badge) | Cor / Tokens Nocturne | Ícone (Lucide) | Impacto em `hasMandatoryPendingOrException` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`confirmed`** | Casa confirmou o item sem ressalva | **Confirmado** | Esmeralda (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25`) | `<CheckCircle2 />` | **Resolvido** (Não bloqueia) |
| **`pending`** | Casa ainda não respondeu sobre o item | **Pendente** | Âmbar suave (`bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25`) | `<Clock />` | **Bloqueia** se for inegociável |
| **`exception`** *(sem réplica)* | Casa sinalizou que não atende e registrou motivo | **Exceção** | Púrpura / Alerta (`bg-purple-500/15 text-purple-900 dark:text-purple-300 border-purple-500/30` ou destrutivo se inegociável) | `<AlertTriangle />` | **Bloqueia** se for inegociável |
| **`exception`** *(com réplica/tréplica ativa)* | Produtor recusou com proposta ou Casa enviou tréplica | **Em negociação** | Azul (`bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30`) | `<MessagesSquare />` | **Bloqueia** se for inegociável (continua em tratativa) |
| **`accepted_with_exception`** | Produtor aceitou formalmente a ressalva/alternativa | **Aceito c/ ressalva** | Ciano/Teal Nocturne (`bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30`) | `<CheckCheck />` | **Resolvido** (Não bloqueia mais a completude, mantendo distinção visual) |

> **Princípio de Diferenciação Visual e Ausência de Colisão (Lei de Miller & Heurística 4):**
> - **`confirmed`** (Verde esmeralda) transmite atendimento pleno do item solicitado.
> - **`accepted_with_exception`** (Teal/Ciano + `CheckCheck`) transmite resolução pactuada — visualmente distinto de "Confirmado", não mascarando que houve alteração no equipamento original, e distinto de estados de erro.
> - **`Em negociação`** (Azul `blue-500` + `MessagesSquare`): a escolha do azul elimina qualquer colisão visual com a família roxo/púrpura de "Exceção" e com o acento `#9184d9` dos botões de ação clicáveis na mesma tela (ex.: "Enviar Réplica").

---

## 2. Fluxo Geral de Interação

```mermaid
flowchart TD
    A[Casa sinaliza Exceção em /r/token] --> B[Item fica como 'Exceção' no App do Produtor]
    B --> C{Produtor analisa na aba Rider Técnico}
    
    C -->|Opção A: Aceitar de imediato| D[Produtor clica em 'Aceitar com ressalva']
    D --> E[Status: accepted_with_exception]
    E --> F[Item considerado resolvido no balanço do Rider]
    
    C -->|Opção B: Recusar / Propor Alternativa| G[Produtor clica em 'Recusar']
    G --> H[Abre painel inline de Réplica]
    H --> I[Digita contraproposta ou motivo da recusa]
    I --> J[Envia Réplica -> Status: Em negociação - Azul]
    J --> K[Exibe botão 'Avisar Casa via WhatsApp']
    
    K --> L[Casa acessa /r/token atualizado]
    L --> M{Casa visualiza proposta da Produção}
    
    M -->|Concorda com proposta do produtor| N[Casa clica em 'Concordar com Proposta']
    N --> O[Registra mensagem na thread: 'Casa concordou com a proposta']
    O --> P[Item permanece Em negociação aguardando confirmação do produtor]
    P --> Q[Produtor revisa e clica em 'Aceitar com ressalva']
    Q --> D
    
    M -->|Não atende e sugere outro caminho| R[Casa clica em 'Responder contraproposta - Tréplica']
    R --> S[Registra mensagem de tréplica na thread]
    S --> T[Notificação in-app para o Produtor / Histórico atualizado]
    T --> C
```

### Regra de Confirmação Humana Obrigatória (Sem Fechamento Silencioso)
Quando a casa clica em **"Concordar com Proposta"**, essa ação **não fecha o item automaticamente** para `accepted_with_exception`. A ação registra na thread a concordância formal da casa (*"A casa de show concordou com a proposta da produção."*), atualiza o histórico e notifica o produtor. O fechamento formal do item continua exigindo o clique explícito do produtor em **"Aceitar com ressalva"**, respeitando a convenção do sistema de que a validação final técnica cabe sempre à equipe do artista.

---

## 3. Wireframes de Baixa Fidelidade e Experiência das Telas

### 3.1. Aba Rider Técnico do Produtor (`shows.$id.tsx`)

#### Estado A: Item em "Exceção" com Ações de Decisão
```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [PA SOM]  Microfone Shure Beta 58A  x4   [Inegociável]             [ ⚠ Exceção ]     │
│ Especificação: Cápsula supercardioide para vocalistas principais                     │
│                                                                                      │
│ ┌─ NOTA DA CASA DE SHOW ───────────────────────────────────────────────────────────┐ │
│ │ ⚠ "Dispomos de 2x Beta 58A e 2x SM58 convencionais. Atende para os backing vocals?"│ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ Ações do Produtor:                                                                   │
│ [ ✓ Aceitar com ressalva ]    [ ✕ Recusar / Propor Alternativa ]                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

#### Estado B: Painel de Réplica Expandido (Inline ao Clicar em "Recusar")
Sem modais intrusivos; expansão inline no próprio card (Heurística 3):
```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [PA SOM]  Microfone Shure Beta 58A  x4   [Inegociável]             [ ⚠ Exceção ]     │
│ Especificação: Cápsula supercardioide para vocalistas principais                     │
│                                                                                      │
│ ┌─ RESPOSTA DA PRODUÇÃO (RÉPLICA) ─────────────────────────────────────────────────┐ │
│ │ Proponha uma alternativa viável ou justifique a necessidade do item:             │ │
│ │ ┌──────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Os 2 SM58 atendem os backings, mas precisamos de mais 1 Beta 58 pro vocal    │ │ │
│ │ │ principal e 1 reserva de palco. Conseguem locar 1 unidade adicional?         │ │ │
│ │ └──────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ [ Cancelar ]                                            [ Enviar Réplica ➔ ]    │ │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

#### Estado C: Histórico de Negociação Ativo + Botão de Reenvio WhatsApp
```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [PA SOM]  Microfone Shure Beta 58A  x4   [Inegociável]      [ 💬 Em negociação ]     │
│                                                                                      │
│ ┌─ HISTÓRICO DE NEGOCIAÇÃO ────────────────────────────────────────────────────────┐ │
│ │ 🏠 Casa de Show (14/09 14:20):                                                   │ │
│ │   "Dispomos de 2x Beta 58A e 2x SM58. Atende?"                                    │ │
│ │                                                                                  │ │
│ │ 👤 Produção (14/09 16:05):                                                       │ │
│ │   "Os 2 SM58 atendem backings, mas precisamos de 1 Beta 58 extra pro lead vocal. │ │
│ │    Conseguem locar?"                                                             │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ ┌─ 🟢 REENVIAR ATUALIZAÇÃO VIA WHATSAPP ───────────────────────────────────────────┐ │
│ │ [ 💬 Avisar Casa via WhatsApp ] ─ Abre mensagem com link de resposta oficial     │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ [ Aceitar condição atual com ressalva ]               [ Adicionar nova réplica ]     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2. Experiência da Casa de Show em `/r/[token]` (Fricção Zero)

A casa de show não precisa de login nem treinamento prévio:
```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [PA SOM]  Microfone Shure Beta 58A  x4   [Inegociável]      [ 💬 Ajuste Solicitado ] │
│ Sua observação anterior: "Dispomos de 2x Beta 58A e 2x SM58. Atende?"                │
│                                                                                      │
│ ┌─ RETORNO DA PRODUÇÃO DO ARTISTA ─────────────────────────────────────────────────┐ │
│ │ 👤 Mensagem da Produção:                                                         │ │
│ │ "Os 2 SM58 atendem backings, mas precisamos de 1 Beta 58 extra pro lead vocal.   │ │
│ │  Conseguem locar essa unidade?"                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ Como a casa pode responder:                                                          │
│ [ ✓ Concordar com Proposta ]              [ 💬 Responder contraproposta (Tréplica) ] │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- **Clique em "Concordar com Proposta":** registra imediatamente a concordância da casa na thread via auto-save, mantendo o item sob validação final do produtor.
- **Clique em "Responder contraproposta":** abre campo de texto inline com botão **"Enviar Resposta"**, salvando a tréplica no mesmo padrão anti-IDOR já vigente.

---

### 3.3. Indicador no Relatório de Produção (`shows.$id_.ficha.tsx`)

Para preservar as 6 colunas existentes da tabela sem causar quebra horizontal em telas mobile ou na impressão, a negociação é expressa na célula **"Status da Casa"**:

```text
┌─────────────────────────────────┬─────┬──────────────┬───────────────────────────────┐
│ Item & Especificação            │ Qtd │ Grau         │ Status da Casa                │
├─────────────────────────────────┼─────┼──────────────┼───────────────────────────────┤
│ Microfone Shure Beta 58A        │  4  │ Inegociável  │ 💬 Em negociação              │
│ Shure Beta 58A supercardioide   │     │              │ Úl.: Produção solicitou loc.  │
│                                 │     │              │ de 1 unidade adicional        │
├─────────────────────────────────┼─────┼──────────────┼───────────────────────────────┤
│ Mesa Yamaha CL5                 │  1  │ Inegociável  │ ✓ Aceito c/ ressalva          │
│ Dante 64 canais                 │     │              │ Acordado: Mesa QL5 c/ Rio32   │
└─────────────────────────────────┴─────┴──────────────┴───────────────────────────────┘
```
- Em tela: badge azul `Em negociação` ou ciano `✓ Aceito c/ ressalva` com snippet da mensagem mais recente em `text-[10px]`.
- Em impressão/PDF: texto em preto com alta legibilidade (`print:text-black`), sem truncamento.

---

## 4. Texto da Mensagem de WhatsApp (Heurística 2 e Prevenção de Desvios)

A mensagem aproveita a função `buildWhatsAppLink` existente. O texto aplica a **Heurística 2 (Mundo Real)** e a **Heurística 5 (Prevenção de Erros)**, explicitando de forma amigável por que a resposta oficial deve ser dada através do link:

```text
Olá! Aqui é da produção do show de *{{artist_name}}* ({{show_date}}).

Atualizamos a negociação do rider técnico sobre o item *{{item_name}}*:

> "{{reply_summary}}"

Para que o acordo fique registrado diretamente na ficha oficial de montagem do palco, por favor responda pelo link exclusivo:
🔗 {{rider_public_url}}

(Basta clicar no link e confirmar ou responder — sem necessidade de login).

Muito obrigado pela parceria! 🎸
```

---

## 5. Avaliação Heurística de Nielsen

1. **Visibilidade do status do sistema:** Estados distintos (Confirmado, Pendente, Exceção, Em negociação, Aceito com ressalva) visíveis no resumo superior e nos cards individuais.
2. **Correspondência com o mundo real:** Termos da rotina de produção de shows ("Réplica", "Tréplica", "Ressalva", "Montagem de palco").
3. **Controle e liberdade do usuário:** Formulário de réplica cancelável a qualquer momento; reversibilidade das decisões.
4. **Consistência e padrões:** Padrão de cards expansíveis alinhado com a conferência física do palco e demais abas do sistema.
5. **Prevenção de erros:** O texto do WhatsApp e a interface pública canalizam a resposta para o link oficial, evitando mensagens perdidas em chats pessoais.
6. **Reconhecimento em vez de memorização:** Histórico integral das rodadas visível inline para produtor e casa de show.
7. **Flexibilidade e eficiência:** Atalho direto para aceitar ressalva em 1 clique quando a proposta for imediatamente satisfatória.
8. **Design estético e minimalista:** Informações organizadas em cartões com hairlines sutis, sem poluição visual.
9. **Diagnóstico e recuperação de erros:** Manutenção do texto digitado no formulário em caso de oscilação de rede durante o envio.
10. **Ajuda e documentação:** Dicas contextuais nos placeholders orientando propostas de marcas/modelos substitutos.

---

## 6. Acessibilidade (WCAG 2.2 AA / POUR)

- **Perceptível:** Contraste mínimo de 4.5:1 verificado em todos os estados de texto e badges (inclusive o novo azul `blue-500` e o ciano/teal). Ícones acompanhados de rótulos semânticos e `aria-hidden="true"`.
- **Operável:** Suporte integral a navegação por teclado (`Tab`, `Enter`, `Space`, `Esc`). Áreas de toque mobile com altura mínima de 44px (ou 48px no modo palco).
- **Compreensível:** Identificação explícita do autor em cada mensagem da thread ("Casa de Show", "Produção"), com carimbo de data e hora.
- **Robusto:** Elementos nativos de formulário semântico e compatibilidade com leitores de tela.

---

## 7. Diretrizes de Segurança e Blindagem de Interface (AppSec)

1. **Caminho de Leitura Público Seguro (`getPublicRider`):**
   - O histórico de mensagens de cada item é recuperado e filtrado no servidor estritamente pelo `show.id` validado a partir do `rider_public_token`.
   - Nenhum dado de outros shows, cachês, credenciais ou tabelas não relacionadas é exposto na resposta da Server Function.
2. **Regra Absoluta de Exibição de Texto Puro (Anti-Phishing / Anti-XSS):**
   - É terminantemente vedada a detecção automática e conversão de textos em links clicáveis (`<a>`), tanto na interface do produtor quanto na rota pública da casa.
   - Todo conteúdo digitado é renderizado estritamente como texto puro escapado pelo React, prevenindo ataques de phishing e injeção de links maliciosos.
3. **Controle de Taxa em Duas Camadas (Anti-Abuso e Anti-Spam):**
   - **Camada por Item:** intervalo mínimo de 5 segundos entre mensagens e teto de 30 mensagens por thread de item.
   - **Camada Global por Token:** máximo de 10 mensagens por minuto somando todos os itens daquele `rider_public_token`, impedindo ataques distribuídos em múltiplos itens em paralelo.

