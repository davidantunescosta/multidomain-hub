TRUNCATE TABLE
  public.notificacoes,
  public.financeiro,
  public.agenda,
  public.tarefas,
  public.reunioes,
  public.contratos,
  public.pipeline,
  public.membros,
  public.empresas
RESTART IDENTITY CASCADE;

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_empresa_id_fkey;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.financeiro DROP CONSTRAINT IF EXISTS financeiro_empresa_id_fkey;
ALTER TABLE public.financeiro ADD CONSTRAINT financeiro_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.agenda DROP CONSTRAINT IF EXISTS agenda_empresa_id_fkey;
ALTER TABLE public.agenda ADD CONSTRAINT agenda_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_empresa_id_fkey;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.reunioes DROP CONSTRAINT IF EXISTS reunioes_empresa_id_fkey;
ALTER TABLE public.reunioes ADD CONSTRAINT reunioes_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_empresa_id_fkey;
ALTER TABLE public.contratos ADD CONSTRAINT contratos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline DROP CONSTRAINT IF EXISTS pipeline_empresa_id_fkey;
ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_empresa_id_fkey;
ALTER TABLE public.membros ADD CONSTRAINT membros_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.permissoes DROP CONSTRAINT IF EXISTS permissoes_empresa_id_fkey;
ALTER TABLE public.permissoes ADD CONSTRAINT permissoes_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.seed_permissoes_padrao(p_cliente_id UUID, p_modulos TEXT[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.permissoes
  WHERE cliente_id = p_cliente_id AND empresa_id IS NULL;

  IF 'pipeline' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'pipeline', true, true, true, false, now(), now());
  END IF;
  IF 'agenda' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'agenda', true, true, true, true, now(), now());
  END IF;
  IF 'reunioes' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'reunioes', true, true, true, false, now(), now());
  END IF;
  IF 'tarefas' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'tarefas', true, true, true, false, now(), now());
  END IF;
  IF 'contratos' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'contratos', true, true, false, false, now(), now());
  END IF;
  IF 'financeiro' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'financeiro', false, false, false, false, now(), now());
  END IF;
  IF 'equipe' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'gerente', 'equipe', true, false, false, false, now(), now());
  END IF;

  IF 'pipeline' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'pipeline', true, true, true, false, now(), now());
  END IF;
  IF 'agenda' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'agenda', true, true, true, false, now(), now());
  END IF;
  IF 'reunioes' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'reunioes', true, true, false, false, now(), now());
  END IF;
  IF 'tarefas' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'tarefas', true, true, true, false, now(), now());
  END IF;
  IF 'contratos' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'contratos', false, false, false, false, now(), now());
  END IF;
  IF 'financeiro' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'financeiro', false, false, false, false, now(), now());
  END IF;
  IF 'equipe' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'membro', 'equipe', true, false, false, false, now(), now());
  END IF;

  IF 'pipeline' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'pipeline', true, true, false, false, now(), now());
  END IF;
  IF 'agenda' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'agenda', true, true, true, false, now(), now());
  END IF;
  IF 'reunioes' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'reunioes', false, false, false, false, now(), now());
  END IF;
  IF 'tarefas' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'tarefas', true, false, false, false, now(), now());
  END IF;
  IF 'contratos' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'contratos', false, false, false, false, now(), now());
  END IF;
  IF 'financeiro' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'financeiro', false, false, false, false, now(), now());
  END IF;
  IF 'equipe' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'atendente', 'equipe', false, false, false, false, now(), now());
  END IF;

  IF 'pipeline' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'pipeline', true, false, false, false, now(), now());
  END IF;
  IF 'agenda' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'agenda', true, false, false, false, now(), now());
  END IF;
  IF 'reunioes' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'reunioes', true, false, false, false, now(), now());
  END IF;
  IF 'tarefas' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'tarefas', true, false, false, false, now(), now());
  END IF;
  IF 'contratos' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'contratos', true, false, false, false, now(), now());
  END IF;
  IF 'financeiro' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'financeiro', true, false, false, false, now(), now());
  END IF;
  IF 'equipe' = ANY(p_modulos) THEN
    INSERT INTO public.permissoes VALUES (gen_random_uuid(), p_cliente_id, NULL, 'visualizador', 'equipe', true, false, false, false, now(), now());
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_permissoes_padrao(UUID, TEXT[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.seed_permissoes_padrao(UUID, TEXT[]) TO authenticated;

DO $$
DECLARE
  cid UUID;
BEGIN
  SELECT id INTO cid FROM public.clientes WHERE email_dono = 'basico@teste.nexus' LIMIT 1;
  IF cid IS NOT NULL THEN
    PERFORM public.seed_permissoes_padrao(cid, ARRAY['pipeline','agenda']);
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE email_dono = 'profissional@teste.nexus' LIMIT 1;
  IF cid IS NOT NULL THEN
    PERFORM public.seed_permissoes_padrao(cid, ARRAY['pipeline','agenda','reunioes','tarefas','contratos']);
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE email_dono = 'enterprise@teste.nexus' LIMIT 1;
  IF cid IS NOT NULL THEN
    PERFORM public.seed_permissoes_padrao(cid, ARRAY['pipeline','agenda','reunioes','tarefas','contratos','financeiro','equipe']);
  END IF;
END $$;