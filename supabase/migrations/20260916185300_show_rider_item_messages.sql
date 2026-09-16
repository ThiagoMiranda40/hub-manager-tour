-- Migration: Cria tabela de mensagens de negociação do rider (RF-14 / T-17 / AppSec Seção 7)

CREATE TABLE IF NOT EXISTS public.show_rider_item_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_rider_item_id uuid NOT NULL REFERENCES public.show_rider_items(id) ON DELETE CASCADE,
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('producer', 'venue')),
  author_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance e consultas anti-IDOR
CREATE INDEX IF NOT EXISTS idx_show_rider_item_messages_item 
  ON public.show_rider_item_messages(show_rider_item_id);

CREATE INDEX IF NOT EXISTS idx_show_rider_item_messages_show 
  ON public.show_rider_item_messages(show_id);

CREATE INDEX IF NOT EXISTS idx_show_rider_item_messages_created 
  ON public.show_rider_item_messages(created_at ASC);

-- Ativação estrita de Row Level Security (RLS)
ALTER TABLE public.show_rider_item_messages ENABLE ROW LEVEL SECURITY;

-- Produtor autenticado: leitura restrita aos shows de sua propriedade
CREATE POLICY "Producers can view messages from their shows"
  ON public.show_rider_item_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_rider_item_messages.show_id
        AND shows.user_id = auth.uid()
    )
  );

-- Produtor autenticado: inserção restrita aos shows de sua propriedade com author_type travado em 'producer'
CREATE POLICY "Producers can insert messages to their shows"
  ON public.show_rider_item_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_type = 'producer'
    AND EXISTS (
      SELECT 1 FROM public.shows
      WHERE shows.id = show_rider_item_messages.show_id
        AND shows.user_id = auth.uid()
    )
  );

-- Decisão explícita de segurança (AppSec Seção 7):
-- NENHUMA política direta para o role 'anon'.
-- Toda interação da casa de show (leitura e escrita via rider_public_token)
-- é intermediada com validação e rate limit em Server Functions via supabaseAdmin.
