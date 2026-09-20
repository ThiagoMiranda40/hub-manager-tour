# Rider Técnico, negociação com a casa de show e Modo Palco

## O que é o rider técnico e por que ele importa
O rider é a lista de equipamentos e necessidades que o artista exige da casa de show: backline (instrumentos e amplificadores), som, iluminação, camarim e outros. Normalmente ele é um PDF enviado por e-mail e ignorado, e os problemas só aparecem no dia do show. No Hub Manager Tour, a casa de show confirma cada item por um link, a produção acompanha as respostas com antecedência e, no dia, a equipe confere fisicamente cada item no palco.

Cada item do rider tem: **categoria** (Backline, Som, Iluminação, Camarim ou Outros), **nome**, **quantidade**, **especificação** (detalhes como modelo ou voltagem) e o **grau de importância**:
- **Inegociável:** a casa de show precisa fornecer, sem alternativa aceitável.
- **Desejável:** pode ser negociado ou substituído sem inviabilizar o show.

## Aba Rider Técnico
**Onde fica:** prancheta do show → aba **Rider Técnico** (o contador mostra "confirmados/total").

**Para que serve:** acompanhar a resposta da casa de show item por item, negociar exceções e conferir os equipamentos no dia do show.

### De onde vêm os itens do rider do show
- Ao criar o show, o sistema copia o **rider padrão do artista** (cadastrado em Configurações). Depois disso, o rider do show é independente: mudar o rider padrão não altera shows já criados.
- Se o show nasceu sem itens, aparece "Nenhum item de rider neste show" com o botão **Clonar Rider Padrão do Artista Agora**. Ele copia o rider padrão para o show. **Só funciona em show sem nenhum item** e se o artista já tiver rider padrão em Configurações; caso contrário aparece uma mensagem explicando o motivo.

### Cartões de resumo (também são filtros)
- **Total de Itens:** quantidade de itens especificados. Clique para ver todos.
- **Confirmados:** itens confirmados pela casa, com o percentual atendido e, se houver, "(+N ressalva)" para os aceitos com ressalva.
- **Exceções:** itens em que a casa informou que não consegue atender (mostra "alternativas sugeridas").
- **Pendentes:** itens que a casa ainda não respondeu ("aguardando casa").
Clique em um cartão para filtrar a lista; clique de novo para remover o filtro. "Limpar filtro ✕" também remove.

### Enviar o rider para a casa de show
No cartão verde **Link Público do Rider para a Casa de Show**:
- **Copiar Link do Rider:** copia o endereço (aparece "Link do rider para a casa copiado! Envie ao contratante ou promotor local."). Cole em e-mail ou WhatsApp.
- **Abrir:** abre a página da casa de show em nova aba, para você ver como ela enxerga.
A casa de show **não precisa de login** e confirma os itens com salvamento automático.

### Lista de itens e o que cada situação significa
Cada item mostra categoria, nome, quantidade (x2, por exemplo), selo **Inegociável** ou **Desejável**, a especificação e a situação:
- **Pendente:** a casa ainda não respondeu.
- **Confirmado:** a casa confirmou que fornece.
- **Exceção:** a casa não consegue atender como especificado; a "Nota da casa" mostra a alternativa ou o motivo.
- **Em negociação:** existe conversa entre produção e casa sobre o item.
- **Aceito c/ ressalva:** a produção aceitou a alternativa/limitação da casa; conta como atendido, mas continua visualmente diferente de "Confirmado".
Se o item já foi conferido no palco, aparece também **Palco: OK ✓** ou **Palco: Divergência ⚠** (passe o mouse para ler a observação).

Nesta aba, os itens aparecem na ordem em que foram cadastrados no rider. Na página da casa de show, os itens inegociáveis pendentes aparecem primeiro. O status geral do rider (no Relatório de Produção) só é considerado completo quando os itens inegociáveis estão resolvidos.

### Negociar uma exceção (produção ↔ casa de show)
Quando a casa sinaliza exceção em um item, você decide:
1. **Aceitar com ressalva:** aceita a alternativa da casa. Aparece "Exceção aceita com ressalva registrada!". O item deixa de contar como pendência, mas segue marcado como aceito com ressalva. Se mudar de ideia, use **Reabrir negociação** (aparece "Negociação reaberta para o item.").
2. **Recusar / Propor Alternativa:** abre uma caixa "Sua justificativa de recusa ou especificação de alternativa para a casa:". Escreva o motivo ou a alternativa e clique em **Enviar Réplica** (aparece "Réplica enviada para a casa de show!"). Se deixar em branco, aparece "Digite uma justificativa ou alternativa antes de enviar." O botão passa a se chamar **Fechar Réplica** enquanto a caixa está aberta.
3. **WhatsApp:** abre o WhatsApp com uma mensagem pronta (artista, data, item, resumo da sua proposta e o link do rider) e o aviso de que a resposta só é registrada oficialmente se for dada pelo link. Você escolhe para quem enviar.

O **histórico de negociação** aparece no item, com as mensagens da "Produção (Você)" e da "Casa de Show" e o horário. A casa de show vê a sua réplica no mesmo link e pode concordar ou responder (tréplica). Não há limite de rodadas. Enquanto houver negociação em aberto, a casa não consegue simplesmente marcar o item como confirmado: a resolução depende de você aceitar com ressalva.

**Avisos:** quando a casa responde, a prancheta mostra um aviso na tela ("Nova resposta da casa de show sobre [item]..."). Ele aparece quando a tela atualiza os dados (ao abrir a prancheta ou voltar para a aba do navegador). O sistema **não envia e-mail nem notificação push** por conta própria; por isso vale abrir a aba Rider Técnico com frequência perto do show.

### Casos de uso
- *Casa disse que não tem o amplificador pedido:* o item aparece como Exceção com a nota. Se o substituto serve, clique em **Aceitar com ressalva**. Se não, **Recusar / Propor Alternativa** com o modelo aceitável.
- *Saber o que ainda falta responder:* clique no cartão **Pendentes**.
- *Ver só o que é crítico:* procure os itens **Inegociável** com situação Pendente ou Exceção (use os cartões **Pendentes** e **Exceções** para filtrar).

## Modo Palco (conferência física no dia do show)
**Onde fica:** prancheta do show → aba **Rider Técnico** → botão **Modo Palco (Conferência)** (ao lado do título "Itens de Palco e Camarim"). Para sair: o mesmo botão, que passa a se chamar **Sair do Modo Palco**.

**Para que serve:** no dia da montagem, a equipe técnica confere no palco se cada equipamento realmente chegou como especificado, usando o celular, com cartões grandes e botões fáceis de tocar (área mínima de toque de 48 px) e cores contrastantes para pouca luz.

**Importante:** o Modo Palco faz parte do sistema logado. Quem vai conferir precisa estar com a conta do produtor aberta no celular. Não existe um link público separado para a equipe técnica. O sistema precisa de internet; não há modo offline.

**O que aparece:** o painel escuro "Modo Palco · Conferência Física Presencial" com:
- **Conferência no Palco (Filtro Primário):** **Todos (N)**, **N a conferir**, **N OK** e **N Diverg.** (divergências). Toque em uma pílula para filtrar.
- **Status da Casa (Filtro Secundário):** **Todos**, **Confirmados**, **Exceções**, **Pendentes**. Os dois filtros podem ser combinados. **Limpar filtros ✕** volta ao padrão.
- Um cartão por item, ordenado por prioridade: primeiro os itens com divergência, depois os ainda não conferidos (inegociáveis e pendentes de resposta da casa na frente) e, por último, os já conferidos como conformes. Cada cartão traz categoria, selo Inegociável/Desejável, **Atenção Prioritária** (aparece em item inegociável que ainda está pendente ou com divergência), nome, quantidade, especificação, o que a casa respondeu e a situação de conferência: **A conferir**, **✓ Conforme no Palco** ou **⚠ Divergência Registrada**.

**Como conferir um item:**
1. Encontre o item e verifique fisicamente o equipamento.
2. Se está conforme, toque em **OK Recebido**. O botão passa a "Recebido Conforme ✓" e aparece "Item conferido e confirmado no palco!".
3. Se chegou diferente (modelo errado, avaria, voltagem incorreta), toque em **Divergência**. Abre a caixa "Observação da Divergência (Áudio/Texto):". Descreva o problema (digite ou use o ditado por voz do teclado do celular) e toque em **Salvar Divergência**. Aparece "Divergência registrada na ficha técnica do show." A observação pode ser corrigida depois em **Editar**.
4. Para desfazer uma conferência, toque em **Desmarcar conferência física** (o item volta para "A conferir").

**Situações especiais:**
- "Tudo conferido no palco!": todos os itens foram auditados. Mostra quantos estão conformes e, se houver divergências, o aviso para avisar a produção. O botão **Revisar todos os itens do rider (N)** volta à lista.
- "Nenhum item com esta combinação de filtros": os filtros escolhidos não têm itens. Se ainda restarem itens a conferir com outro status da casa, o sistema avisa e oferece **Ver todos os N itens a conferir no palco**.
- Sempre que você entra no Modo Palco, os filtros começam limpos.

**O que fica registrado:** a conferência e as divergências ficam gravadas no show e aparecem no rider (selos "Palco: OK/Divergência") e no **Relatório de Produção** (coluna "Conferência Palco"), dando um histórico para auditoria depois do evento.

**Por que é importante:** evita descobrir só na hora do show que faltou um item; cria um registro do que foi entregue e do que divergiu.
