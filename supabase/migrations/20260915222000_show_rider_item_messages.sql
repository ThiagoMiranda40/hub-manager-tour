-- =============================================================================
-- Migration: 20260915222000_show_rider_item_messages.sql
-- Descrição: Tabela show_rider_item_messages para negociação de exceção do rider (RF-14),
--            atualização do CHECK constraint de show_rider_items para aceitar 'accepted_with_exception',
--            e RLS estrita sem permissões diretas para o role 'anon' (AppSec Seção 7).
-- =============================================================================

-- 1. Atualizar constraint de status em show_rider_items para aceitar 'accepted_with_exception'
ALTER TABLE public.show_rider_items DROP CONSTRAINT IF EXISTS chk_rider_item_status;
ALTER TABLE public.show_rider_items ADD CONSTRAINT chk_rider_item_status CHECK (
  status IN ('pending', 'confirmed', 'exception', 'accepted_with_exception')
);

-- 2. Tabela de mensagens de negociação do item de rider
CREATE TABLE IF NOT EXISTS public.show_rider_item_messages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  show_rider_item_id  uuid        NOT NULL REFERENCES public.show_rider_items(id) ON DELETE CASCADE,
  show_id             uuid        NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  author_type         text        NOT NULL CHECK (author_type IN ('producer', 'venue')),
  message             text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_rider_messages_item ON public.show_rider_item_messages (show_rider_item_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_rider_messages_show ON public.show_rider_item_messages (show_id);
CREATE INDEX IF NOT EXISTS idx_rider_messages_created ON public.show_rider_item_messages (created_at DESC);

-- Permissões de role:
-- Authenticated tem permissão de SELECT e INSERT restrito via RLS.
-- O role 'anon' NÃO recebe permissão direta nesta tabela (todo acesso da casa é intermediado
-- exclusivamente por Server Functions via supabaseAdmin com checagem anti-IDOR e rate limit).
GRANT SELECT, INSERT ON public.show_rider_item_messages TO authenticated;
GRANT ALL ON public.show_rider_item_messages TO service_role;

-- Ativar RLS
ALTER TABLE public.show_rider_item_messages ENABLE ROW LEVEL SECURITY;

-- Produtor autenticado só pode ler mensagens dos seus próprios shows
CREATE POLICY "producer_select_messages"
  ON public.show_rider_item_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_rider_item_messages.show_id
        AND shows.user_id = auth.uid()
    )
  );

-- Produtor autenticado só pode inserir mensagens nos seus próprios shows com author_type = 'producer'
CREATE POLICY "producer_insert_messages"
  ON public.show_rider_item_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    author_type = 'producer' AND
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_rider_item_messages.show_id
        AND shows.user_id = auth.uid()
    )
  );
