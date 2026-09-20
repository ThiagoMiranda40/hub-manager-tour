# Agenda e cadastro de shows

## Agenda ("Prancheta de Turnê")
**Onde fica:** menu **Agenda** (é a tela inicial do sistema). O título da tela é "Prancheta de Turnê".

**Para que serve:** ver todos os shows de uma vez, saber quais estão com documentos pendentes ou com rider em aberto, e abrir a prancheta de qualquer show. É o painel de controle do produtor.

**O que aparece na tela:**
1. **Três cards de resumo no topo** (todos clicáveis; funcionam como filtro):
   - **Shows:** total de shows cadastrados e total de itens de rider somados.
   - **Docs Pendentes:** quantidade de shows que ainda têm documentos pendentes, e o total de exceções de rider.
   - **Docs 100%:** quantidade de shows com todos os documentos exigidos entregues ("prontos p/ embarque").
2. **Lista de shows** com título "(b) Próximas datas da temporada" e a quantidade de datas. Os shows aparecem em ordem de data (do mais antigo para o mais novo). Não há filtro automático por data: shows passados continuam na lista.
3. **Busca e filtros:**
   - Campo **Buscar por cidade, local, artista ou turnê**.
   - **Filtrar Artista** (lista de artistas que têm shows).
   - **Status de Documentação:** **Todos**, **Pendentes** ou **100%**.
4. **Botão Novo show** (acima da lista).

**Cada card de show mostra:**
- Data em destaque (dia da semana e dia do mês) e a data por extenso, com a quantidade de integrantes.
- Artista, turnê (se houver), cidade e local.
- Bloco **Docs:** selo de situação ("Sem exigência", "N pendentes" ou "100% Entregue"), barra de progresso, "x/y arquivos" e, quando houver, "N dispensados" (pessoas dispensadas de documento naquele show).
- Bloco **Rider:** selo ("Sem rider", "N pend." itens sem resposta da casa, "N exc." exceções, ou "Rider OK"), barra de progresso e "x/y confirmados" (ou "Não instanciado" quando o show ainda não tem itens de rider).
- Passe o mouse sobre os selos e barras para ver a explicação completa.
- **Clique no card para abrir a prancheta do show.**

**Quando a lista está vazia:**
- "Nenhum show cadastrado ainda na temporada" com o botão **Cadastrar o primeiro show**.
- "Nenhum show encontrado para os filtros selecionados": limpe a busca ou escolha **Todos**.

**Dica:** para ver só o que exige ação, clique no card **Docs Pendentes** (ou no filtro **Pendentes**).

## Cadastrar um novo show
**Onde fica:** menu **Agenda** → botão **Novo show**. O formulário "Novo Show da Turnê" abre na própria página. Para fechar sem salvar, clique em **Cancelar** (ou no botão **Fechar formulário**).

**Para que serve:** registrar uma data de show. Ao salvar, o sistema já monta o elenco sugerido e copia o rider padrão do artista, poupando trabalho.

**Passo a passo:**
1. **Artista / Banda (obrigatório):** escolha um artista na lista ("Selecione um artista...") ou clique em **+ Novo Artista** e digite o nome. Se você digitar o nome de um artista que já existe, o sistema usa o existente (não cria duplicado). O link **Selecionar existente** volta para a lista.
2. **Turnê (opcional):** escolha uma turnê já existente do artista, ou deixe "Nenhuma / Definir nova turnê..." e digite o nome de uma nova turnê no campo "Ou digite o nome de uma nova turnê" (ex.: Turnê Acústico 2026). Se o artista ainda não tem turnês, o campo de nome novo aparece direto.
3. **Data do Show (obrigatório).**
4. **Cidade (obrigatório):** por exemplo, "Curitiba / PR".
5. **Local / Casa de Show (opcional):** por exemplo, um teatro ou praça.
6. **Elenco sugerido:** o sistema lista as pessoas vinculadas ao artista escolhido e as marcadas como **Equipe Geral**. Todas vêm marcadas. Desmarque quem não participa dessa data (ou use **Marcar todos** / **Desmarcar todos**). Se aparecer "Nenhum integrante vinculado a este artista ainda", você poderá adicionar pessoas depois, na prancheta do show.
7. **Rider Técnico Padrão:** o formulário informa quantos itens do rider padrão do artista serão criados automaticamente (som, iluminação, backline e camarim).
8. Clique em **Salvar show e abrir prancheta**.

**O que acontece ao salvar:**
- Aparece o aviso "Show cadastrado com sucesso! Elenco e rider técnico foram inicializados."
- O formulário fecha e você volta para a Prancheta de Turnê (a própria Agenda), onde o novo show já aparece na lista, na posição da data. Para abrir a prancheta **do show** (elenco, documentos, rider etc.), clique no card dele.
- Se o elenco ou o rider não puderem ser carregados, aparece um aviso amarelo "Show criado com ressalvas..." dizendo o que precisa ser adicionado manualmente na prancheta.
- Os links do show (individuais e do rider) são gerados automaticamente.

**Casos comuns:**
- *Elenco veio vazio:* as pessoas só são sugeridas se estiverem vinculadas ao artista (ou marcadas como Equipe Geral) em **Pessoas & Equipe**. Cadastre e vincule as pessoas e depois adicione ao show na aba **Elenco & Exigências**.
- *Show nasceu sem itens de rider:* o artista ainda não tem rider padrão em **Configurações**. Cadastre o rider padrão e depois, na aba **Rider Técnico** do show, use **Clonar Rider Padrão do Artista Agora** (só funciona em show sem nenhum item).
- *Novos integrantes adicionados depois começam sem exigências.* Defina o que cada um deve entregar na aba **Elenco & Exigências**.
- *Primeiro show de um artista novo:* o artista é criado junto com o show. Só depois disso ele aparece em **Pessoas & Equipe** (para vincular pessoas) e em **Configurações** (para cadastrar o rider padrão).

**Por que é importante:** o cadastro do show é a base de tudo: elenco, exigências, links, rider e relatório partem dele.
