-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- EMPRESAS
CREATE TABLE public.empresas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  segmento       TEXT,
  cor_identidade TEXT NOT NULL DEFAULT '#6366f1',
  logo_url       TEXT,
  status         TEXT NOT NULL DEFAULT 'ativa'
                 CHECK (status IN ('ativa','pausada','encerrada')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- MEMBROS
CREATE TABLE public.membros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  nome        TEXT NOT NULL,
  email       TEXT,
  papel       TEXT NOT NULL DEFAULT 'membro'
              CHECK (papel IN ('dono','socio','gerente','membro','externo')),
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE
CREATE TABLE public.pipeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  nome_lead       TEXT NOT NULL,
  empresa_lead    TEXT,
  contato_email   TEXT,
  contato_telefone TEXT,
  origem          TEXT CHECK (origem IN ('indicacao','linkedin','anuncio','evento','prospeccao','outro')),
  estagio         TEXT NOT NULL DEFAULT 'lead'
                  CHECK (estagio IN ('lead','qualificado','proposta','negociacao','ganho','perdido')),
  valor_estimado  NUMERIC(12,2),
  probabilidade   INTEGER CHECK (probabilidade BETWEEN 0 AND 100),
  responsavel_id  UUID REFERENCES public.membros(id),
  data_fechamento TIMESTAMPTZ,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- CONTRATOS
CREATE TABLE public.contratos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  pipeline_id      UUID REFERENCES public.pipeline(id),
  nome_cliente     TEXT NOT NULL,
  descricao        TEXT,
  valor_total      NUMERIC(12,2),
  valor_recorrente NUMERIC(12,2),
  periodicidade    TEXT CHECK (periodicidade IN ('mensal','trimestral','semestral','anual','avulso')),
  data_inicio      TIMESTAMPTZ,
  data_fim         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'em_negociacao'
                   CHECK (status IN ('em_negociacao','ativo','pausado','encerrado','cancelado')),
  arquivo_url      TEXT,
  responsavel_id   UUID REFERENCES public.membros(id),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- REUNIOES
CREATE TABLE public.reunioes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  titulo          TEXT NOT NULL,
  tipo            TEXT DEFAULT 'interna'
                  CHECK (tipo IN ('interna','cliente','parceiro','investidor','outro')),
  data_hora       TIMESTAMPTZ NOT NULL,
  duracao_min     INTEGER DEFAULT 60,
  local_ou_link   TEXT,
  participantes   TEXT[],
  pauta           TEXT,
  resumo          TEXT,
  decisoes        TEXT,
  proximos_passos TEXT,
  status          TEXT NOT NULL DEFAULT 'agendada'
                  CHECK (status IN ('agendada','realizada','cancelada','remarcada')),
  pipeline_id     UUID REFERENCES public.pipeline(id),
  contrato_id     UUID REFERENCES public.contratos(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- TAREFAS
CREATE TABLE public.tarefas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  titulo         TEXT NOT NULL,
  descricao      TEXT,
  responsavel_id UUID REFERENCES public.membros(id),
  prioridade     TEXT NOT NULL DEFAULT 'media'
                 CHECK (prioridade IN ('critica','alta','media','baixa')),
  status         TEXT NOT NULL DEFAULT 'aberta'
                 CHECK (status IN ('aberta','em_andamento','bloqueada','concluida','cancelada')),
  data_limite    TIMESTAMPTZ,
  concluida_em   TIMESTAMPTZ,
  pipeline_id    UUID REFERENCES public.pipeline(id),
  reuniao_id     UUID REFERENCES public.reunioes(id),
  contrato_id    UUID REFERENCES public.contratos(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- AGENDA
CREATE TABLE public.agenda (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  titulo       TEXT NOT NULL,
  tipo         TEXT DEFAULT 'compromisso'
               CHECK (tipo IN ('reuniao','ligacao','entrega','pagamento','vencimento','lembrete','outro','compromisso')),
  data_inicio  TIMESTAMPTZ NOT NULL,
  data_fim     TIMESTAMPTZ,
  dia_todo     BOOLEAN DEFAULT FALSE,
  recorrente   BOOLEAN DEFAULT FALSE,
  descricao    TEXT,
  cor          TEXT,
  reuniao_id   UUID REFERENCES public.reunioes(id),
  tarefa_id    UUID REFERENCES public.tarefas(id),
  contrato_id  UUID REFERENCES public.contratos(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- FINANCEIRO
CREATE TABLE public.financeiro (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id      UUID REFERENCES public.contratos(id),
  tipo             TEXT NOT NULL CHECK (tipo IN ('receita','despesa','investimento')),
  categoria        TEXT,
  descricao        TEXT NOT NULL,
  valor            NUMERIC(12,2) NOT NULL,
  data_vencimento  TIMESTAMPTZ,
  data_pagamento   TIMESTAMPTZ,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status_pagamento IN ('pendente','pago','atrasado','cancelado')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  mensagem   TEXT,
  lida       BOOLEAN DEFAULT FALSE,
  link_rota  TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TRIGGERS
DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'empresas','membros','pipeline','contratos',
  'reunioes','tarefas','agenda','financeiro','notificacoes'
] LOOP
  EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();', t);
END LOOP; END; $$;

-- RLS
ALTER TABLE public.empresas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns" ON public.empresas     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_owns" ON public.pipeline     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_owns" ON public.reunioes     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_owns" ON public.tarefas      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_owns" ON public.agenda       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_owns" ON public.notificacoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_owns" ON public.financeiro   FOR ALL USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "user_owns" ON public.contratos    FOR ALL USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "user_owns" ON public.membros      FOR ALL USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER TABLE public.tarefas REPLICA IDENTITY FULL;
ALTER TABLE public.pipeline REPLICA IDENTITY FULL;