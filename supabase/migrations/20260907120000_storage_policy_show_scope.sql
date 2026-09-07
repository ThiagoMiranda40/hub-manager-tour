-- ============================================================================
-- Correção de Segurança (OWASP A01:2025 — Broken Access Control)
-- Escopo de Upload no Supabase Storage restrito a Show Existente
-- ============================================================================
-- Substitui a policy permissiva que permitia upload anônimo em qualquer
-- caminho do bucket "documentos" por uma policy que exige que o primeiro
-- segmento do caminho corresponda a um show_id existente em public.shows.
-- ============================================================================

DROP POLICY IF EXISTS "anyone can upload documentos" ON storage.objects;

CREATE POLICY "upload scoped to valid show" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT id FROM public.shows)
  );
