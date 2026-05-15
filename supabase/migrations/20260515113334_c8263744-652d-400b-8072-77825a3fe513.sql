DO $$
DECLARE
  uid_basico       UUID := gen_random_uuid();
  uid_profissional UUID := gen_random_uuid();
  uid_enterprise   UUID := gen_random_uuid();

  cliente_basico       UUID;
  cliente_profissional UUID;
  cliente_enterprise   UUID;
  emp_basico           UUID;
  emp_prof_1           UUID;
  emp_prof_2           UUID;
  emp_ent_1            UUID;
  emp_ent_2            UUID;
  emp_ent_3            UUID;
BEGIN

  -- ============ USUÁRIO 1 — Básico ============
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid_basico, 'authenticated', 'authenticated',
    'basico@teste.nexus',
    crypt('Teste@2026', gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('full_name','Cliente Básico'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid_basico, uid_basico::text,
    jsonb_build_object('sub', uid_basico::text, 'email', 'basico@teste.nexus', 'email_verified', true),
    'email', now(), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (uid_basico, 'user');

  -- ============ USUÁRIO 2 — Profissional ============
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid_profissional, 'authenticated', 'authenticated',
    'profissional@teste.nexus',
    crypt('Teste@2026', gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('full_name','Cliente Profissional'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid_profissional, uid_profissional::text,
    jsonb_build_object('sub', uid_profissional::text, 'email', 'profissional@teste.nexus', 'email_verified', true),
    'email', now(), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (uid_profissional, 'user');

  -- ============ USUÁRIO 3 — Enterprise ============
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid_enterprise, 'authenticated', 'authenticated',
    'enterprise@teste.nexus',
    crypt('Teste@2026', gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('full_name','Cliente Enterprise'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid_enterprise, uid_enterprise::text,
    jsonb_build_object('sub', uid_enterprise::text, 'email', 'enterprise@teste.nexus', 'email_verified', true),
    'email', now(), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (uid_enterprise, 'user');

  -- ============ CLIENTE 1 — Básico ============
  INSERT INTO public.clientes (nome, email_dono, plano, max_empresas, max_usuarios, modulos_liberados, status)
  VALUES ('Barbearia do João', 'basico@teste.nexus', 'basico', 1, 3, ARRAY['pipeline','agenda'], 'ativo')
  RETURNING id INTO cliente_basico;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_basico, 'Barbearia do João', 'Barbearia e estética masculina', 'Beleza', '#ec4899', 'ativa', cliente_basico)
  RETURNING id INTO emp_basico;

  INSERT INTO public.membros (empresa_id, user_id, cliente_id, nome, email, papel, ativo)
  VALUES (emp_basico, uid_basico, cliente_basico, 'João Silva', 'basico@teste.nexus', 'dono', true);

  INSERT INTO public.permissoes (cliente_id, empresa_id, papel, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
  VALUES
    (cliente_basico, NULL, 'gerente', 'pipeline', true,  true,  true,  false),
    (cliente_basico, NULL, 'gerente', 'agenda',   true,  true,  true,  false),
    (cliente_basico, NULL, 'membro',  'pipeline', true,  true,  false, false),
    (cliente_basico, NULL, 'membro',  'agenda',   true,  true,  false, false),
    (cliente_basico, NULL, 'atendente','pipeline', true,  false, false, false),
    (cliente_basico, NULL, 'atendente','agenda',   true,  true,  true,  false),
    (cliente_basico, NULL, 'visualizador','pipeline', true, false, false, false),
    (cliente_basico, NULL, 'visualizador','agenda',   true, false, false, false);

  INSERT INTO public.pipeline (empresa_id, user_id, nome_lead, empresa_lead, contato_email, contato_telefone, estagio, valor_estimado, probabilidade, origem, observacoes)
  VALUES
    (emp_basico, uid_basico, 'Carlos Rodrigues', 'Particular', 'carlos@email.com', '(11) 98765-4321', 'lead', 150, 60, 'indicacao', 'Interessado em plano mensal'),
    (emp_basico, uid_basico, 'Marcos Pereira', 'Particular', 'marcos@email.com', '(11) 91234-5678', 'qualificado', 300, 80, 'indicacao', 'Quer pacote família'),
    (emp_basico, uid_basico, 'Rafael Costa', 'Particular', 'rafael@email.com', '(11) 99876-5432', 'ganho', 150, 100, 'prospeccao', 'Fechou plano mensal');

  INSERT INTO public.agenda (empresa_id, user_id, titulo, tipo, data_inicio, data_fim, descricao)
  VALUES
    (emp_basico, uid_basico, 'Carlos — Corte + Barba', 'reuniao', now() + interval '2 hours', now() + interval '3 hours', 'Atendimento agendado'),
    (emp_basico, uid_basico, 'Marcos — Pacote família', 'reuniao', now() + interval '1 day', now() + interval '1 day 2 hours', 'Avaliação do pacote'),
    (emp_basico, uid_basico, 'Pagamento aluguel', 'pagamento', now() + interval '5 days', null, 'Vencimento dia 20');

  -- ============ CLIENTE 2 — Profissional ============
  INSERT INTO public.clientes (nome, email_dono, plano, max_empresas, max_usuarios, modulos_liberados, status)
  VALUES ('Rede Fit Academia', 'profissional@teste.nexus', 'profissional', 3, 8,
    ARRAY['pipeline','agenda','reunioes','tarefas','contratos'], 'ativo')
  RETURNING id INTO cliente_profissional;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_profissional, 'Fit Academia — Unidade Centro', 'Academia zona central', 'Fitness', '#f97316', 'ativa', cliente_profissional)
  RETURNING id INTO emp_prof_1;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_profissional, 'Fit Academia — Unidade Sul', 'Academia zona sul', 'Fitness', '#f97316', 'ativa', cliente_profissional)
  RETURNING id INTO emp_prof_2;

  INSERT INTO public.membros (empresa_id, user_id, cliente_id, nome, email, papel, ativo)
  VALUES
    (emp_prof_1, uid_profissional, cliente_profissional, 'Ana Fitness', 'profissional@teste.nexus', 'dono', true),
    (emp_prof_2, uid_profissional, cliente_profissional, 'Ana Fitness', 'profissional@teste.nexus', 'dono', true);

  INSERT INTO public.permissoes (cliente_id, empresa_id, papel, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
  VALUES
    (cliente_profissional, NULL, 'gerente',  'pipeline',  true,  true,  true,  false),
    (cliente_profissional, NULL, 'gerente',  'agenda',    true,  true,  true,  false),
    (cliente_profissional, NULL, 'gerente',  'reunioes',  true,  true,  true,  false),
    (cliente_profissional, NULL, 'gerente',  'tarefas',   true,  true,  true,  false),
    (cliente_profissional, NULL, 'gerente',  'contratos', true,  false, false, false),
    (cliente_profissional, NULL, 'membro',   'pipeline',  true,  true,  true,  false),
    (cliente_profissional, NULL, 'membro',   'agenda',    true,  true,  true,  false),
    (cliente_profissional, NULL, 'membro',   'reunioes',  true,  true,  false, false),
    (cliente_profissional, NULL, 'membro',   'tarefas',   true,  true,  true,  false),
    (cliente_profissional, NULL, 'membro',   'contratos', false, false, false, false),
    (cliente_profissional, NULL, 'atendente','pipeline',  true,  true,  false, false),
    (cliente_profissional, NULL, 'atendente','agenda',    true,  true,  true,  false),
    (cliente_profissional, NULL, 'atendente','reunioes',  false, false, false, false),
    (cliente_profissional, NULL, 'atendente','tarefas',   false, false, false, false),
    (cliente_profissional, NULL, 'atendente','contratos', false, false, false, false),
    (cliente_profissional, NULL, 'visualizador','pipeline',  true, false, false, false),
    (cliente_profissional, NULL, 'visualizador','agenda',    true, false, false, false),
    (cliente_profissional, NULL, 'visualizador','reunioes',  true, false, false, false),
    (cliente_profissional, NULL, 'visualizador','tarefas',   true, false, false, false),
    (cliente_profissional, NULL, 'visualizador','contratos', true, false, false, false);

  INSERT INTO public.pipeline (empresa_id, user_id, nome_lead, empresa_lead, contato_email, estagio, valor_estimado, probabilidade, origem)
  VALUES
    (emp_prof_1, uid_profissional, 'Bruno Mendes', 'Particular', 'bruno@email.com', 'negociacao', 1200, 70, 'anuncio'),
    (emp_prof_1, uid_profissional, 'Carla Souza', 'Empresa XYZ', 'carla@xyz.com', 'proposta', 4800, 55, 'linkedin'),
    (emp_prof_1, uid_profissional, 'Diego Lima', 'Particular', 'diego@email.com', 'ganho', 800, 100, 'indicacao'),
    (emp_prof_2, uid_profissional, 'Fernanda Castro', 'Particular', 'fern@email.com', 'lead', 1200, 30, 'anuncio'),
    (emp_prof_2, uid_profissional, 'Gustavo Rocha', 'Corporativo Sul', 'gustavo@corp.com', 'qualificado', 6000, 45, 'evento');

  INSERT INTO public.contratos (empresa_id, nome_cliente, descricao, valor_total, valor_recorrente, periodicidade, data_inicio, data_fim, status)
  VALUES
    (emp_prof_1, 'Empresa XYZ — Plano Corporativo', 'Acesso ilimitado 20 colaboradores', 4800, 400, 'mensal', now() - interval '2 months', now() + interval '10 months', 'ativo'),
    (emp_prof_1, 'Diego Lima — Plano Anual', 'Plano anual individual', 800, 0, 'avulso', now() - interval '1 month', now() + interval '11 months', 'ativo');

  INSERT INTO public.tarefas (empresa_id, user_id, titulo, prioridade, status, data_limite)
  VALUES
    (emp_prof_1, uid_profissional, 'Enviar proposta para Carla Souza', 'critica', 'aberta', now() + interval '1 day'),
    (emp_prof_1, uid_profissional, 'Renovar contrato Empresa XYZ', 'alta', 'em_andamento', now() + interval '7 days'),
    (emp_prof_2, uid_profissional, 'Qualificar lead Gustavo Rocha', 'media', 'aberta', now() + interval '3 days');

  INSERT INTO public.reunioes (empresa_id, user_id, titulo, tipo, data_hora, duracao_min, local_ou_link, participantes, pauta, status)
  VALUES
    (emp_prof_1, uid_profissional, 'Apresentação plano corporativo XYZ', 'cliente', now() + interval '2 days', 60, 'https://meet.google.com/fit', ARRAY['Ana','Carla'], 'Fechar contrato corporativo', 'agendada'),
    (emp_prof_2, uid_profissional, 'Planejamento unidade Sul', 'interna', now() + interval '4 days', 90, 'Unidade Sul', ARRAY['Ana'], 'Metas do trimestre', 'agendada');

  -- ============ CLIENTE 3 — Enterprise ============
  INSERT INTO public.clientes (nome, email_dono, plano, max_empresas, max_usuarios, modulos_liberados, status)
  VALUES ('Grupo Inovação Tech', 'enterprise@teste.nexus', 'enterprise', 999, 999,
    ARRAY['pipeline','agenda','reunioes','tarefas','contratos','financeiro','equipe'], 'ativo')
  RETURNING id INTO cliente_enterprise;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_enterprise, 'Inovação Tech — Desenvolvimento', 'Squad de desenvolvimento de software', 'Tecnologia', '#8b5cf6', 'ativa', cliente_enterprise)
  RETURNING id INTO emp_ent_1;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_enterprise, 'Inovação Tech — Consultoria', 'Braço de consultoria estratégica', 'Consultoria', '#8b5cf6', 'ativa', cliente_enterprise)
  RETURNING id INTO emp_ent_2;

  INSERT INTO public.empresas (user_id, nome, descricao, segmento, cor_identidade, status, cliente_id)
  VALUES (uid_enterprise, 'Inovação Tech — Marketing', 'Agência interna de marketing', 'Marketing', '#8b5cf6', 'ativa', cliente_enterprise)
  RETURNING id INTO emp_ent_3;

  INSERT INTO public.membros (empresa_id, user_id, cliente_id, nome, email, papel, ativo)
  VALUES
    (emp_ent_1, uid_enterprise, cliente_enterprise, 'Roberto Inovação', 'enterprise@teste.nexus', 'dono', true),
    (emp_ent_2, uid_enterprise, cliente_enterprise, 'Roberto Inovação', 'enterprise@teste.nexus', 'dono', true),
    (emp_ent_3, uid_enterprise, cliente_enterprise, 'Roberto Inovação', 'enterprise@teste.nexus', 'dono', true);

  INSERT INTO public.permissoes (cliente_id, empresa_id, papel, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
  VALUES
    (cliente_enterprise, NULL, 'gerente', 'pipeline',   true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'agenda',     true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'reunioes',   true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'tarefas',    true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'contratos',  true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'financeiro', true, true,  true,  false),
    (cliente_enterprise, NULL, 'gerente', 'equipe',     true, false, false, false),
    (cliente_enterprise, NULL, 'membro',  'pipeline',   true, true,  true,  false),
    (cliente_enterprise, NULL, 'membro',  'agenda',     true, true,  true,  false),
    (cliente_enterprise, NULL, 'membro',  'reunioes',   true, true,  true,  false),
    (cliente_enterprise, NULL, 'membro',  'tarefas',    true, true,  true,  false),
    (cliente_enterprise, NULL, 'membro',  'contratos',  true, false, false, false),
    (cliente_enterprise, NULL, 'membro',  'financeiro', false,false, false, false),
    (cliente_enterprise, NULL, 'membro',  'equipe',     true, false, false, false),
    (cliente_enterprise, NULL, 'atendente','pipeline',  true, true,  false, false),
    (cliente_enterprise, NULL, 'atendente','agenda',    true, true,  true,  false),
    (cliente_enterprise, NULL, 'atendente','reunioes',  false,false, false, false),
    (cliente_enterprise, NULL, 'atendente','tarefas',   false,false, false, false),
    (cliente_enterprise, NULL, 'atendente','contratos', false,false, false, false),
    (cliente_enterprise, NULL, 'atendente','financeiro',false,false, false, false),
    (cliente_enterprise, NULL, 'atendente','equipe',    false,false, false, false),
    (cliente_enterprise, NULL, 'visualizador','pipeline',   true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','agenda',     true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','reunioes',   true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','tarefas',    true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','contratos',  true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','financeiro', true, false, false, false),
    (cliente_enterprise, NULL, 'visualizador','equipe',     true, false, false, false);

  INSERT INTO public.pipeline (empresa_id, user_id, nome_lead, empresa_lead, contato_email, estagio, valor_estimado, probabilidade, origem)
  VALUES
    (emp_ent_1, uid_enterprise, 'StartupAlpha', 'StartupAlpha Ltda', 'cto@alpha.com', 'negociacao', 80000, 75, 'linkedin'),
    (emp_ent_1, uid_enterprise, 'BetaCorp', 'BetaCorp S/A', 'ti@betacorp.com', 'proposta', 45000, 60, 'indicacao'),
    (emp_ent_1, uid_enterprise, 'GamaTech', 'GamaTech ME', 'contato@gama.com', 'ganho', 30000, 100, 'evento'),
    (emp_ent_2, uid_enterprise, 'Industrias Alfa', 'Alfa Ind. Ltda', 'diretoria@alfa.com', 'qualificado', 120000, 40, 'prospeccao'),
    (emp_ent_2, uid_enterprise, 'Varejo Global', 'Varejo Global SA', 'comercial@vg.com', 'negociacao', 65000, 70, 'linkedin'),
    (emp_ent_3, uid_enterprise, 'Marca Premium', 'Marca Premium Ltda', 'mkt@premium.com', 'proposta', 25000, 55, 'indicacao');

  INSERT INTO public.contratos (empresa_id, nome_cliente, descricao, valor_total, valor_recorrente, periodicidade, data_inicio, data_fim, status)
  VALUES
    (emp_ent_1, 'GamaTech — Sistema Completo', 'Desenvolvimento sistema de gestão', 30000, 2500, 'mensal', now() - interval '3 months', now() + interval '9 months', 'ativo'),
    (emp_ent_2, 'StartupAlpha — Consultoria', 'Reestruturação estratégica', 80000, 8000, 'mensal', now() - interval '1 month', now() + interval '11 months', 'ativo'),
    (emp_ent_3, 'Marca Premium — Branding', 'Gestão de marca e campanhas', 25000, 2500, 'mensal', now() - interval '2 months', now() + interval '10 months', 'ativo');

  INSERT INTO public.financeiro (empresa_id, tipo, categoria, descricao, valor, data_vencimento, data_pagamento, status_pagamento)
  VALUES
    (emp_ent_1, 'receita', 'mensalidade', 'Mensalidade GamaTech — Maio', 2500, now() + interval '3 days', null, 'pendente'),
    (emp_ent_1, 'receita', 'mensalidade', 'Mensalidade GamaTech — Abril', 2500, now() - interval '27 days', now() - interval '26 days', 'pago'),
    (emp_ent_1, 'despesa', 'infraestrutura', 'Servidores AWS', 1200, now() + interval '8 days', null, 'pendente'),
    (emp_ent_2, 'receita', 'consultoria', 'Retainer StartupAlpha — Maio', 8000, now() + interval '2 days', null, 'pendente'),
    (emp_ent_2, 'receita', 'consultoria', 'Retainer StartupAlpha — Abril', 8000, now() - interval '28 days', now() - interval '27 days', 'pago'),
    (emp_ent_2, 'despesa', 'pessoal', 'Pró-labore sócios', 6000, now() + interval '15 days', null, 'pendente'),
    (emp_ent_3, 'receita', 'mensalidade', 'Mensalidade Marca Premium — Maio', 2500, now() + interval '5 days', null, 'pendente'),
    (emp_ent_3, 'despesa', 'ferramentas', 'Adobe Creative Cloud', 350, now() - interval '5 days', null, 'atrasado');

  INSERT INTO public.tarefas (empresa_id, user_id, titulo, prioridade, status, data_limite)
  VALUES
    (emp_ent_1, uid_enterprise, 'Fechar proposta BetaCorp', 'critica', 'aberta', now() + interval '2 days'),
    (emp_ent_1, uid_enterprise, 'Code review sprint 3', 'alta', 'em_andamento', now() + interval '1 day'),
    (emp_ent_2, uid_enterprise, 'Apresentar diagnóstico Industrias Alfa', 'alta', 'aberta', now() + interval '3 days'),
    (emp_ent_2, uid_enterprise, 'Renovar proposta Varejo Global', 'media', 'em_andamento', now() + interval '5 days'),
    (emp_ent_3, uid_enterprise, 'Entregar peças campanha Marca Premium', 'critica', 'bloqueada', now() + interval '1 day');

  INSERT INTO public.reunioes (empresa_id, user_id, titulo, tipo, data_hora, duracao_min, local_ou_link, participantes, pauta, status)
  VALUES
    (emp_ent_1, uid_enterprise, 'Kickoff BetaCorp', 'cliente', now() + interval '1 day', 90, 'https://meet.google.com/ent1', ARRAY['Roberto','CTO BetaCorp'], 'Escopo e timeline', 'agendada'),
    (emp_ent_2, uid_enterprise, 'Diagnóstico Industrias Alfa', 'cliente', now() + interval '3 days', 120, 'Presencial — Av. Paulista', ARRAY['Roberto','Diretoria Alfa'], 'Apresentação diagnóstico', 'agendada'),
    (emp_ent_1, uid_enterprise, 'Retrospectiva sprint 2', 'interna', now() - interval '2 days', 60, 'https://meet.google.com/ent2', ARRAY['Roberto','Dev Team'], 'O que funcionou', 'realizada');

END $$;