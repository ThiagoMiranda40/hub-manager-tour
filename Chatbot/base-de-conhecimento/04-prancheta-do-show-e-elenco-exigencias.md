# Prancheta do show e aba Elenco & Exigências

## Prancheta do show: visão geral
**Onde fica:** menu **Agenda** → clicar no card do show. Para voltar, use o link **← Voltar para a agenda** no topo.

**Para que serve:** é a tela de trabalho de um show. Reúne o elenco, os documentos, o rider técnico, os reembolsos e os links, tudo dividido em cinco abas.

**Cabeçalho do show:**
- Nome da turnê ("Tour ...") ou "Show avulso", nome do artista em destaque e, abaixo, cidade, local e data.
- Selo de situação dos documentos: **Sem exigência configurada**, **N pendentes** (quantidade de integrantes com documento exigido ainda não recebido) ou **Tudo recebido**.
- Resumo do elenco, por exemplo: "5 integrantes: 5 ativos (2 concluídos, 3 pendentes)". "Ativos" são as pessoas que têm alguma exigência; "sem exigência" são as que não têm nenhuma naquele show.
- Barra de progresso com "x de y documentos exigidos recebidos".
- Botões **Relatório de Produção**, **Editar** e **Excluir**.

**As cinco abas (logo abaixo do cabeçalho):**
1. **Elenco & Exigências** (contador com o número de integrantes)
2. **Documentos** (contador com o número de documentos recebidos)
3. **Rider Técnico** (contador "confirmados/total")
4. **Reembolsos** (contador com o número de solicitações)
5. **Ações Rápidas & Links**

Um **pontinho laranja** ao lado do nome de uma aba indica que ela pede atenção (documentos pendentes na aba Elenco; itens inegociáveis pendentes, exceções ou negociações no Rider; reembolsos ainda não pagos em Reembolsos). Passe o mouse sobre o pontinho para ver o motivo.

**Como o sistema calcula as pendências:** sempre por pessoa e por show. Uma pessoa só tem pendência se alguém definiu que ela precisa entregar algum documento naquele show. Quem não tem nenhuma exigência aparece como "Sem exigência" e não é contado como pendente.

## Editar os dados do show
**Onde fica:** cabeçalho do show → botão **Editar** (ou aba **Ações Rápidas & Links** → **Editar Dados Principais do Show**).

**Como fazer:**
1. Clique em **Editar**. Abre um painel com os campos **Artista**, **Tour (opcional)**, **Cidade**, **Data** e **Local**.
2. Altere o que precisar e clique em **Salvar alterações** (ou em **Cancelar** / **Fechar edição** para desistir).
3. Aparece "Dados do show atualizados!".

**Cuidados:**
- O campo **Artista** é texto. Se você digitar o nome de um artista que já existe, o show passa a pertencer a ele; se o nome for novo, um artista novo é criado.
- Ao mudar o nome no campo **Tour** de um show que já tem turnê, o nome da turnê é alterado, e isso vale para todos os shows daquela turnê. Para tirar o show de uma turnê, deixe o campo vazio.
- Mudar dados do show não apaga elenco, documentos nem rider.

## Excluir um show
**Onde fica:** cabeçalho do show → botão **Excluir**.

**O que acontece:** abre um painel vermelho "Excluir show definitivamente" avisando que a ação apaga **permanentemente** o show, as pessoas do elenco, as exigências, o rider e todos os documentos enviados (inclusive os arquivos armazenados).

**Como confirmar:**
1. Digite exatamente o nome da cidade do show no campo (o sistema mostra qual é; não diferencia maiúsculas de minúsculas).
2. O botão **Excluir definitivamente** só habilita quando o texto confere.
3. Clique nele. Aparece "Show excluído permanentemente" e você volta à Agenda.

**Atenção:** não há como desfazer. Os links do show (dos integrantes e da casa de show) deixam de funcionar.

## Aba Elenco & Exigências
**Onde fica:** prancheta do show → aba **Elenco & Exigências** (é a aba que abre por padrão).

**Para que serve:** definir quem está escalado no show e quais documentos cada pessoa precisa entregar. Sem exigências definidas, o sistema não tem como apontar pendências.

### Bloco "Presets de Exigências em Lote"
Serve para configurar várias pessoas de uma vez, com poucos cliques.

- **Aplicar padrão: Toda a Banda (Passagem + Hotel):** com nenhuma pessoa selecionada, aplica as exigências **Passagem** e **Hotel/Voucher** às pessoas do elenco cuja função contém "músico", "integrante" ou "banda". Se ninguém tiver função assim, aplica a todo o elenco. Aparece o aviso "Preset 'Passagem + Hotel' aplicado para N integrante(s)!".
- **Aplicar Passagem + Hotel (N):** quando há pessoas marcadas, o botão muda de nome e aplica **somente** às pessoas selecionadas.
- **Dispensar selecionados (N):** aparece quando há pessoas marcadas; remove todas as exigências dessas pessoas (elas passam a "Sem exigência").
- **Selecionar todos do elenco** / **Desmarcar todos** e **Selecionar apenas músicos:** atalhos para marcar pessoas.
- Para o preset funcionar, precisa existir em **Configurações** um tipo de documento com nome parecido com "Passagem" (ou "aéreo") e/ou "Hotel", "Voucher" ou "Hospedagem". Se nenhum for encontrado, aparece um erro pedindo para cadastrar esses tipos.
- Aplicar o preset de novo não duplica nada.

### Lista "Integrantes Escalados (N)"
Cada linha mostra:
- Uma **caixinha à esquerda** para selecionar a pessoa e aplicar ações em lote.
- Iniciais, **nome** e **função**. O selo **PIX** indica que a pessoa tem chave Pix cadastrada.
- O **selo de situação da pessoa**: "Sem exigência", "N pendente (x/y)" ou "Tudo recebido (x/y)".
- Os **selos de tipo de documento** (Passagem, Hotel/Voucher, Nota fiscal etc.), que funcionam como botões:
  - **Verde com ✓:** documento já entregue (não clicável).
  - **Amarelo com relógio:** documento exigido e ainda pendente. **Clique para dispensar** essa exigência daquela pessoa.
  - **Cinza com "+":** documento não exigido. **Clique para exigir**.
- **Lixeira:** remove a pessoa do elenco daquele show.

**Casos de uso:**
- *Exigir passagem só de uma pessoa:* na linha dela, clique no selo "+ Passagem".
- *Uma pessoa não precisa mais entregar hotel:* clique no selo amarelo "Hotel/Voucher" para dispensar.
- *Pessoa local que não precisa de nada:* deixe sem exigências; ela aparece como "Sem exigência" e não pesa nas pendências.
- *Todo mundo precisa de passagem e hotel:* clique em "Selecionar todos do elenco" e depois em "Aplicar Passagem + Hotel (N)".

### Adicionar uma pessoa ao elenco do show
**Onde fica:** formulário no final da lista de integrantes.
1. Em **Pessoa do Catálogo (ou digite abaixo)**, escolha alguém do cadastro central ("Selecionar do catálogo central..."). Nome e função preenchem sozinhos. Quem tem Pix cadastrado aparece com "(Pix: tipo)".
2. Ou digite o **Nome da pessoa** manualmente (pessoa avulsa, sem cadastro).
3. Ajuste a **Função**, se necessário.
4. Clique em **Adicionar**. Aparece "Integrante adicionado ao elenco".

Depois de adicionar, defina as exigências dela (ela entra sem nenhuma).
Uma pessoa avulsa (digitada) não tem telefone nem Pix vinculados, a menos que exista no catálogo alguém com o mesmo nome.
Alterar o elenco de um show não muda o cadastro da pessoa nem outros shows.

### Remover uma pessoa do elenco
1. Clique na **lixeira** da linha da pessoa. O botão muda para pedir confirmação.
2. Clique de novo para confirmar. Aparece "Integrante removido do elenco".
3. **Se a pessoa já enviou documentos, não é possível remover:** aparece "Não é possível remover: [nome] tem N documento(s) enviado(s). Exclua os documentos antes de remover a pessoa." Vá à aba **Documentos**, exclua os arquivos dela e tente de novo.

**Por que é importante:** as exigências alimentam os contadores da Agenda, o selo de pendências do cabeçalho e o que cada integrante vê na própria checklist.
