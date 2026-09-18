# Backlog V1.1 — Hub Manager Tour

> Priorizado em 17/09/2026 via matriz Impacto × Esforço. Sequência 
> recomendada: Ganho Rápido → Grande Aposta → Preenchimento.

![Matriz de priorização do Backlog V1.1](./backlog-priorizacao-v1.1.png)

## Ganho rápido (alto impacto, baixo esforço) — fazer primeiro
- Estrutura da página de tutorial (código simples; conteúdo — textos e 
  vídeos — é produzido por Thiago incrementalmente depois de a 
  estrutura existir)
- Revisão geral da interface mobile
- Aumentar fonte no celular
- Ajustar visualização de botões/badges em todos os dispositivos
- Melhorar cores/contraste do Modo Palco
- Cards de Total/Confirmados/Exceções/Pendentes do Rider como filtro 
  clicável
- Visualização em lista em Pessoas & Equipe
- Canal para usuários reportarem bugs
- Área de solicitação de novas funcionalidades
- Área de perfil do usuário
- Drag-and-drop de upload (suporte nativo do navegador, baixo esforço 
  de implementação)
- Tela de abertura animada (logo em movimento, tipo equalizador de áudio) 
  exibida por ~800ms ao abrir o app, entre a splash nativa do Android/PWA 
  (que não é editável — gerada pelo sistema a partir do manifest.json) e a 
  tela de login — [CONCLUÍDO]

## Grande aposta (alto impacto, alto esforço) — priorizar, mas planejar bem
- Área de transparência de roadmap — construir v1 enxuta primeiro 
  (lista estática editada só por Thiago, sem votação/interação do 
  usuário), sofisticar depois se fizer sentido
- Rider do show precisa refletir atualizações feitas depois no rider 
  padrão do artista
- Editar rider de um show específico sem alterar o rider padrão do 
  artista
- Sininho de notificações não lidas no menu
- Suporte offline real (IndexedDB) para o Modo Palco
- Área de admin do sistema (Tríade)

## Preenchimento (baixo impacto, baixo esforço) — fazer quando sobrar tempo
- Melhorar mecanismo de busca da Agenda
- Melhorar UX de confirmação do rider
- Campo de observação no documento de Rider Técnico
- Revisar organização da área de criar rider
- Tirar criação de Artista/Equipe/Rider de Configurações
- Consolidar documentos (passagens/notas/cupons) num relatório único

## Já entregue (fora deste backlog)
- Tema claro/escuro (RF-12)
- Navegação adaptável cabeçalho/sidebar (RF-13)
- Negociação de exceção de rider via réplica/tréplica (RF-14)
- Instalação como PWA no Android

## Fora do backlog — ver specs/candidatos-novas-specs.md
- Benchmarking tecrider.com, integração com contabilidade e emissão de 
  nota fiscal saíram deste backlog por exigirem escopo próprio — 
  registrados em arquivo separado.
