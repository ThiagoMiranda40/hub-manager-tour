# Configurações, funções, tipos de documento e Rider Padrão

## Tela de Configurações
**Onde fica:** menu **Configurações**. O título é "Configurações do sistema".

**Para que serve:** personalizar a aparência, definir as **funções** do elenco, os **tipos de documento** e cadastrar o **rider padrão de cada artista**. São ajustes que valem para toda a conta e reduzem trabalho repetitivo nos shows.

A tela tem quatro blocos, de cima para baixo: Aparência da Plataforma, Navegação da Plataforma, Funções do elenco / Tipos de documento (lado a lado no computador) e Catálogo de Rider Padrão por Artista.

## Aparência e navegação
- **Aparência da Plataforma:** botões **Claro** e **Escuro**. A escolha vale imediatamente em todo o sistema (fica salva no navegador do aparelho).
- **Navegação da Plataforma:** botões **Cabeçalho** e **Barra Lateral**. Só aparece em telas maiores. Detalhes no arquivo de navegação.

## Funções do elenco
**Onde fica:** Configurações → bloco **Funções do elenco**.

**Para que serve:** definir as funções que uma pessoa pode ter (por exemplo, Integrante, Produção, Equipe técnica). A função aparece em Pessoas & Equipe, no elenco do show e no Relatório de Produção (que agrupa as pessoas por função).

**Padrão de conta nova:** Integrante, Produção e Equipe técnica.

**Como usar:**
- **Renomear:** clique no nome da função, edite o texto e saia do campo (clicando fora). O nome é salvo automaticamente ao sair do campo.
- **Criar:** no campo **Nova função** digite o nome e confirme (tecla Enter ou botão **Adicionar**).
- **Excluir:** botão **Excluir** (pede confirmação com um segundo clique). Se a função está em uso, não dá para excluir e aparece "Não é possível excluir: N pessoa(s) usam esta função." Troque a função dessas pessoas antes.

**Dica:** o preset "Aplicar padrão: Toda a Banda" e "Selecionar apenas músicos" reconhecem funções que contêm as palavras "músico", "integrante" ou "banda". Mantenha ao menos uma função assim para essas ações funcionarem como esperado.

## Tipos de documento
**Onde fica:** Configurações → bloco **Tipos de documento**.

**Para que serve:** definir os documentos que os integrantes podem enviar (Passagem, Hotel/Voucher, Nota fiscal, Cupom fiscal etc.). Esses tipos aparecem como selos na aba Elenco & Exigências e como botões de escolha na página de envio do integrante.

**Padrão de conta nova:** Passagem, Hotel/Voucher e Nota fiscal.

**Como usar:**
- **Renomear:** edite o nome e saia do campo (salva automaticamente).
- **Criar:** no campo **Novo tipo de documento** digite o nome (por exemplo, "Cupom fiscal") e confirme. Todo tipo novo nasce com "Obrigatório para todo o elenco?" marcado e "Reembolsável?" desmarcado; ajuste em seguida.
- **Excluir:** botão **Excluir** com confirmação. Se já existem documentos daquele tipo, aparece "Não é possível excluir: N documento(s) usam este tipo."
- Cada tipo tem duas opções (caixas de marcação):
  - **Reembolsável?** Quando marcada, ao escolher esse tipo na página de envio, a caixa "Solicitar reembolso deste item" já vem marcada para o integrante. Ele ainda pode alterar. Use para tipos como nota fiscal, cupom fiscal e recibos de despesas.
  - **Obrigatório para todo o elenco?** Indica que o tipo é considerado obrigatório de forma geral. Na prática, quem define as pendências de cada show são as **exigências por pessoa**, configuradas na aba Elenco & Exigências.

**Por que é importante:** um catálogo de tipos bem definido deixa o envio dos integrantes mais claro e permite que o preset "Passagem + Hotel" funcione.

## Catálogo de Rider Padrão por Artista
**Onde fica:** Configurações → bloco **Catálogo de Rider Padrão por Artista** (título "Rider Técnico Oficial").

**Para que serve:** cadastrar **uma vez** as necessidades oficiais de som, luz, palco e camarim de cada artista. Ao criar um novo show desse artista, esse rider é **copiado automaticamente** para o show. Mudar o rider padrão depois vale para os shows futuros; **shows já criados mantêm a cópia que já têm**.

**Antes de começar:** o artista precisa existir. Artistas são criados ao cadastrar o primeiro show deles. Se não houver nenhum, aparece "Nenhum artista cadastrado — Cadastre um artista na agenda para definir suas especificações oficiais de rider técnico."

**Como usar:**
1. Em **Artista Selecionado**, clique no nome do artista.
2. Use os filtros de categoria (**Todos**, **Backline**, **Som**, **Iluminação**, **Camarim**, **Outros**, cada um com a quantidade de itens) para navegar pela lista.
3. Para criar um item, clique em **Novo Item de Rider** e preencha:
   - **Categoria** (obrigatório): Backline, Som, Iluminação, Camarim ou Outros.
   - **Nome do Item** (obrigatório): por exemplo, "Bateria Yamaha Stage Custom" ou "SM58".
   - **Qtd.** (obrigatório): quantidade.
   - **Inegociável:** ligue quando a casa de show precisar fornecer o item sem alternativa aceitável. Desligado, o item é desejável (pode ser negociado ou substituído sem inviabilizar o show).
   - **Especificação Técnica Detalhada (opcional):** modelo, potência, voltagem etc.
   Clique em **Salvar no Rider Padrão** (ou **Cancelar**/**Fechar**).
4. Cada item da lista mostra categoria, nome, quantidade, se é **Inegociável** ou **Desejável** e a especificação. Os botões são:
   - **Setas para cima e para baixo** ("Mover para cima" / "Mover para baixo"): mudam a posição do item (a ordem é a mesma usada no show).
   - **Editar:** abre os mesmos campos para alterar e salvar.
   - **Excluir:** remove o item do rider padrão (pede confirmação com um segundo clique).
5. Se a lista estiver vazia, o botão **Adicionar Primeiro Item** ajuda a começar.

**Casos de uso:**
- *Artista novo:* cadastre o rider padrão antes de criar os shows (ou logo depois do primeiro show) para que os próximos já nasçam completos.
- *Show criado sem itens de rider:* depois de cadastrar o rider padrão, abra o show → aba **Rider Técnico** → **Clonar Rider Padrão do Artista Agora**.
- *Marcar o que é crítico:* deixe como **Inegociável** só o que realmente inviabiliza o show; o resto como desejável facilita a negociação.

### Importar o rider de um PDF (com inteligência artificial)
**Onde fica:** Catálogo de Rider Padrão → **Importar Rider (PDF)** (com um artista selecionado).

**Para que serve:** se o artista já tem o rider em PDF, a inteligência artificial lê o documento e transforma em itens do sistema, sem digitação.

**Passo a passo:**
1. Clique em **Importar Rider (PDF)**. Abre a janela "Importar Rider Técnico (PDF)" com o nome do artista.
2. Clique na área "Clique ou arraste o PDF do rider aqui" e escolha o arquivo (somente PDF, até 20 MB). Aparece "Analisando rider técnico com IA...".
3. Terminada a leitura, aparece "N itens identificados no rider técnico!" e uma lista para revisão. Cada item mostra categoria, nome e se é **Obrigatório** ou **Opcional**. Os itens vêm todos selecionados.
4. Use **Selecionar todos** e **Desmarcar todos**, ou clique nos itens para escolher quais entram. **Trocar PDF** volta para escolher outro arquivo.
5. Clique em **Adicionar N Itens ao Rider**. Aparece "N itens adicionados ao rider padrão com sucesso!" Os itens entram no rider padrão do artista.
6. Revise depois o resultado (nomes, quantidades e o que é inegociável), porque a leitura por IA pode errar.

**Limites e problemas:**
- Aceita **somente PDF** (arquivos Word não são aceitos). Se escolher outro formato: "Por favor, selecione um arquivo em formato PDF."
- Há um limite de **20 importações por dia** por conta. Ao atingir: "Limite de importações de rider por IA atingido para hoje (máximo de 20). Tente novamente amanhã."
- Se nenhum item for marcado: "Selecione ao menos um item para importar."
- Se a leitura falhar, aparece uma mensagem de erro ("Falha ao extrair itens do PDF." ou "Erro ao processar PDF do rider."). Tente novamente ou cadastre os itens manualmente.
