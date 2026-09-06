-- ============================================================================
-- Módulo 1 V1 — Migração de Schema
-- Spec: specs/001-modulo-1-v1/data-model.md
-- ============================================================================
-- NOVAS TABELAS: people, person_artists, show_requirements,
--                artist_rider_template_items, show_rider_items
-- ALTERAÇÕES:    shows (+ rider_public_token),
--                cast_members (+ person_id),
--                documents (+ is_reimbursed, reimbursed_at)
-- BACKFILL:      people ← cast_members (nomes existentes)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NOVA TABELA: people
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.people (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name            text         NOT NULL,
  phone           text,
  email           text,
  pix_type        text,
  pix_key         text,
  default_role_id uuid         REFERENCES public.cast_roles ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_people_user_name UNIQUE (user_id, name),
  CONSTRAINT chk_people_pix_type CHECK (
    pix_type IS NULL OR pix_type IN ('cpf', 'email', 'phone', 'random')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own people"
  ON public.people FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NOVA TABELA: person_artists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.person_artists (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  person_id       uuid         NOT NULL REFERENCES public.people ON DELETE CASCADE,
  artist_id       uuid         REFERENCES public.artists ON DELETE CASCADE,
  is_general_crew boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chk_person_artists_crew_xor_artist CHECK (
    (artist_id IS NOT NULL AND is_general_crew = false)
    OR (artist_id IS NULL AND is_general_crew = true)
  ),
  CONSTRAINT uq_person_artists UNIQUE (user_id, person_id, artist_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_artists TO authenticated;
GRANT ALL ON public.person_artists TO service_role;
ALTER TABLE public.person_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own person_artists"
  ON public.person_artists FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ALTER TABLE: shows  → rider_public_token
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.shows
  ADD COLUMN rider_public_token text
    NOT NULL
    UNIQUE
    DEFAULT encode(gen_random_bytes(9), 'hex');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ALTER TABLE: cast_members → person_id
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cast_members
  ADD COLUMN person_id uuid REFERENCES public.people ON DELETE SET NULL;

-- A constraint parcial garante unicidade de (show_id, person_id) quando o
-- person_id não é nulo (membros avulsos sem person_id continuam permitidos).
CREATE UNIQUE INDEX uq_cast_members_show_person
  ON public.cast_members (show_id, person_id)
  WHERE person_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NOVA TABELA: show_requirements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.show_requirements (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  show_id          uuid         NOT NULL REFERENCES public.shows ON DELETE CASCADE,
  cast_member_id   uuid         NOT NULL REFERENCES public.cast_members ON DELETE CASCADE,
  document_type_id uuid         NOT NULL REFERENCES public.document_types ON DELETE CASCADE,
  required         boolean      NOT NULL DEFAULT true,
  deadline_date    date,
  created_at       timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_show_requirements UNIQUE (show_id, cast_member_id, document_type_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_requirements TO authenticated;
GRANT ALL ON public.show_requirements TO service_role;
ALTER TABLE public.show_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own show_requirements"
  ON public.show_requirements FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ALTER TABLE: documents → is_reimbursed, reimbursed_at
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_reimbursed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reimbursed_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. NOVA TABELA: artist_rider_template_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.artist_rider_template_items (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  artist_id     uuid         NOT NULL REFERENCES public.artists ON DELETE CASCADE,
  category      text         NOT NULL,
  item_name     text         NOT NULL,
  specification text,
  quantity      integer      NOT NULL DEFAULT 1,
  is_mandatory  boolean      NOT NULL DEFAULT true,
  position      integer      NOT NULL DEFAULT 0,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_rider_template_items TO authenticated;
GRANT ALL ON public.artist_rider_template_items TO service_role;
ALTER TABLE public.artist_rider_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own artist_rider_template_items"
  ON public.artist_rider_template_items FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOVA TABELA: show_rider_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.show_rider_items (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  show_id                  uuid         NOT NULL REFERENCES public.shows ON DELETE CASCADE,
  template_item_id         uuid         REFERENCES public.artist_rider_template_items ON DELETE SET NULL,
  category                 text         NOT NULL,
  item_name                text         NOT NULL,
  specification            text,
  quantity                 integer      NOT NULL DEFAULT 1,
  is_mandatory             boolean      NOT NULL DEFAULT true,
  position                 integer      NOT NULL DEFAULT 0,
  status                   text         NOT NULL DEFAULT 'pending',
  exception_note           text,
  confirmed_by_venue_at    timestamptz,
  physical_check           text         NOT NULL DEFAULT 'unchecked',
  physical_divergence_note text,
  created_at               timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chk_rider_item_status CHECK (
    status IN ('pending', 'confirmed', 'exception')
  ),
  CONSTRAINT chk_rider_item_physical CHECK (
    physical_check IN ('unchecked', 'conformed', 'divergent')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_rider_items TO authenticated;
GRANT ALL ON public.show_rider_items TO service_role;
ALTER TABLE public.show_rider_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own show_rider_items"
  ON public.show_rider_items FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ÍNDICES DE PERFORMANCE
-- (Referência: data-model.md § 4)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_people_user_id              ON public.people (user_id);
CREATE INDEX idx_person_artists_person       ON public.person_artists (person_id);
CREATE INDEX idx_person_artists_artist       ON public.person_artists (artist_id);
CREATE INDEX idx_person_artists_general      ON public.person_artists (user_id) WHERE is_general_crew = true;

CREATE INDEX idx_shows_artist_id             ON public.shows (artist_id);
CREATE INDEX idx_shows_rider_token           ON public.shows (rider_public_token);
CREATE INDEX idx_shows_public_token          ON public.shows (public_token);

CREATE INDEX idx_cast_members_show_person    ON public.cast_members (show_id, person_id);
CREATE INDEX idx_show_requirements_show_member ON public.show_requirements (show_id, cast_member_id);

CREATE INDEX idx_documents_reimbursement     ON public.documents (show_id) WHERE is_reimbursement = true;

CREATE INDEX idx_rider_template_artist       ON public.artist_rider_template_items (artist_id);
CREATE INDEX idx_show_rider_items_show       ON public.show_rider_items (show_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. PERMISSÕES E POLÍTICAS RLS PARA ACESSO ANÔNIMO (TOKENS PÚBLICOS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Grants necessários para que o role anon consiga avaliar as policies RLS
GRANT SELECT ON public.shows TO anon;
GRANT SELECT ON public.cast_members TO anon;
GRANT SELECT ON public.show_requirements TO anon;
GRANT SELECT ON public.document_types TO anon;
GRANT SELECT, INSERT ON public.documents TO anon;
GRANT SELECT, UPDATE ON public.show_rider_items TO anon;

-- 10a. anon pode LER shows pelo public_token (envio de docs do elenco)
CREATE POLICY "anon read shows by public_token"
  ON public.shows FOR SELECT TO anon
  USING (
    public_token = current_setting('request.headers', true)::json->>'x-public-token'
  );

-- 10b. anon pode LER shows pelo rider_public_token (confirmação de rider)
CREATE POLICY "anon read shows by rider_token"
  ON public.shows FOR SELECT TO anon
  USING (
    rider_public_token = current_setting('request.headers', true)::json->>'x-rider-token'
  );

-- 10c. anon pode LER cast_members do show vinculado ao token público
CREATE POLICY "anon read cast_members by show token"
  ON public.cast_members FOR SELECT TO anon
  USING (
    show_id IN (
      SELECT id FROM public.shows
      WHERE public_token = current_setting('request.headers', true)::json->>'x-public-token'
    )
  );

-- 10d. anon pode LER show_requirements do show vinculado ao token público
CREATE POLICY "anon read show_requirements by show token"
  ON public.show_requirements FOR SELECT TO anon
  USING (
    show_id IN (
      SELECT id FROM public.shows
      WHERE public_token = current_setting('request.headers', true)::json->>'x-public-token'
    )
  );

-- 10e. anon pode LER document_types (necessário para renderizar a checklist)
CREATE POLICY "anon read document_types"
  ON public.document_types FOR SELECT TO anon
  USING (true);

-- 10f. anon pode LER documentos do show (para exibir checklist de status)
CREATE POLICY "anon read documents by show token"
  ON public.documents FOR SELECT TO anon
  USING (
    show_id IN (
      SELECT id FROM public.shows
      WHERE public_token = current_setting('request.headers', true)::json->>'x-public-token'
    )
  );

-- 10g. anon pode INSERIR documentos em shows vinculados ao token público
CREATE POLICY "anon insert documents by show token"
  ON public.documents FOR INSERT TO anon
  WITH CHECK (
    show_id IN (
      SELECT id FROM public.shows
      WHERE public_token = current_setting('request.headers', true)::json->>'x-public-token'
    )
  );

-- 10h. anon pode LER show_rider_items pelo rider_public_token
CREATE POLICY "anon read show_rider_items by rider token"
  ON public.show_rider_items FOR SELECT TO anon
  USING (
    show_id IN (
      SELECT id FROM public.shows
      WHERE rider_public_token = current_setting('request.headers', true)::json->>'x-rider-token'
    )
  );

-- 10i. anon pode ATUALIZAR status/exception_note/confirmed_by_venue_at de rider items
--      SOMENTE para itens do show vinculado ao rider_public_token (anti-IDOR/BOLA)
CREATE POLICY "anon update show_rider_items by rider token"
  ON public.show_rider_items FOR UPDATE TO anon
  USING (
    show_id IN (
      SELECT id FROM public.shows
      WHERE rider_public_token = current_setting('request.headers', true)::json->>'x-rider-token'
    )
  )
  WITH CHECK (
    show_id IN (
      SELECT id FROM public.shows
      WHERE rider_public_token = current_setting('request.headers', true)::json->>'x-rider-token'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. BACKFILL: Criar registros em `people` a partir dos nomes existentes
--     em `cast_members`, deduplicando por (user_id, name).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.people (user_id, name)
SELECT DISTINCT cm.user_id, cm.name
FROM public.cast_members cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.people p
  WHERE p.user_id = cm.user_id AND p.name = cm.name
)
ON CONFLICT (user_id, name) DO NOTHING;

-- Vincular cast_members existentes à pessoa correspondente
UPDATE public.cast_members cm
SET person_id = p.id
FROM public.people p
WHERE p.user_id = cm.user_id
  AND p.name = cm.name
  AND cm.person_id IS NULL;
