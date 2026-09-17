-- T-12: Adiciona contador de análises por IA para controle de taxa (rate limiting anti-abuso) na rota pública (/p/$token)
-- Cada integrante escalado possui um teto de 15 chamadas por show.
ALTER TABLE public.cast_members 
  ADD COLUMN IF NOT EXISTS ai_analysis_count integer NOT NULL DEFAULT 0;

-- Função atômica com bloqueio FOR UPDATE para incremento seguro de ai_analysis_count
CREATE OR REPLACE FUNCTION public.increment_cast_member_ai_count(
  p_member_id uuid,
  p_max_limit integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  SELECT ai_analysis_count INTO v_current
  FROM public.cast_members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'member_not_found', 'current_count', 0);
  END IF;

  IF v_current >= p_max_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit_exceeded', 'current_count', v_current);
  END IF;

  UPDATE public.cast_members
  SET ai_analysis_count = ai_analysis_count + 1
  WHERE id = p_member_id;

  RETURN jsonb_build_object('allowed', true, 'reason', 'ok', 'current_count', v_current + 1);
END;
$$;
