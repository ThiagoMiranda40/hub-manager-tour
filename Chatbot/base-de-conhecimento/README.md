# Base de conhecimento do agente de suporte (Hub Manager Tour)

Esta pasta guarda os textos que ensinam o agente de suporte (Chatbase) a explicar o Hub Manager Tour aos usuários. Os arquivos `.md` daqui são a **fonte oficial**: toda atualização começa neles.

## Arquivos
| Arquivo | Vai para o Chatbase como |
|---|---|
| `00-instrucoes-do-agente-chatbase.md` | **Instruções do agente** (colar no campo de instruções; não subir como fonte de treino) |
| `01` a `12` (`.md`) | **Fontes de treino** (subir como arquivo `.txt`, veja abaixo) |

## Regras de conteúdo
- Somente conteúdo de **uso do sistema** para o produtor (e o que integrante e casa de show veem). Escrito em português, com os **nomes exatos** de menus, abas, botões e mensagens da interface.
- Cada recurso segue o formato: **para que serve → onde fica e o caminho → passo a passo → casos de uso → por que é importante → mensagens e cuidados.** Repita o caminho em cada seção, porque o agente pode ler apenas um trecho.
- **Nunca incluir:** links individuais ou de rider, tokens, e-mails ou dados reais de clientes, chaves, arquitetura, regras de segurança do banco, código, estratégia de negócio, preços ou concorrentes (isso fica no PRD e nas specs, que não são fonte do agente).
- Não descrever como funcionalidade o que ainda está no backlog. Se algo não existe, a seção "O que o sistema não faz" do arquivo 12 deve dizer.

## Quando atualizar
Sempre que uma entrega mudar **nomes de botões, abas, mensagens, caminhos de navegação ou regras** (por exemplo, novos botões de envio de link na aba Elenco & Exigências, recuperação de senha, notificações por e-mail). Uma entrega de tela nova só está "pronta" quando esta pasta foi atualizada.

Checklist rápido depois de cada entrega:
1. Que telas ou fluxos mudaram? Atualize o arquivo do tema (03 a 11).
2. O caminho no **mapa** do arquivo 01 continua correto? E o glossário?
3. Alguma pergunta do arquivo 12 ficou desatualizada? Alguma "limitação" virou funcionalidade (ou o contrário)?
4. Regere os `.txt` e atualize as fontes no Chatbase (abaixo).

## Como publicar no Chatbase
1. Os arquivos `.txt` são cópias dos `.md` com a extensão trocada (o conteúdo é idêntico; o Chatbase aceita `.txt`, `.pdf`, `.doc` e `.docx`). No Windows ou Mac basta copiar e renomear a extensão, ou pedir ao Antigravity/Claude para gerar.
2. No Chatbase, abra o agente → fontes de treino → remova as versões antigas dos arquivos alterados e envie as novas → **retreine** o agente.
3. Cole o conteúdo do arquivo `00` no campo de instruções sempre que ele mudar.
4. Teste com 10 a 15 perguntas reais (as do arquivo 12 e algumas fora do escopo, como preços ou pedidos para ver dados de um show) antes de publicar.

## Observação sobre o "mapa" do arquivo 01
Ele é uma lista de "quero fazer X → caminho". É o trecho mais consultado pelo agente; mantenha os nomes exatamente como aparecem na tela.
