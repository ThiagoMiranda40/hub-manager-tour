# Backlog V1.1 — Hub Manager Tour

> Itens levantados após o lançamento do Módulo 1 V1 (T-01 a T-17). 
> Ainda sem priorização formal — próximo passo é aplicar uma matriz de 
> Impacto × Esforço e transformar os itens escolhidos em RFs formais, 
> seguindo a mesma disciplina usada na Spec 001 (desenho de UI/UX, 
> segurança e QA/TDD antes do código, quando aplicável).

## Mobile e Usabilidade
- Verificar interface mobile de ponta a ponta (revisão geral)
- Aumentar tamanho de fonte no celular
- Melhorar visualização de botões/badges em todos os dispositivos
- Confirmar se o Relatório de Produção no mobile está resolvido após o 
  fix da tabela cortada (T-13/pós-lançamento)
- Melhorar cores/contraste do Modo Palco
- Melhorar UX de confirmação do rider (destaque maior para 
  "confirmado", cinza para "inegociável")
- Melhorar mecanismo de busca da Agenda (campos escondidos que não 
  tomem espaço da tela)

## Rider Técnico
- Rider do show precisa refletir atualizações feitas depois no rider 
  padrão do artista (hoje, uma vez clonado, fica desconectado)
- Poder editar o rider de um show específico sem alterar o rider padrão 
  do artista
- Cards de Total/Confirmados/Exceções/Pendentes como filtro clicável, 
  não só contador visual
- Campo de observação no documento de Rider Técnico
- Benchmarking com tecrider.com — avaliar recurso de mapa de palco 
  gráfico (drag-and-drop de ícones de equipamento)

## Documentos e Financeiro
- Drag-and-drop de arquivo em todos os pontos de upload
- Consolidar documentos (passagens, notas, cupons) num único relatório 
  para o produtor
- Integração com sistema de contabilidade
- Possibilidade de emissão de nota fiscal

## Estrutura e Navegação
- Tirar criação de Artista/Equipe/Rider de Configurações — manter lá 
  só navegação, perfil e senha
- Revisar organização da área de criar rider
- Visualização em lista em Pessoas & Equipe (além dos cards atuais)

## Comunicação e Transparência
- Sininho de notificações não lidas no menu (mensagens de negociação 
  de rider, lançamentos de funcionalidades, novidades de tutorial)
- Canal para usuários reportarem bugs
- Área de solicitação de novas funcionalidades
- Área de transparência de roadmap (mostrar o que está sendo 
  construído, o que já foi entregue, o que vem a seguir)
- Página de tutorial com textos e vídeos (ideia geral — detalhamento 
  por papel de usuário — produtor, integrante, casa de show — fica 
  para quando for priorizada)

## Administrativo
- Área de perfil do usuário
- Área de admin do sistema (Tríade)

## Infraestrutura
- Suporte offline real (cache de dados via IndexedDB) para o Modo 
  Palco funcionar sem sinal na casa de show — instalação como PWA já 
  resolvida separadamente, este item é sobre dados, não sobre a casca 
  do app

## Já entregue (fora do escopo deste backlog)
- Tema claro/escuro (RF-12)
- Navegação adaptável cabeçalho/sidebar (RF-13)
- Negociação de exceção de rider via réplica/tréplica (RF-14)
- Instalação como PWA no Android
