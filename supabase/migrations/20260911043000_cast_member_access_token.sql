-- T-16: Adiciona token individual por integrante para a página pública de envio (/p/$token)
-- O DEFAULT volátil encode(gen_random_bytes(9), 'hex') é avaliado individualmente
-- para cada linha existente no momento da adição da coluna, gerando tokens únicos 
-- automaticamente para todas as linhas já cadastradas sem necessidade de script separado de backfill.
ALTER TABLE public.cast_members 
  ADD COLUMN access_token text UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex');

CREATE INDEX idx_cast_members_access_token ON public.cast_members (access_token);
