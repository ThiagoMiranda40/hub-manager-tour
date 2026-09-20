# Chatbase × Hub Manager Tour — mapa de oportunidades

Data: 20/09/2026. Base: documentação oficial do Chatbase (índice `llms.txt` com ~170 páginas) e o PRD do Hub Manager Tour (`docs/HubManagerTour-PRD-Completo.md`).

**Versão 3 (20/09/2026).** Este arquivo **substitui** as versões anteriores (mesmo nome). Ele mantém o texto da rodada 1 (com duas correções pontuais nas seções 0 e 6.1), o **Adendo da rodada 2** (página de ajuda e vídeos, restrições de plano e novas oportunidades) e a **Seção E**, com os dados reais do seu plano, tirados dos seus prints.

## 0. Como esta análise foi feita (e o que ela não cobre)
- **Li na íntegra** as páginas que decidem o valor para o produto: introdução, primeiro agente, boas práticas, Backstage, fontes de dados, canais (bolha, página de ajuda, Center Stage), visão geral de ações, ação personalizada, escalonamento, coleta de dados, procedimentos, guardrails, contatos, verificação de identidade, embed JavaScript, controle da bolha, ouvintes de eventos, ações no navegador (client-side), webhooks, widgets, WhatsApp, API v2 de WhatsApp, API v2 de fontes, API v2 de voz, atividade, analytics, configurações, proxy da página de ajuda e FAQ.
- **Rodada 2 (adendo no fim do arquivo):** li também Playground, Build, ações de botão, mensagens sugeridas, mensagens iniciais e flutuantes, formulários no navegador, coleta de leads, chat ao vivo, busca na web, e-mail, campanhas de saída e modelos do WhatsApp, como os procedimentos rodam, visão geral e usuários da API v2, configurações do workspace (planos), Helpdesk (visão geral), Zapier, CLI e os componentes de widgets (mídia, texto, funções).
- **Ainda não li:** o restante do Helpdesk (filtros, times, agendas, triggers), integrações de plataformas que o produto não usa (Shopify, Zendesk, Salesforce, Intercom etc.), plataformas de site (Webflow, Wix etc.), Slack/Instagram/Messenger/Twilio em detalhe, SDKs Android/iOS, a referência endpoint a endpoint da API e os demais componentes de widget. Onde uma oportunidade depende delas, está marcado "a verificar".
- **Não sei o que o plano atual (AppSumo Nível 2) inclui.** Várias funções dependem de plano (acesso à API, modo de voz, re-sincronização automática, limite diário do Backstage). Os cuidados estão na seção 10 (item 6).

## 1. Resumo executivo

| # | Oportunidade | Quando | Esforço | Impacto | Recomendação |
|---|---|---|---|---|---|
| 1 | Guardrails, limite de créditos e modelo econômico | Agora | Baixo | Alto (evita agente "indisponível" por falta de crédito) | Fazer já |
| 2 | "Reportar problema / sugerir melhoria" com a ação Collect Data | Agora | Baixo | Alto (entrega parte do RF-15 sem código) | Fazer já |
| 3 | Ajuda contextual: sugestões por tela e botão "?" que abre o chat com a pergunta pronta | Agora | Baixo a médio | Alto | Fazer já (pequena tarefa de código) |
| 4 | Rotina semanal de melhoria: Revise, respostas de baixa confiança, tópicos e resumo diário por e-mail | Agora | Baixo | Alto (a base melhora com o uso real) | Fazer já |
| 5 | Página de ajuda (Help page) ligada às páginas públicas, sem colocar o widget em URLs com token | Agora | Baixo | Médio | Fazer já |
| 6 | Sincronizar a base do repositório com o Chatbase automaticamente (API/CLI de fontes) | Próximas semanas | Médio | Médio a alto (evita base desatualizada) | Planejar |
| 7 | Lembretes automáticos por WhatsApp (API v2 de modelos) para documentos pendentes | Fase 1 (pós-MVP) | Médio a alto | Muito alto (o problema original: a passagem esquecida) | Planejar como Grande aposta |
| 8 | Assistente que age: ações no navegador para navegar e consultar dados do usuário logado | Fase 1 a 2 | Médio | Alto | Piloto somente leitura |
| 9 | Onboarding guiado por procedimento (primeiro show em passos) | Fase comercial | Médio | Alto para ativação | Planejar |
| 10 | Agente de vendas na landing page, com captação de leads e agenda de demonstração | Fase comercial | Médio | Alto | Planejar |
| 11 | Camada conversacional do Módulo 5 (WhatsApp, imagem, voz) em piloto sobre o Chatbase | Fase 7 (antecipável) | Alto | Muito alto | Piloto antes de decidir construir ou comprar |
| 12 | Chamado estruturado (Escalations/Helpdesk) no lugar do e-mail de contato | Quando houver clientes | Médio | Médio | Depois |

## 2. Agora: turbinar o agente de suporte que já existe

### 2.1 Proteger o agente e o bolso (Build > Guardrails e Settings > General)
- **Limite de mensagens** por dispositivo (Rate limit), **detecção de spam** (pausa a conversa e o agente para de responder) e **limite de créditos por agente** ("Credits limit"). Sem isso, um abuso ou um loop consome os créditos do mês e o agente passa a exibir "This AI Agent is currently unavailable".
- **Modelo:** cada resposta custa de 1 a 6 créditos conforme o modelo (FAQ). Para suporte de uso, um modelo de 1 a 2 créditos costuma bastar; compare no **Compare** do Build antes de decidir.
- **Bloqueio por país:** *não recomendo*. Turnês passam por outros países e o produtor pode estar no exterior.
- Plano de contingência: se os créditos acabarem, o usuário vê a mensagem de indisponível. Vale colocar no rodapé do widget o e-mail de contato.

### 2.2 Ajuda contextual dentro do sistema (JavaScript embed + controle da bolha)
Com o script embutido no `AppShell`, dá para controlar o widget por código (`window.chatbase`):
- `setSuggestedMessages([...])` (até 4, 200 caracteres cada) e `setInitialMessages` **por tela**. Na aba Reembolsos, os botões sugeridos passam a ser "Como pago um reembolso?", "Por que a chave Pix não aparece?" etc.
- `open({ message })`: um botão **"?"** ao lado de cada aba ou recurso abre o chat **já com a pergunta feita**, por exemplo "Como funciona o Modo Palco?". Com `hideMessage: true` a pergunta vai oculta e parece que o assistente puxou o assunto.
- `close()` ao entrar no **Modo Palco** para o balão não cobrir botões (a documentação não descreve como esconder o botão flutuante; testar).
- `setDisplayName`, `setFooterText`, `setMessagePlaceholder` e `setDismissibleNotice` permitem textos por contexto.
- `resetChat()` ao trocar de show, para a conversa não carregar contexto do show anterior.
- **Onde carregar:** só na área logada, dentro do `AppShell`. **Nunca** nas rotas públicas `/p/<token>` e `/r/<token>`: a URL carrega o token de acesso e um script de terceiros pode lê-la.
- **Domínios permitidos** ("Allowed domains" no Deploy): restrinja ao domínio do app. Como o domínio oficial está migrando, incluir o novo e manter o antigo durante a transição.

### 2.3 Feedback e melhoria contínua (Activity, Analytics, Revise)
- **Revise answer:** corrige uma resposta ruim e a transforma em Q&A que o agente passa a usar. É a forma mais rápida de "ensinar" o agente com casos reais.
- **Confidence score:** filtre as respostas de baixa confiança toda semana: apontam lacunas na base.
- **Analytics > Tópicos e Sentimento:** mostram sobre o que os produtores perguntam e onde se frustram. É um mapa de atrito da interface: pergunta muito repetida é candidata a melhoria de tela, texto ou tooltip.
- **Q&A com "Usage insights":** cada Q&A mostra quantas vezes foi perguntado.
- **Feedback com polegar** (Collect user feedback): ativa o joinha nas respostas.
- **Notificações (Settings > Notifications):** e-mail diário com as conversas do dia, sem código.
- **Backstage:** operar o agente em linguagem natural ("quais perguntas o agente não soube responder?", "atualize o tom das instruções") com aprovação antes de aplicar. Limite diário de mensagens por plano.

### 2.4 Anexos: capturas de tela de erros
A bolha aceita **imagens (png/jpg) e PDF** enviados pelo usuário, com limites: até 5 arquivos por mensagem, 5 MB por arquivo, PDF de até 5 páginas. O agente analisa. Serve para "apareceu esta tela, o que significa?". Consome crédito extra por anexo, então vale ativar e observar.

### 2.5 Ditado por voz
O ícone de microfone na caixa de mensagem (Voice to text) já converte fala em texto para o usuário revisar antes de enviar. Útil para o produtor que está no palco. Há um evento (`dictation-transcript`) para medir o uso.

### 2.6 Página de ajuda (Help page) para quem não tem login
O Chatbase hospeda uma página de conversa inteira (`chatbase.co/{id}/help`) e permite servir no seu domínio por um proxy de rotas (`/help`, `/__cb/*`, `/api/chat/{id}/*`). O método é gratuito, segundo a documentação. Aplicações para o Hub Manager Tour:
- Link "Precisa de ajuda?" nas páginas do integrante e da casa de show, levando à página de ajuda, sem inserir o widget nelas.
- Link na tela de login: hoje não há "esqueci minha senha", e o agente pode orientar até o item entrar no backlog.
- Alternativa provisória à página de tutoriais do RF-15.
- Detalhe: a página de ajuda é um canal do **mesmo agente**, então usa as mesmas fontes de dados. Cada canal pode ter **instruções próprias** (a opção "Sync with global instructions" existe na bolha; a verificar na página de ajuda). Se for preciso uma base só para integrantes e casas de show (arquivo 11), o caminho é um **segundo agente**.

## 3. Suporte humano e operação

### 3.1 "Reportar problema / sugerir melhoria" (Collect Data)
Uma ação **Collect Data** faz o agente coletar em conversa campos que você define (até 20; texto, número, e-mail, data, booleano): por exemplo *tela*, *o que estava tentando fazer*, *mensagem de erro*, *gravidade*. Cada envio vira:
- Linha em **Activity > Collected data** (exporta CSV/PDF);
- **E-mail** de notificação para os endereços que você definir;
- **Webhook** (`{nome da ação}_collect_data.submit`) opcional, que pode criar um cartão no Trello ou uma issue no GitHub por Zapier, n8n ou um endpoint próprio.
Isso entrega, sem código, parte do RF-15 (canal de feedback) e alimenta o backlog com dado real.

### 3.2 Escalar para humano (Escalations, Chatbase Helpdesk)
O agente abre um **chamado** (assunto, descrição e campos personalizados, como show e tela) no Helpdesk do Chatbase (ou em Zendesk, Freshdesk, HubSpot etc.), com resumo da conversa. Há triagem, prioridade, tags, roteamento, tradução, rascunhos de resposta por IA e transferência em tempo real (live chat). Para uma operação solo, o ganho hoje é pequeno frente ao e-mail; passa a valer quando houver dezenas de clientes. *A verificar:* se o plano inclui o Helpdesk.

### 3.3 Fluxos guiados de diagnóstico (Procedures)
Um **procedimento** é um passo a passo com gatilho, até 15 passos, ramificações e referência a ações. Candidatos:
- "Integrante não consegue enviar arquivo" (formato, tamanho, link, reenviar).
- "Reembolso sem Pix" (leva o usuário a Pessoas & Equipe).
- "Casa de show não entende como responder o rider".
Aparecem nas análises (disparados, pendentes, resolvidos), que medem quais problemas são mais comuns. Ações sensíveis podem ser marcadas "Only use in procedures".

## 4. Aquisição e vendas (landing page hubmanagertour.com.br)
Um **segundo agente**, com base própria de marketing (não misturar com a base de suporte):
- **Collect Leads** (formulário na conversa ou conversacional) com campos personalizados: nome, e-mail, telefone, tamanho da produtora, quantidade de turnês por ano. O webhook `leads.submit` leva o contato para a sua planilha, CRM ou Trello.
- **Agendamento de demonstração** com as ações **Calendly** ou **Cal.com**.
- **Mensagem proativa** em páginas de intenção (`open({ message, hideMessage: true })`, exemplo oficial na página de preços).
- **Teste A/B / lançamento gradual:** exibir o agente para uma porcentagem dos visitantes.
- **Analytics:** os tópicos mostram as objeções e dúvidas dos interessados.
- **Canal WhatsApp** dedicado às vendas (número exclusivo do agente, veja 6.1).
- Cuidados: instruções proibindo promessa de preço, prazo ou funcionalidade futura; rodapé com aviso de IA e política de privacidade (o rodapé aceita links `https://`).

## 5. Onboarding e ativação (fase comercial, produtores que se cadastram sozinhos)
- **Procedimento de onboarding** ("primeiro show em 5 passos") com variáveis do contato e da sessão (`{{user.name}}` etc.) e ações no navegador para levar o usuário à tela certa a cada passo. A taxa de "resolvidos" do procedimento vira uma métrica de ativação.
- **Widgets:** cartões e tabelas interativos dentro do chat (checklist de onboarding, resumo do show).
- **Identidade:** a **verificação por JWT** (segredo no servidor, que no Hub Manager Tour seria uma função servidora da Cloudflare) identifica o produtor logado e sincroniza atributos (por exemplo, número de shows). Dados dentro do token não são vistos pelo agente; atributos públicos passados fora do token **são** vistos: nunca colocar dado sensível fora do token.
- **E-mails ou WhatsApp de ativação** por campanhas de saída (a verificar; depende de contatos, opt-in e modelos aprovados).

## 6. Comunicação com integrantes e casas de show

### 6.1 Lembretes automáticos por WhatsApp (o problema original do produto)
A **API v2 de WhatsApp** envia **modelos aprovados pela Meta** a qualquer número, a partir do número conectado ao agente, e as respostas continuam na conversa do agente. Aplicação direta: o sistema detecta "documento pendente há X dias" e dispara um lembrete com o link individual do integrante.
- Requisitos: número de WhatsApp Business **exclusivo do agente** (não pode ser usado no app comum), modelos aprovados (mensagem fora da janela de 24 h só com modelo) e **forma de pagamento cadastrada na Meta**.
- **Custo (correção, rodada 2):** a página de integração cita 1.000 mensagens gratuitas por mês, mas as páginas de campanhas e de modelos dizem que a **Meta cobra cada mensagem de modelo**, com preço que varia por país e por categoria (Utilidade, Marketing, Autenticação). Não assuma que os lembretes serão gratuitos: confira a tabela de preços da Meta para o Brasil antes de decidir.
- Detalhe técnico: modelos com botão de URL que tenha variável **não** podem ser enviados pela API; colocar o link no corpo do modelo (variável de texto).
- Rotina no lado do Hub Manager Tour: um gatilho agendado (cron) que consulta pendências e chama a API; registrar o envio; respeitar consentimento do integrante (LGPD).
- Ganho adicional: se o integrante responder, o agente responde dúvidas ("como envio?") com uma base voltada ao integrante.
- Resolve a limitação atual ("o sistema não envia mensagens sozinho").

### 6.2 Enviar comprovante por WhatsApp
O WhatsApp aceita anexos (imagem e PDF) e o agente analisa. Um fluxo "mande a foto da passagem por aqui" exigiria uma **ação de servidor** que grave o arquivo no Hub Manager Tour com o token do integrante. Alto valor, esforço alto e superfície de segurança relevante: tratar como piloto.

### 6.3 Casa de show
Um agente de página de ajuda para a casa (base do arquivo 11, parte B) reduz o vai-e-volta de "como respondo o rider?". Sem widget na URL com token.

## 7. Por fase do roadmap do PRD

| Fase | Módulo | Onde o Chatbase ajuda | Fit |
|---|---|---|---|
| 0 e 1 | Protótipo e MVP V1 | Tudo das seções 2, 3 e 6.1; RF-15 provisório (ajuda + feedback) | Alto |
| 2 | Contratos e Assinatura | Explicar o processo de assinatura ao usuário. **Não usar para analisar contratos**: anexos têm limite de 5 páginas e ~2.000 tokens por página; a análise por IA do módulo deve ficar em pipeline próprio | Baixo (suporte) / não recomendado (análise) |
| 3 | Logística Inteligente | Conversa sobre opções de passagem e hospedagem: a **ação personalizada** chama a API de busca do Hub Manager Tour e um **widget** exibe as opções com botão "Aprovar". Há também a ação **Web search**. O motor de busca em si continua no backend | Médio |
| 4 | CRM e Marketing | **Campanhas de WhatsApp de saída** com modelos, rastreio de entrega e respostas tratadas pelo agente; usa a API oficial da Meta (em geral, menor risco de bloqueio que soluções não oficiais). Depende da validação jurídica de LGPD do PRD; custo por mensagem acima do gratuito (a verificar) | Médio |
| 5 e 6 | Ingressos e Checkout | Atendimento ao público: canais **Instagram (DM e comentários)**, WhatsApp e Messenger com a base por show ("onde retiro meu ingresso?"); **ação personalizada** para consultar pedido no Hub Manager Tour | Médio a alto |
| 7 | Agente Operacional Conversacional | Sobreposição direta: WhatsApp, imagem, voz (modo de voz e telefone), **ações de servidor** que chamam a API do sistema, **procedimentos** para operações com passos e confirmação, e lembretes proativos. É um caminho para antecipar o módulo em piloto | Muito alto |
| 8 | Financeiro | Perguntas em linguagem natural sobre gastos ("quanto gastei com logística na turnê X?") por ação personalizada que devolve dados agregados (resposta de até 20 KB) e **widgets** com tabelas e gráficos | Médio |

### 7.1 Módulo 5: construir ou usar o Chatbase?
Prós de usar o Chatbase como camada conversacional: canais prontos (WhatsApp, voz, telefone), análise de conversas, anexos, procedimentos, rapidez para piloto. Contras: créditos por resposta (voz custa 6 créditos por minuto, mais o modelo), limites técnicos (resposta de ação até 20 KB, JSON obrigatório), dependência de fornecedor, dados da conversa no serviço, e confiabilidade de uma ação de escrita conduzida por IA.
**Recomendação:** piloto **somente leitura** com o Jeff (consultar status, pendências, resumo por show), sem ações de escrita, para medir uso real antes de investir. Manter a camada de API do Hub Manager Tour limpa (endpoints com escopo e idempotentes) para que a camada conversacional seja trocável.

## 8. Assistente que age: ações no navegador (client-side)
As **ações no navegador** rodam no navegador do usuário com a sessão dele. No Hub Manager Tour:
- **Navegar:** "me leve para os reembolsos do show de Curitiba" chama uma função registrada que usa o roteador do app.
- **Consultar (somente leitura):** "quem ainda não enviou passagem no show X?" chama a mesma consulta que a tela usa; como roda com a sessão do usuário, as regras de acesso do banco (RLS) continuam valendo.
- **Copiar link do integrante:** ação que aciona o mesmo botão da tela.
Cuidados: o que a função devolve **vai para o Chatbase** (terceiro), então devolver o mínimo (contagens, nomes de tela, sem Pix, CPF, telefone, tokens); não funciona no Playground (testar no app real); os nomes das ações devem coincidir exatamente com os das funções registradas. Ações de escrita: só depois do piloto e com confirmação explícita.

## 9. Sincronizar a base do repositório com o Chatbase
A **API v2 de fontes** e a **CLI** permitem criar, atualizar e apagar fontes (texto, Q&A, link e arquivo) sem o painel; fontes treinam ao ser gravadas. Fluxo sugerido: uma GitHub Action que, ao mesclar mudanças em `docs/base-de-conhecimento/`, atualiza os arquivos correspondentes (endpoint de "update file source" substitui o conteúdo). Limites: 10 envios de arquivo por minuto; os envios de arquivo usam outro host da API; necessidade de chave de API (a verificar se o plano dá acesso). Isso fecha o ciclo com a regra do AGENTS.md ("toda entrega atualiza a base").
Alternativa mais simples: **Add website** apontando para uma página pública de ajuda do próprio produto (por exemplo, a futura Central de Conteúdo do RF-15), com re-sincronização semanal (planos Standard/Pro).

## 10. Riscos e cuidados
1. **Créditos:** quando acabam, o agente para. Use limite por agente, rate limit, modelo econômico e acompanhe a página Usage. Voz e anexos gastam mais.
2. **LGPD e privacidade:** as conversas ficam no Chatbase (servidores AWS; a documentação cita SOC 2 e conformidade com GDPR, e diz que seus dados não treinam outros modelos). Tratar a transferência internacional na política de privacidade e validar com apoio jurídico, como já previsto no PRD. Aviso no widget (o rodapé aceita link) e instrução para não enviar senhas, links de acesso ou Pix. Dados pessoais só dentro do JWT, nunca em atributos públicos.
3. **URLs com token:** não carregar o widget nas rotas `/p/` e `/r/`.
4. **Alucinação:** instruções que restrinjam a resposta à base, mensagem de fallback e encaminhamento ao e-mail de contato. Revisão semanal das respostas de baixa confiança.
5. **Dependência de fornecedor:** a base fica no repositório (fonte oficial); a camada de API do sistema não deve depender do Chatbase.
6. **Plano:** confirmar o que o plano atual inclui antes de qualquer desenvolvimento que dependa de API, voz, WhatsApp ou Helpdesk.
7. **Domínios:** manter a lista de domínios permitidos alinhada com a padronização do domínio oficial.

## 11. O que não vale a pena (agora)
- Ações de Stripe e Shopify (o sistema usa Asaas/AbacatePay e não vende produto).
- Bloqueio de países.
- Fonte Notion (a base já está no repositório).
- Telefone (Twilio/SIP) e voz dentro do app antes do piloto do Módulo 5.
- Análise de contratos por anexo (limite de 5 páginas).
- Helpdesk completo enquanto a operação for solo.

## 12. Sequência sugerida
**Esta semana (sem código):** guardrails e limite de créditos; escolher o modelo; Collect Data de feedback com e-mail; ativar polegar e resumo diário; rotina semanal de Revise; ativar anexos; configurar a página de ajuda.
**Próximas 2 a 4 semanas (pequenas tarefas de código):** script no `AppShell` com identidade (JWT), sugestões por tela, botões "?", `close()` no Modo Palco, domínios permitidos; link da página de ajuda nas páginas públicas.
**30 a 60 dias:** sincronização da base por CI; lembretes por WhatsApp (definir número, modelos e gatilho); piloto de ações no navegador somente leitura.
**Fase comercial:** agente de vendas na landing com leads e agenda; procedimento de onboarding.
**Decisão futura:** piloto do Módulo 5 sobre o Chatbase, depois de dados reais de uso.

## 13. Fontes consultadas (documentação oficial)
Rodada 1: Introdução; Primeiro agente; Boas práticas; Backstage; Fontes de dados; Canais; Visão geral de ações; Ação personalizada; Escalonamento; Coleta de dados; Procedimentos; Guardrails; Contatos; Verificação de identidade; Embed JavaScript; Controle da bolha; Ouvintes de eventos; Ações no navegador; Webhooks; Widgets; WhatsApp; API v2 de WhatsApp, fontes e voz; Atividade; Analytics; Configurações; Proxy da página de ajuda; FAQ; índice `llms.txt`.


---

# ADENDO — Rodada 2 (20/09/2026)

## A. A página de ajuda (Help page) pode substituir a área de tutoriais da Central de Conteúdo (RF-15)? E dá para colocar vídeos nela?

**O que a documentação descreve da Help page:** uma página **centrada em conversa**, hospedada pelo Chatbase (`chatbase.co/{id}/help`), com título e favicon, mensagem de boas-vindas, campo de mensagem, mensagens sugeridas, logotipos e imagem de destaque (claro e escuro), cores, botões primário e secundário na barra lateral, botões de link no rodapé, ditado por voz e anexos. Pode ser servida no seu domínio por um proxy de rotas gratuito. **Não descreve** editor de páginas, artigos, biblioteca de vídeos, player ou incorporação (embed) de vídeo.

**Sobre vídeos (o que confirmei):**
- Os componentes visuais dos widgets são Ícone, Imagem, Selo e Transição. **Não há componente de vídeo nem de iframe.** O componente de texto (Markdown) renderiza títulos, listas, links e código.
- O que dá para fazer: (1) o agente responder com **link** para o vídeo; (2) um **cartão de widget** com miniatura (Imagem) e botão "Assistir", que abre o vídeo em **nova aba** (função Link); (3) uma ação **Custom Button**, que tem um botão por ação (uma URL só), então não escala para uma biblioteca; (4) botões de link na lateral ou no rodapé da Help page apontando para a sua página de vídeos.
- O Chatbase **não assiste vídeos**: a página de boas práticas diz que ele só aprende de texto legível. Para o agente "saber" o conteúdo de um vídeo, é preciso **transcrição em texto** (por exemplo, as legendas do próprio YouTube ou uma transcrição gerada) como fonte de dados. É uma sugestão minha; a documentação não trata de vídeo.

**Recomendação: modelo híbrido, não substituição.**
- **A Help page (ou o widget) vira a "porta de entrada" inteligente:** responde a dúvida em linguagem natural e entrega o vídeo certo. Isso substitui a parte de **perguntas e passo a passo em texto** da Central de Conteúdo, e é mais dinâmico do que um FAQ estático.
- **Os vídeos ficam em páginas suas** (Central de Conteúdo enxuta), com player incorporado (YouTube não listado, Vimeo ou Cloudflare Stream), organizadas por recurso. Motivos: navegação visual ("o que posso aprender?"), SEO se as páginas forem públicas, métricas de visualização e controle do visual.
- **Ligar os dois:** (a) cada seção da base de conhecimento do agente ganha uma linha "Vídeo: URL", e o agente passa a citar o link certo; (b) cada cartão de vídeo tem um botão "Perguntar sobre este vídeo" que usa `window.chatbase.open({ message })`; (c) transcrições dos vídeos entram como fontes, e o agente aponta o trecho (links do YouTube aceitam tempo, como `?t=120`, recurso do YouTube e não do Chatbase).
- **Efeito no escopo do RF-15:** o item pode ser reduzido a **biblioteca de vídeos + changelog/roadmap + feedback**; a parte de perguntas e respostas passa para o agente. Isso diminui o esforço do RF-15.
- **Um cuidado de experiência:** uma página só de chat é ruim para descobrir o que existe. Use mensagens sugeridas e botões de atalho para os temas principais.
- **Alternativa de layout:** o Chatbase oferece o embed por iframe (sem os recursos avançados), que dá para colocar ao lado dos vídeos numa página da Central de Conteúdo.

## B. Restrições de plano que afetam várias oportunidades
- **API v2 exige plano Standard ou superior** (visão geral da API e CLI). Dependem disso: sincronizar a base por CI/CLI, enviar modelos de WhatsApp por API, sessões de voz, interface de chat própria e a integração com Zapier (usa chave de API). A página "API keys" nem aparece em todos os planos.
- **Re-sincronização automática de sites:** planos Standard e Pro.
- **Remover "Powered by Chatbase"** é um add-on pago (é preciso ter um plano base antes). **Domínios personalizados** do embed: somente Enterprise. Os **logs de auditoria** também são Enterprise. A **recarga automática de créditos** é um add-on.
- **Como descobrir o que o seu plano tem:** no Chatbase, Workspace settings → Plans. O cartão "Current Plan" só aparece para planos legados e lista recursos e limites. Vale me mandar um print dessa tela.

## C. Novas oportunidades desta rodada
1. **Canal de e-mail com IA** (`suporte@hubmanagertour.com.br`): o agente responde e-mails de um domínio da empresa (exige DKIM, SPF e encaminhamento, que a Cloudflare permite configurar). Tem **atraso de resposta de até 1 hora** (janela para você intervir), aviso "composto por IA", lista de remetentes bloqueados e detecção de spam. Substitui o `contato@` provisório.
2. **Fluxos guiados de tutorial:** a ação **Suggested Messages** gera sugestões dinâmicas após cada resposta (bolha e Help page); manuais, até 4 de 40 caracteres, com a opção de bloquear a digitação ("Disable input field") para um passo a passo por escolhas.
3. **Suporte dentro do próprio chat:** respostas de chamados do Helpdesk chegam por e-mail e também na bolha (menu ••• → "View tickets"). Há "AI Compose" (tom, gramática, tradução) e a visão "Conversations" com todas as conversas. O "Chat ao vivo" só faz sentido com pessoas para atender.
4. **Campanhas de WhatsApp sem código** (menu Outbound): público filtrado por atributos do contato, personalização, respostas pela IA ou por chamados (human takeover, com o nome da campanha) e funil Enfileirado → Enviado → Entregue → Lido → Respondido. Precisa de contatos com telefone, modelo aprovado e forma de pagamento na Meta. Serve para lembretes e onboarding sem programar (a API cobre o disparo automático).
5. **Interface de chat própria** pela API v2 (streaming, histórico por usuário, feedback, ações no cliente): visual 100% do Hub Manager Tour, sem script de terceiro nas páginas e com a chave de API só no servidor. Aumenta o esforço; exige plano Standard.
6. **Análise de produto com dados reais:** a API de exportação devolve as conversas de **todas as fontes**, com mensagens e resultados de ações. Um job noturno para o seu banco permitiria agrupar as perguntas frequentes e alimentar o backlog.
7. **Zapier:** usa o agente como passo de automação, por exemplo rascunhar respostas a e-mails de suporte a partir da documentação (com você aprovando), categorizar e priorizar e-mails, e analisar formulários de feedback. Exige chave de API.
8. **Testes e lançamento:** o Playground tem **Chat as user** (simula usuário identificado) e **Preview** em página própria com imagem de fundo (uma captura do app), compartilhável com o workspace. A bolha aceita **lançamento gradual** por porcentagem de visitantes.
9. **Instruções em duas partes:** o Build separa "General" e "Guardrails" (regras inegociáveis). Vale mover as proibições do agente (sem preço, sem dados de conta) para o campo de Guardrails.
10. **Modelo:** a opção "Auto" custa 1 crédito, e vários modelos também custam 1 crédito (por exemplo GPT-5 Mini, Gemini 3 Flash, Claude 4.5 Haiku, GPT-5.6 Luna). Comparar no "Compare" antes de escolher. A temperatura padrão é 0.
11. **Funcionários de suporte:** a função "Support Associate" acessa só o Helpdesk, útil quando houver alguém para atender sem ver as configurações.

## D. O que ainda não foi lido
Helpdesk (filtros, visões salvas, prioridade, tags, times, atribuição, agendas, triggers, campos personalizados, tradução, rascunhos por IA, takeover, roteamento), integrações de plataformas (Shopify, Zendesk, Salesforce, Freshdesk, Gorgias, Zoho, Intercom, HubSpot, Help Scout, Odoo, Sunshine, viaSocket), plataformas de site (Webflow, WordPress, Wix, Weebly, Framer, Bubble, Vercel), Slack, Instagram, Messenger, Twilio e SIP, ações de Stripe, Shopify, Salesforce, Cal.com, Calendly e transferência para telefone, contatos (upload), usuários, uso, 2FA e HIPAA do workspace, domínios personalizados, API v2 (autenticação, streaming, ações no cliente, agentes, Helpdesk, erros, paginação), API v1, CLI (demais comandos), SDKs Android e iOS, componentes de widget (layout, formulários, dados, botão), construtor de widgets por IA, estados, editor de código e o programa de especialistas.


## E. O plano do Hub Manager Tour no Chatbase (prints de 20/09/2026)

**O que os prints mostram:**
- Workspace "My team", plano **AppSumo Tier 2**.
- **Créditos:** 0 de 5.000 usados; renovação no dia 1º de outubro. Cada resposta custa de 1 a 6 créditos conforme o modelo: com um modelo de 1 crédito são até ~5.000 respostas por mês; com um de 2 créditos, ~2.500. Para a fase atual (poucos produtores) sobra folga; o limite passa a importar com dezenas de usuários ativos, com voz (6 créditos por minuto, mais o modelo) ou com anexos.
- **Agentes:** 30 de 40 em uso, ou seja, **10 vagas livres**: cabem o agente de vendas da landing page e um agente para as páginas públicas (integrante e casa de show), como sugeridos nas seções 4 e 2.6.
- **Papéis:** Owner, Member, Support Associate (só Helpdesk) e Viewer. **Papéis personalizados exigem Enterprise.** O papel Member lista acesso total a Helpdesk, Campanhas, Webhooks, Fontes, Leads, Integrações, Contatos, Logs de chat, Chaves de API, Analytics, Agentes e Ações.
- **Menu de Workspace settings:** General, Members, Plans, Billing, **API keys** e **OpenAI key**.

**O que isso indica (e o que ainda precisa ser confirmado):**
- A página **API keys aparece** no menu. Segundo a documentação, ela só aparece em planos com acesso à API. É um sinal positivo para sincronizar a base por CI/CLI, enviar WhatsApp por API e usar o Zapier. **Confirme criando uma chave de teste** (e a documentação da API v2 diz que exige Standard ou superior).
- A lista de papéis mostra que as áreas (Helpdesk, Campanhas, Webhooks, Leads) existem, mas **não prova** que cada função esteja liberada no plano.
- **"OpenAI key":** não li a documentação dessa página. A verificar o que ela muda (por exemplo, uso de chave própria e efeito nos créditos).
- **Ainda sem confirmação:** modo de voz, canal de WhatsApp, e-mail com IA, remoção do "Powered by Chatbase", re-sincronização automática de sites e limite do Backstage. A página **Workspace settings → Plans** (cartão "Current Plan", que aparece nos planos legados) deve listar os recursos e limites. Vale um print dela.
