# Backlog V1.1 — Hub Manager Tour

> Priorizado em 17/09/2026 via matriz Impacto × Esforço, atualizado em 19/09/2026 (matriz v13).
> Sequência recomendada: Ganho Rápido → Grande Aposta → Preenchimento.

![Matriz de priorização do Backlog V1.1](./backlog-priorizacao-v1.1.png)

## Ganho rápido (alto impacto, baixo esforço) — fazer primeiro
- [CONCLUÍDO] Aumentar fonte no celular → correção de unidade (px → rem) + controle manual A-/A+ em 3 níveis.
- [CONCLUÍDO] Tela de abertura animada.
- [CONCLUÍDO] Cards do Rider Técnico como filtro clicável (com correção de isolamento de segurança para o Modo Palco).
- [CONCLUÍDO] Cards da Agenda/Prancheta de Turnê como filtro clicável.
- [CONCLUÍDO] Cards da aba Reembolsos como filtro clicável.
- [CONCLUÍDO] Cards da aba Documentos como filtro clicável (Documentos Recebidos / Documentos para Reembolso).
- [CONCLUÍDO] Card "Pessoas com Documentos" com filtro por integrante (popover/sheet responsivo).
- [CONCLUÍDO] Filtros nativos do Modo Palco (conferência física + status da casa, com 3 estados vazios).
- [CONCLUÍDO] Drag-and-drop de upload (comprovante do integrante e PDF de rider legado) — confirmado funcionando por Thiago.
- [CONCLUÍDO] Cursor "mãozinha" global (regra no @layer base de styles.css) + tooltips nativos (atributo title) em botões, badges, abas e textos truncados — commit 64c3f7b (+ correções do follow-up). Limitação conhecida: no celular não existe hover, então tooltips não aparecem ao toque.
- Cores/contraste do Modo Palco
- Conferir no celular os filtros nativos do Modo Palco
- Corrigir sobreposição de texto na aba Reembolsos (mobile)
- Ajustar botões/badges em todos os dispositivos
- Visualização em lista em Pessoas & Equipe
- Área de perfil do usuário
- Renomear cards "Reembolsados (Pagos)" → "Reembolsos Pagos" e "Pendentes de Reembolso" → "Reembolsos Pendentes" na aba Reembolsos (UX writing) — [CONCLUÍDO] junto com este mesmo commit.
- Botões de envio do link individual na aba Elenco & Exigências: hoje copiar link, enviar por WhatsApp (mensagem pronta) e abrir a página do integrante só existem na aba Ações Rápidas & Links, então quem vê o integrante pendente no Elenco precisa trocar de aba. Reaproveitar os recursos existentes (copiar link, link de WhatsApp, abrir página) na linha de cada integrante. Esforço baixo (lógica pronta), mas precisa de desenho de UI/UX curto ANTES do código: a linha já tem status, chips de documentos e lixeira, e o mobile tem pouco espaço. Decisões em aberto: quais ações entram, só ícones com tooltip ou com rótulo, mostrar para todos ou destacar só quem tem pendência, e o comportamento sem telefone cadastrado (hoje: toast explicativo).
- Corrigir vazamento de ícones da sidebar com fonte aumentada (A+/A++): bug de acessibilidade em funcionalidade já entregue. Causa identificada: o aumento de fonte é `html { font-size: 115% | 130% }` (rem), mas a largura da sidebar é fixa em px (`w-[240px]` expandida e `w-[76px]` recolhida em AppShell.tsx), então a linha "Preferências" (rótulo + 3 botões) não cabe e os ícones vazam; os rótulos do menu também são cortados ("PESSOAS & EQ…"). Direção provável: largura em rem e/ou quebrar a linha de Preferências em duas. Testar: expandida e recolhida, 115% e 130%, tema claro e escuro, modo cabeçalho e menu mobile. Prioridade alta dentro do Ganho rápido.
- [CONCLUÍDO] Vocabulário de pagamento padronizado na aba Reembolsos: botão "Pago" (antes "Reembolsado"), "Marcar como pago", subtítulo "N pagos" (antes "liquidados") e, no Relatório de Produção, "Total pago" (antes "Total liquidado"). Coluna "Status" com rótulo visível no desktop (a partir de lg), largura mínima em rem e alinhamento vertical do botão com a chave Pix — commits 75eace8 e 8cc2176.
- Padronizar tudo no domínio oficial (item do Trello "corrigir direcionamento de subdomínio").
  Contexto: o app está no domínio oficial app.hubmanagertour.com.br (login) e a landing page (página de vendas) ficará em hubmanagertour.com.br; porém, depois do login, o sistema passa a rodar no subdomínio provisório antigo hubmanagertour.triadetecnologiaesolucoes.com.br. Objetivo: tudo no domínio oficial e sem depender do domínio da Tríade para o app.
  Causa provável (a CONFIRMAR): Auth do Supabase — "Site URL" e lista de "Redirect URLs" ainda apontam para o subdomínio antigo. O login com Google usa redirectTo = origem atual, mas o Supabase só respeita isso se a origem estiver na lista; senão volta à Site URL. O cadastro (signUp em src/routes/auth.tsx) não define emailRedirectTo, então o link de confirmação de e-mail também usa a Site URL. Conferir também o domínio personalizado do Worker e regras de redirecionamento na Cloudflare.
  Levantamento no código (19/09/2026): o subdomínio antigo aparece só como URL absoluta em meta tags e assets — src/routes/__root.tsx (4), src/routes/p.$token.tsx (3), src/routes/r.$token.tsx (3), public/canvas-de-jornada.html (4), public/demonstracao.html (6), public/mapa-da-jornada.html (4) e scripts/generate-og-image.cjs (1; o domínio é escrito DENTRO da imagem og-image-v2.png, então a imagem precisa ser regerada). O domínio oficial ainda não aparece em nenhum arquivo do repositório. Sugestão: centralizar a URL base do app em uma única constante/variável de ambiente para não repetir.
  RISCO ao cortar a relação com o domínio da Tríade: os links públicos já enviados a integrantes e casas de show (/p/<token> e /r/<token>) foram gerados com o domínio em uso na hora (window.location.origin). Se o subdomínio antigo deixar de responder, esses links quebram. Manter um redirecionamento 301 que preserve caminho e parâmetros (regra de redirecionamento da Cloudflare) do subdomínio antigo para app.hubmanagertour.com.br, no mínimo até os shows com links ativos terminarem. Distinção: o e-mail contato@triadetecnologiaesolucoes.com.br (destino do feedback do RF-15) é endereço da empresa, não o subdomínio provisório, e NÃO entra nesta limpeza sem decisão minha.
  Ordem sugerida: (1) Supabase (incluir o novo domínio em Site URL/Redirect URLs ANTES de remover o antigo); (2) Cloudflare (redirect 301); (3) código e imagem OG; (4) testar login por e-mail/senha e Google, cadastro com e-mail de confirmação e um link público antigo.
- Reorganizar a apresentação do documento enviado (fase 1): hoje as abas Documentos e Reembolsos mostram o nome do arquivo (às vezes longo ou ilegível, como uma sequência de números e letras) com ícone de link externo, e a página pública do integrante também mostra o nome do arquivo. Colocar em destaque "o que é" e "do que se trata": tipo do documento (badge existente) + descrição (campo note). O nome do arquivo sai da tela (fica como tooltip/detalhe). Dois botões explícitos: "Visualizar" (padrão, abre em nova aba por URL assinada, como hoje) e "Baixar" (download com nome amigável, ex.: "Cupom fiscal - Thiago Miranda.jpg", usando a opção download do createSignedUrl do Supabase). Precisa de desenho de UI/UX curto ANTES do código. Decisões em aberto: rótulos e ícones dos botões; o que mostrar quando não há descrição; telas incluídas (Documentos, Reembolsos, checklist pública p.$token); manter o nome original só como tooltip ou também em algum detalhe.
- Documentação funcional (base de conhecimento do agente de suporte): documentar recursos, funções e fluxos e os porquês, em linguagem de usuário (como fazer, por que existe, o que acontece), a partir do que já foi construído (specs, PRDs, telas). NÃO subir as specs técnicas cruas: elas descrevem arquitetura, regras de segurança do banco e tokens. Sem dados reais (nomes, e-mails, tokens de clientes). Esforço baixo a médio com apoio de IA e revisão minha. Pré-requisito do item seguinte e insumo do futuro tutorial do RF-15.
- Agente de suporte com Chatbase embutido no sistema: conta Pro do Chatbase disponível sem custo. O agente é treinado com a documentação funcional (item anterior) e embutido por link/código embed, explicando a ferramenta ao usuário antes de existir a página de tutoriais do RF-15. Cuidados: (1) escopo do widget: SOMENTE a área logada (componente dentro do AppShell); NÃO nas rotas públicas /p/<token> e /r/<token>, cujas URLs contêm tokens de acesso que um script de terceiros poderia ler; (2) não enviar identidade nem dados do usuário ao Chatbase; (3) instruções do agente: responder só com base na documentação, em português, e encaminhar para contato@triadetecnologiaesolucoes.com.br quando não souber; (4) conferir limites de mensagens do plano e a política de dados/LGPD do Chatbase (o histórico de conversas fica no serviço); (5) não há CSP no repositório; se existir regra de cabeçalhos na Cloudflare, liberar o domínio do Chatbase. Esforço de código mínimo (um componente com o snippet).
- Revisão geral da interface mobile (passada final, depois dos demais)

## Grande aposta (alto impacto, alto esforço) — priorizar, mas planejar bem
- RF-15 — Central de Conteúdo e Administração (rascunho, ainda não 
  formalizado com critério de aceite completo): consolida em uma 
  única funcionalidade o tutorial (texto + vídeo via link/embed do 
  Panda Vídeo, sem upload de arquivo), o changelog/roadmap de 
  novidades, e o canal de feedback (bug/sugestão) com notificação 
  por e-mail para contato@triadetecnologiaesolucoes.com.br. Acesso 
  de administrador restrito por e-mail via variável de ambiente 
  (ADMIN_EMAIL), sem sistema de papéis completo nesta fase.
- Rider do show precisa refletir atualizações feitas depois no rider 
  padrão do artista
- Editar rider de um show específico sem alterar o rider padrão do 
  artista
- Sininho de notificações não lidas no menu
- Suporte offline real (IndexedDB) para o Modo Palco
- Área de admin do sistema (Tríade)
- Upload de comprovante de pagamento na aba Reembolsos: ao marcar 
  um reembolso como pago, permitir ao produtor anexar o comprovante 
  do Pix realizado (guardado junto ao registro), com possibilidade 
  de a marcação de 'reembolsado' acontecer automaticamente ao subir 
  o arquivo, em vez de (ou além de) alternar manualmente o switch 
  atual. Esforço médio (reaproveita padrão de upload já existente 
  no sistema, sem rota pública envolvida) — próximo candidato 
  depois do RF-15. Precisa de definição de produto antes do desenho 
  técnico: onde o comprovante fica armazenado, se o upload é 
  obrigatório ou complementar ao toggle manual, e se a marcação 
  automática é definitiva ou ainda passa por confirmação.
- Conversão automática de moeda estrangeira: ao detectar moeda 
  diferente de BRL num documento, buscar a cotação do dia e sugerir o 
  valor já convertido (hoje só alerta que a moeda é diferente, sem 
  converter). Se o reembolso não for pago no mesmo dia do envio, 
  recalcular a cotação no momento em que o produtor efetivamente for 
  realizar o pagamento, não usar a cotação do dia do upload. Precisa 
  de mudança de dado: guardar moeda original e valor bruto estrangeiro 
  junto do documento (hoje o sistema só grava o valor final em BRL, 
  sem metadado de moeda) — definir antes do desenho técnico qual API 
  de cotação usar.
- Novas opções de visualização da Agenda/Prancheta de Turnê: alternar 
  entre Lista (compacta), Cards (padrão atual) e Calendário (shows 
  posicionados por data, navegação por mês). A parte de Lista/Cards é 
  simples (mesmo dado, troca de layout); a parte de Calendário é bem 
  mais esforço (componente de calendário completo) — considerar 
  separar em dois itens na hora de priorizar de verdade.
- Página individual do integrante na aba Elenco & Exigências: clicar 
  no nome de um integrante escalado abre uma visão completa só dele 
  para aquele show — dados pessoais, função, observações, documentos 
  enviados, documentos exigidos, documentos pendentes, e status de 
  reembolso. Complementa e amplia o filtro "Pessoas com Documentos" já 
  construído (que hoje só mostra documentos) — boa parte da infra de 
  busca por cast_member_id já existe e pode ser reaproveitada. Decisão 
  de UI em aberto para quando for priorizado: página/rota dedicada 
  (mais robusta, deep-linkável) ou modal/drawer (mais barato de 
  construir).
- Visualizador de documentos dentro do app (fase 2): modal/drawer com pré-visualização de imagem e PDF e "Baixar" como SEGUNDO passo, para o produtor conferir sem baixar o arquivo no dispositivo e mantendo a guarda do documento no sistema. Motivação: em muitos navegadores de celular o PDF é baixado em vez de exibido ao abrir em nova aba. PDF exige leitor (ex.: pdf.js; avaliar peso e dependência); formatos não visualizáveis vão direto para "Baixar". Depende da fase 1. Segurança: manter URL assinada de vida curta (hoje 10 min) e não expor o caminho do storage.

## Preenchimento (baixo impacto, baixo esforço) — fazer quando sobrar tempo
- Melhorar mecanismo de busca da Agenda
- Melhorar UX de confirmação do rider
- Campo de observação no documento de Rider Técnico
- Revisar organização da área de criar rider
- Tirar criação de Artista/Equipe/Rider de Configurações
- Consolidar documentos (passagens/notas/cupons) num relatório único

## Evitar por agora — sem spec própria (baixo impacto)
Esta seção guarda itens de baixo impacto que NÃO viram spec própria; ideias grandes o bastante para virar spec continuam em specs/candidatos-novas-specs.md.

- Migrar tooltips nativos (title) para Radix Tooltip. O pacote @radix-ui/react-tooltip e src/components/ui/tooltip.tsx já existem no projeto, mas nenhuma tela usa. Escopo enxuto quando for feito: um componente único <Tip> + um TooltipProvider na raiz, migrando só as abas do show, o Modo Palco e a Agenda; o resto continua com title. Ganho: visual Nocturne e foco por teclado. Não resolve mobile (sem hover). Riscos: botões desabilitados precisam de wrapper; regressão no Modo Palco. Revisitar quando: houver a 'Revisão geral da interface mobile', uma auditoria de acessibilidade, ou se o tooltip nativo incomodar no tema escuro.

## Já entregue (fora deste backlog)
- Tema claro/escuro (RF-12)
- Navegação adaptável cabeçalho/sidebar (RF-13)
- Negociação de exceção de rider via réplica/tréplica (RF-14)
- Instalação como PWA no Android

## Fora do backlog — ver specs/candidatos-novas-specs.md
- Benchmarking tecrider.com, integração com contabilidade e emissão de 
  nota fiscal saíram deste backlog por exigirem escopo próprio — 
  registrados em arquivo separado.

---

> Desenho de UI/UX do card 'Pessoas com Documentos': specs/design/pessoas-com-documentos-uiux.md
> Desenho de UI/UX dos filtros nativos do Modo Palco: specs/design/modo-palco-filtros-uiux.md
