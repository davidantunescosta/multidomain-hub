ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS modulos_liberados TEXT[] NOT NULL DEFAULT ARRAY['pipeline','agenda'];

UPDATE public.clientes SET modulos_liberados = ARRAY['pipeline','agenda']
  WHERE plano = 'basico';
UPDATE public.clientes SET modulos_liberados = ARRAY['pipeline','agenda','reunioes','tarefas','contratos']
  WHERE plano = 'profissional';
UPDATE public.clientes SET modulos_liberados = ARRAY['pipeline','agenda','reunioes','tarefas','contratos','financeiro','equipe']
  WHERE plano = 'enterprise';