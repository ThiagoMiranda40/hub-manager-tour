# Backlog V1.1 — Hub Manager Tour

> Priorizado em 17/09/2026 via matriz Impacto × Esforço, atualizado em 19/09/2026 (matriz v12).
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
