-- Migration: ai_rider_import_usage table & atomic increment RPC
-- Limite de taxa atômico para importações de rider técnico por IA (Função 2)
-- Data: 2026-09-11

CREATE TABLE IF NOT EXISTS public.ai_rider_import_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_rider_import_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_rider_import_usage' 
      AND policyname = 'own ai_rider_import_usage'
  ) THEN
    CREATE POLICY "own ai_rider_import_usage" ON public.ai_rider_import_usage
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.increment_rider_ai_usage(
  p_user_id uuid,
  p_max_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  INSERT INTO public.ai_rider_import_usage (user_id, usage_date, count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT count INTO v_current
  FROM public.ai_rider_import_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  IF v_current >= p_max_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit_exceeded', 'current_count', v_current);
  END IF;

  UPDATE public.ai_rider_import_usage
  SET count = count + 1
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object('allowed', true, 'reason', 'ok', 'current_count', v_current + 1);
END;
$$;
