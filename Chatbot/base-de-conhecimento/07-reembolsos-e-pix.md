# Reembolsos e chave Pix

## O que é um reembolso no sistema
Durante a turnê, integrantes pagam despesas do próprio bolso (táxi, alimentação, compra de material etc.). No Hub Manager Tour, o integrante envia o **comprovante** pelo link individual, marca **Solicitar reembolso deste item** e informa o **valor**. A produção vê tudo na aba **Reembolsos**, copia a chave Pix da pessoa, paga no aplicativo do banco e marca o reembolso como **Pago**. O sistema **não realiza o pagamento**: ele organiza o pedido, mostra a chave Pix e registra o que já foi pago.

## Aba Reembolsos
**Onde fica:** prancheta do show (Agenda → clicar no show) → aba **Reembolsos** (o contador mostra quantas solicitações existem; o pontinho laranja indica que há reembolsos ainda não pagos).

**Para que serve:** saber quanto precisa ser pago, a quem, com qual chave Pix, e controlar o que já foi quitado.

### Cartões de resumo
- **Comprovantes:** quantidade de solicitações enviadas. Clique para ver todas.
- **Reembolsos Pagos:** soma em reais do que já foi pago e quantos são ("N pagos"). Clique para filtrar.
- **Reembolsos Pendentes:** soma em reais do que falta pagar e quantos são ("N a pagar"). Clique para filtrar.
- **Total Declarado:** soma de todos os valores informados e quantos pedidos estão "sem valor". Este cartão não é filtro.
Os três primeiros cartões filtram a lista; clique de novo para tirar o filtro, ou use **Limpar filtro ✕**.

### Lista "Listagem de Reembolsos e Chaves Pix"
Cada linha mostra, da esquerda para a direita:
1. **Nome e função** da pessoa, o **tipo do documento** (por exemplo Cupom fiscal, Passagem), o **nome do arquivo** (clique para abrir o comprovante em nova aba) e a **descrição** ("Obs") do gasto.
2. **Valor** pedido. Se aparecer **Não informado**, o integrante não colocou o valor.
3. **Chave Pix** da pessoa (texto encurtado; passe o mouse para ver a chave inteira) e o botão **Copiar Pix**.
4. **Status:** o botão de pagamento. Um cabeçalho "Status" aparece acima dele nas telas grandes.

Linhas de reembolsos já pagos ficam com fundo levemente esverdeado.

### Como pagar um reembolso (passo a passo)
1. Confira o comprovante: clique no nome do arquivo e veja se o valor e a despesa estão corretos.
2. Clique em **Copiar Pix**. Aparece "Chave Pix de [nome] copiada!". A chave é copiada já "limpa": para CPF e telefone, somente os números; para e-mail e chave aleatória, o texto como está.
3. Abra o aplicativo do seu banco, cole a chave e pague o valor.
4. Volte ao sistema e clique em **Marcar como pago**. O botão passa a **Pago** e aparece "Reembolso de [nome] marcado como pago!". O valor migra do cartão "Reembolsos Pendentes" para "Reembolsos Pagos".

### Desfazer "Pago"
Marcou por engano? Clique no botão **Pago**. Ele volta para **Marcar como pago** e aparece "Reembolso de [nome] marcado como pendente."

### Casos comuns
- **"Pix não cadastrado (Cadastrar)":** a pessoa não tem chave Pix no cadastro. Clique em **(Cadastrar)** para ir a **Pessoas & Equipe**, edite a pessoa e informe o **Tipo de Chave** e a **Chave Pix**. Depois volte à aba Reembolsos.
- **Valor "Não informado":** o comprovante não veio com valor. Nesta versão a produção não edita o valor diretamente na lista. Combine com o integrante: exclua o documento na aba **Documentos** e peça para ele reenviar informando o valor em **Valor a reembolsar (R$)**.
- **Valor errado:** mesmo caminho: exclua o documento e peça o reenvio com o valor correto.
- **Comprovante ilegível:** peça um novo envio.
- **Ninguém aparece na aba:** só entram aqui documentos enviados com a opção **Solicitar reembolso deste item** marcada. Mensagem: "Nenhuma solicitação de reembolso".
- **Quer somar por pessoa ou por show:** o **Relatório de Produção** traz um "Resumo de reembolsos" com solicitações, valores sem informação, soma declarada, total pago e subtotal por pessoa com a chave Pix.

### Como o tipo de documento influencia o reembolso
Em **Configurações → Tipos de documento**, cada tipo tem a opção **Reembolsável?**. Quando ela está marcada, ao escolher aquele tipo no envio o integrante já vê a caixa "Solicitar reembolso deste item" marcada (ele ainda pode desmarcar ou marcar em qualquer tipo). Na configuração padrão de conta nova, apenas "Nota fiscal" vem como reembolsável.

### Por que é importante
Evita perder pedidos de reembolso em conversas de WhatsApp, dá clareza de quanto falta pagar e cria um histórico do que foi pago em cada show, com valor e comprovante.

### Observações sobre moeda
Os valores são tratados em reais (R$). Quando o integrante envia um comprovante em outra moeda, a leitura automática alerta com "Atenção para a moeda detectada" antes de sugerir qualquer valor, para que ele confirme. O sistema não converte moedas: o valor informado precisa estar em reais.
