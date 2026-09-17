-- Migration: Atualiza constraint chk_rider_item_status para permitir 'accepted_with_exception' (RF-14 / T-17)
-- Corrige o erro ao aceitar com ressalva no painel do produtor

ALTER TABLE public.show_rider_items 
  DROP CONSTRAINT IF EXISTS chk_rider_item_status;

ALTER TABLE public.show_rider_items 
  ADD CONSTRAINT chk_rider_item_status CHECK (
    status IN ('pending', 'confirmed', 'exception', 'accepted_with_exception')
  );
