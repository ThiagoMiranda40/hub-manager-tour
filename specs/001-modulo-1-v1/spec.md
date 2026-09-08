# Spec — Módulo 1 V1: Controle de Tour + Rider Técnico Digital

## O quê e por quê

O Módulo 1 do Hub Manager Tour consolida o núcleo operacional de logística e produção para turnês musicais. Ele substitui controles manuais e planilhas dispersas por uma plataforma centralizada onde o produtor gerencia artistas, datas de shows, elenco fixo e volante, e exigências documentais críticas para viagens (passagens aéreas, vouchers de hotel, notas fiscais e comprovantes de reembolso). Adicionalmente, incorpora o Rider Técnico Digital, digitalizando o checklist de equipamentos de palco (backline) e camarim/catering para que a casa de show ou contratante confirme antecipadamente o atendimento de cada item, prevenindo surpresas no dia da apresentação.

Na versão inicial (protótipo validado), o loop de cadastro de show e link público para envio de documentos provou sua eficácia com dados reais de turnê. O V1 traz a maturidade funcional e de experiência de uso:
1. **Cadastro único de pessoas** com contatos, vínculos de artista/equipe geral e dados práticos para reembolso (chave Pix).
2. **Exigências configuradas por pessoa + show**, com suporte a presets em lote (ex.: aplicar Passagem + Hotel para toda a banda com um clique), eliminando trabalho repetitivo.
3. **Checklist pessoal dinâmica no link público do integrante**, permitindo que o músico veja instantaneamente o que já foi entregue e o que ainda falta antes de fazer upload.
4. **Confirmação antecipada do Rider pela casa de show**, com salvamento automático em tempo real, reversibilidade imediata e opção de impressão local.
5. **Conferência presencial no palco** otimizada para smartphones em ambiente de luz baixa.
6. **Sistema visual definitivo "Nocturne"** com acento roxo/lilás, dark/light calibrados para alto contraste (WCAG 2.2 AA), microinterações de 0.18s e resposta tátil imediata ao toque (`:active` em 100–150ms).

---

## Requisitos de Negócio

### RF-01 — Cadastro Centralizado de Pessoas, Vínculos e Dados Pix
Como administrador de produção,  
quero manter um catálogo único de pessoas com seus contatos, função padrão, vínculos de artista e chave Pix,  
para não precisar redigitar dados a cada novo show e agilizar o pagamento de reembolsos sem trocar mensagens manuais.

**Critério de aceite:**
- **Dado** que o administrador acessa o módulo de Pessoas/Equipe,  
  **quando** cadastra uma nova pessoa informando nome completo, telefone com DDD, função padrão, tipo/chave Pix e vínculos com artistas ou "equipe geral",  
  **então** a pessoa fica disponível permanentemente para ser escalada em qualquer data desses artistas ou turnês.
- **Dado** uma pessoa cadastrada com chave Pix,  
  **quando** ela tiver reembolsos aprovados em qualquer show,  
  **então** a chave Pix fica disponível para cópia imediata de 1 toque no painel financeiro do show.

---

### RF-02 — Sugestão e Ajuste de Elenco por Show
Como administrador de produção,  
quero que ao criar um show para um determinado artista o elenco seja automaticamente sugerido com base nos vínculos cadastrados,  
para agilizar a montagem da escala permitindo ajustes específicos para a data.

**Critério de aceite:**
- **Dado** a criação de um novo show para o Artista A,  
  **quando** a data é salva,  
  **então** o sistema pré-carrega no elenco do show todas as pessoas vinculadas ao Artista A mais as pessoas marcadas como "equipe geral".
- **Dado** a lista de elenco sugerido no show,  
  **quando** o administrador adiciona uma pessoa avulsa ou remove um integrante daquela data específica,  
  **então** a escala daquele show é modificada sem alterar o cadastro permanente da pessoa nem os demais shows.

---

### RF-03 — Exigência Individual de Documentos com Presets em Lote
Como administrador de produção,  
quero definir exigências individuais por pessoa + show e contar com presets em lote,  
para que o cálculo de pendências seja exato sem exigir dezenas de cliques manuais repetitivos.

**Critério de aceite:**
- **Dado** a prancheta de um show com 15 integrantes,  
  **quando** o administrador aciona a ação em lote "Aplicar preset: Toda a Banda (Passagem + Hotel)",  
  **então** todos os músicos selecionados recebem essas duas exigências simultaneamente em 1 clique.
- **Dado** um integrante local que não necessita de passagens nem hospedagem,  
  **quando** nenhuma exigência for associada a ele,  
  **então** ele é classificado expressamente como "Sem exigência configurada" (texto itálico suave sem badge colorido) e não é contabilizado na contagem de pendências do show.
- **Dado** o cabeçalho do show,  
  **quando** o produtor visualiza o balanço de elenco,  
  **então** o sistema detalha: "15 integrantes: 11 com exigências ativas (8 concluídos, 3 pendentes), 4 sem exigências nesta data".

---

### RF-04 — Envio Público com Checklist Pessoal Dinâmica e Reembolso
Como pessoa do elenco ou equipe de produção,  
quero acessar um link seguro sem necessidade de login e selecionar meu nome para ver o que já entreguei e o que ainda falta,  
para enviar arquivos sem duplicar envios anteriores e poder solicitar reembolso de despesas.

**Critério de aceite:**
- **Dado** o acesso à página pública `/p/[token]` pelo celular,  
  **quando** o integrante seleciona seu nome no seletor,  
  **então** a interface renderiza uma checklist dinâmica pessoal daquela data:
    - Itens já recebidos exibem badge verde "Recebido", nome do arquivo enviado e data/hora.
    - Itens pendentes exibem badge de alerta "Pendente" com botão de upload direto.
- **Dado** o anexo de um comprovante de despesa pessoal (alimentação/transporte local),  
  **quando** o integrante informa o valor em reais e marca a opção "Solicitar reembolso deste item",  
  **então** o envio é gravado como despesa reembolsável e entra no relatório de reembolsos do show.
- **Dado** um token inválido ou show desativado,  
  **quando** acessado,  
  **então** uma tela amigável informa o status e orienta contato com a produção.

---

### RF-05 — Painel de Pendências, Reembolsos com Cópia de Pix e Compartilhamento
Como administrador de produção,  
quero monitorar pendências, copiar chaves Pix com 1 toque para pagar reembolsos e compartilhar os links do show sem risco de trocar destinatários,  
para ter agilidade operacional máxima durante a rotina da turnê.

**Critério de aceite:**
- **Dado** a aba de Reembolsos na prancheta do show,  
  **quando** aberta pelo produtor,  
  **então** exibe a listagem de comprovantes recebidos com Nome, Despesa, Valor em R$, Comprovante, Chave Pix do integrante e botão "Copiar Pix", além de switch para marcar "Reembolsado".
- **Dado** a área de compartilhamento do show,  
  **quando** visualizada,  
  **então** apresenta dois cards visuais nitidamente diferenciados por cor e ícone semântico:
    - 📱 Card "Link do Elenco": com orientação "Envie aos músicos e equipe para envio de passagens e vouchers".
    - 🏛️ Card "Link do Rider": com orientação "Envie ao contratante ou casa de show para confirmação técnica".
  - Ao clicar em copiar, o feedback de notificação (toast) confirma explicitamente qual link foi copiado.

---

### RF-06 — Catálogo de Rider Padrão por Artista
Como administrador de produção,  
quero cadastrar o rider técnico padrão de cada artista dividido em categorias (Backline/Palco e Camarim/Catering),  
para estabelecer a especificação oficial de equipamentos e necessidades que servirá de base para todas as turnês do artista.

**Critério de aceite:**
- **Dado** o cadastro de um Artista,  
  **quando** o administrador acessa a seção de Rider Técnico,  
  **então** pode cadastrar itens organizados por categoria (Backline / Som / Iluminação / Camarim / Outros), informando nome do item, especificação detalhada, quantidade e se é mandatório.
- **Dado** um rider padrão cadastrado,  
  **quando** um item for editado ou removido do catálogo padrão,  
  **então** os shows futuros assumem o novo padrão, mantendo inalterados os shows passados ou já confirmados com contratantes.

---

### RF-07 — Rider do Show com Auto-Save, Reversibilidade e Impressão Local
Como casa de show, contratante ou promotor local,  
quero acessar um link público exclusivo do rider daquela data sem precisar de login,  
para confirmar item por item o que será atendido, sinalizar exceções justificadas com auto-save em tempo real e poder imprimir uma via para minha equipe local.

**Critério de aceite:**
- **Dado** o acesso da casa de show pelo link público `/r/[token]`,  
  **quando** clica em "Confirmar" ou "Sinalizar Exceção" em qualquer item,  
  **então** a alteração é salva automaticamente em tempo real e o cabeçalho exibe o indicador "Salvo às HH:MM".
- **Dado** que a casa marcou um item como "Exceção",  
  **quando** a caixa de nota surge com transição suave (0.18s) e a casa clica de volta em "Confirmar",  
  **então** o status reverte imediatamente para confirmado sem travas ou recarregamento de página.
- **Dado** a conferência finalizada pela casa,  
  **quando** clica em "Imprimir Cópia",  
  **então** o navegador abre visão de impressão limpa da lista acordada, pronta para ser repassada aos técnicos locais de palco.

---

### RF-08 — Conferência Física no Dia do Show (Modo Palco Mobile)
Como equipe técnica da produção no dia do evento,  
quero realizar a conferência presencial dos itens entregues no palco com botões amplos de polegar em smartphone,  
para auditar equipamentos em ambiente de pouca luz e som alto sem erro de toque.

**Critério de aceite:**
- **Dado** o acesso à conferência no smartphone durante a montagem de palco,  
  **quando** a equipe visualiza os itens,  
  **então** cada item é apresentado em cards com tipografia contrastada e botões amplos (área de toque >= 48px): "Recebido Conforme" (verde) e "Divergência" (alerta).
- **Dado** que um equipamento chegou divergente (ex.: modelo diferente ou avariado),  
  **quando** o técnico clica em "Divergência",  
  **então** pode ditar ou digitar a observação, ficando gravada na ficha técnica do show para auditoria pós-evento.

---

### RF-09 — Ficha de Produção Consolidada para Impressão e Compartilhamento
Como administrador de produção,  
quero gerar uma Ficha de Produção completa do show em formato limpo e pronto para impressão (A4) ou exportação,  
para distribuir à equipe e afixar no camarim com contatos, cronograma, elenco e pendências sanadas.

**Critério de aceite:**
- **Dado** um show com elenco e documentos preenchidos,  
  **quando** o administrador clica em "Ficha de Produção",  
  **então** uma visão condensada exibe dados da cidade, local, data, contatos de emergência, lista de elenco com funções e status de logística, com formatação otimizada para papel/PDF sem elementos de navegação do sistema.

---

### RF-10 — Extração Automatizada de Dados por Inteligência Artificial (Stretch Goal)
Como administrador de produção,  
quero que o sistema analise comprovantes enviados ou documentos de rider em PDF e sugira o preenchimento automático dos dados,  
para eliminar digitação manual de número de voo, hotel, valor de nota ou checklist de rider legado.

**Critério de aceite:**
- **Dado** o upload de um comprovante em PDF ou imagem legível (passagem ou nota fiscal),  
  **quando** o processamento inteligente atua,  
  **então** sugere automaticamente ao produtor campos extraídos (nº voo, hotel, valor em moeda, emissor) para confirmação com um clique.
- **Dado** o upload de um arquivo de rider técnico legado (PDF/DOCX) nas configurações do artista,  
  **quando** solicitada a importação por inteligência,  
  **então** o sistema estrutura os itens em categorias e quantidades pré-preenchidas para revisão e aprovação do produtor.

---

### RF-11 — Priorização de Itens Inegociáveis no Balanço do Rider Técnico
> Adendo pós-T-09 (07/09/2026): requisito identificado durante revisão da T-09, antes da execução de T-10/T-11.

Como produtor ou casa de show acompanhando o rider técnico de um evento,  
quero que itens inegociáveis e desejáveis sejam tratados com peso diferente no status geral,  
para identificar de forma imediata se um risco real (item inegociável) está pendente, sem confundir com pendências de baixo impacto.

**Critério de aceite:**
- **Dado** um rider com itens inegociáveis e desejáveis,  
  **quando** todos os desejáveis estiverem confirmados mas houver ao menos um inegociável pendente ou em exceção,  
  **então** o status geral do rider não pode ser exibido como "completo"/"tudo confirmado".
- **Dado** um item marcado como inegociável,  
  **quando** ele for sinalizado como exceção pela casa de show,  
  **então** o alerta exibido tem severidade visualmente distinta (mais crítica) de uma exceção em item desejável.
- **Dado** uma listagem de itens do rider (aba Rider Técnico do show, e página pública /r/[token]),  
  **quando** houver itens pendentes de ambos os tipos,  
  **então** os itens inegociáveis pendentes aparecem antes dos desejáveis pendentes na ordem de exibição.
- **Dado** o cálculo de progresso do rider,  
  **quando** exibido ao usuário,  
  **então** existem dois contadores separados — inegociáveis e desejáveis — em vez de um único percentual combinado.

---

### RF-12 — Tema Claro/Escuro Alternável pelo Usuário
> Adendo pós-T-11 (08/09/2026): requisito de UI/UX identificado a partir do wireframe de alta fidelidade (package_ux_ui/), antes de T-14/T-15.

Como usuário do sistema (produtor, integrante da equipe),  
quero poder alternar manualmente entre tema claro e escuro,  
para usar o sistema no ambiente de luz que for mais confortável.

**Critério de aceite:**
- **Dado** o primeiro acesso sem preferência salva,  
  **quando** a página carrega,  
  **então** o tema segue prefers-color-scheme do navegador.
- **Dado** o alternador de tema (ícone lua/sol, no rodapé da sidebar em modo sidebar, ou canto superior direito em modo cabeçalho),  
  **quando** o usuário clica,  
  **então** o tema muda imediatamente e a escolha é salva em localStorage, prevalecendo sobre a preferência do sistema em visitas futuras.
- **Dado** qualquer tela (interna ou pública, /p/[token] e /r/[token]),  
  **quando** o tema é escuro,  
  **então** todos os componentes, incluindo a logo, respeitam a paleta escura calibrada na T-04 sem quebra de contraste.

---

### RF-13 — Navegação Adaptável: Cabeçalho ou Barra Lateral Recolhível
> Adendo pós-T-11 (08/09/2026): mesma origem do RF-12.

Como usuário do sistema,  
quero escolher entre navegação no cabeçalho superior ou barra lateral recolhível/expansível,  
para usar o layout mais confortável ao meu fluxo de trabalho.

**Critério de aceite:**
- **Dado** o usuário em desktop/tablet (acima de 640px),  
  **quando** ele escolhe o modo sidebar em Configurações,  
  **então** a navegação migra para uma barra lateral esquerda, largura 240px expandida / 76px recolhida, com botão de recolher/expandir (caret esquerda/direita).
- **Dado** a sidebar recolhida,  
  **quando** exibida,  
  **então** mostra só ícones de navegação e o símbolo da marca (sem o wordmark completo).
- **Dado** o modo cabeçalho (padrão atual),  
  **quando** escolhido,  
  **então** a navegação permanece no topo como hoje.
- **Dado** a escolha entre os dois modos,  
  **quando** feita,  
  **então** é salva em localStorage e mantida entre sessões.
- **Dado** o acesso em mobile (abaixo de 640px, breakpoint sm: já usado no resto do sistema),  
  **quando** a tela carrega,  
  **então** a navegação sempre vira menu hambúrguer, independente da preferência desktop salva.

---

## Requisitos Não-Funcionais

### RNF-01 — Usabilidade Mobile e Feedback Visual de Toque (:active)
Como usuário em dispositivo móvel (integrante do elenco, equipe técnica no palco ou contratante local),  
quero receber confirmação visual instantânea ao tocar em qualquer elemento interativo,  
para ter certeza física e imediata de que o comando foi registrado antes da navegação ou mutação ocorrer.

**Critério de aceite:**
- **Dado** o acesso ao sistema em dispositivo com tela sensível ao toque (smartphone ou tablet),  
  **quando** o usuário toca em qualquer elemento interativo — botão primário, botão secundário, item de menu/navegação, card clicável de show, pílula de filtro, seletor de aba (tab) ou dropzone de arquivo —,  
  **então** o elemento produz uma reação visual perceptível imediata (mudança de cor/fundo ou leve encolhimento tátil `scale(0.97)`) com transição rápida de ~100–150ms (nominal 120ms), antes da navegação ou ação acontecer.
- **Dado** o acesso por desktop com mouse e cursor,  
  **quando** o cursor passa sobre os elementos interativos,  
  **então** todos os estados de `:hover` existentes continuam funcionando normalmente (o feedback `:active` é aditivo, não substitutivo).

---

## Fora de Escopo do Módulo 1 (Produto)

Os seguintes itens pertencem explicitamente às fases futuras e **não** fazem parte do Módulo 1 V1:
1. **Contratos e Assinatura Digital (Módulo 6a - Fase 2):** Geração de minutas jurídicas, análise de cláusulas por IA e integração com a plataforma Autentique.
2. **Cotação e Reserva de Passagens/Hospedagem (Módulo 2 - Fase 3):** Agentes de busca autônoma em companhias aéreas ou OTAs e catálogo de fornecedores locais.
3. **CRM e Marketing de Audiência (Módulo 3 - Fase 4):** Importação de listas de fãs, disparos via WhatsApp e segmentação de público.
4. **Venda e Checkout de Ingressos (Módulos 4a e 4b - Fases 5 e 6):** Conexão com plataformas de bilheteria e processamento de pagamentos (Asaas/AbacatePay).
5. **Agente Conversacional por Voz/WhatsApp (Módulo 5 - Fase 7):** Operação do sistema por comandos de áudio ou mensagens diretas.
6. **Módulo Financeiro Integral (Módulo 6b - Fase 8):** Fluxo de caixa corporativo, split de cachê entre integrantes e conciliação bancária via Open Finance.
7. **Contas de Acesso com Login para Integrantes ou Promotores:** O acesso externo continua operando por links seguros com token exclusivo por show, sem atrito de autenticação.

---

## Cenários-Chave de Validação Ponta a Ponta

### Cenário 1: Ciclo Completo com Preset em Lote e Exigência Individual
1. O administrador cadastra o Artista "Banda Alpha" e cadastra no banco de equipe: João (Vocalista, Pix: CPF), Maria (Técnica, Pix: e-mail) e Carlos (Produtor Geral, Equipe Geral).
2. O administrador cria o show "Banda Alpha em Curitiba".
3. O sistema carrega automaticamente João, Maria e Carlos no elenco.
4. O administrador usa a ação rápida: "Aplicar Passagem + Hotel para Músicos" (aplica em João com 1 clique). Maria recebe apenas Passagem. Carlos fica "Sem exigência configurada".
5. O cabeçalho exibe: "3 integrantes: 2 com exigências ativas (3 docs esperados: 2 de João + 1 de Maria), 1 sem exigência". Carlos não onera o cálculo de pendências.

### Cenário 2: Envio com Checklist Dinâmica e Liquidação de Reembolso via Pix
1. João abre o link do show no celular (`/p/[token]`).
2. Ao selecionar seu nome, a tela exibe sua checklist: Passagem (Pendente) e Hotel (Pendente).
3. João anexa a passagem. A checklist atualiza instantaneamente para Passagem: [Recebido].
4. Em seguida, João anexa um recibo de alimentação de R$ 85,00, marcando "Solicitar reembolso".
5. O produtor abre a prancheta do show: na aba Reembolsos, visualiza o lançamento de João de R$ 85,00, clica no botão "Copiar Pix" (copia a chave Pix de João cadastrada), efetua o pagamento no banco e clica no switch "Marcar como Reembolsado".

### Cenário 3: Confirmação do Rider com Auto-Save, Reversibilidade e Conferência
1. A casa de eventos abre o link `/r/[token]`.
2. A casa clica em "Confirmar" na Bateria e "Sinalizar Exceção" no Amplificador, digitando nota com a alternativa.
3. O cabeçalho confirma visualmente "Salvo às 14:15". Em seguida, a casa descobre que conseguiu o amplificador e clica em "Confirmar" novamente; a exceção reverte para confirmado imediatamente.
4. No dia do show, o roadie abre o "Modo Palco" no smartphone e faz o check-in presencial com botões grandes de polegar, marcando os itens entregues.
