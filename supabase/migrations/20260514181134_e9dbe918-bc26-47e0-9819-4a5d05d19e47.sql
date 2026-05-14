-- Enums
DO $$ BEGIN
  CREATE TYPE public.empresa_papel AS ENUM (
    'dono','gerente','membro','atendente','visualizador'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.modulo AS ENUM (
    'pipeline','contratos','reunioes','tarefas','agenda','financeiro','equipe'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Clientes (contratos)
CREATE TABLE IF NOT EXISTS public.clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  email_dono    TEXT NOT NULL,
  plano         TEXT NOT NULL DEFAULT 'basico'
                CHECK (plano IN ('basico','profissional','enterprise')),
  max_empresas  INTEGER NOT NULL DEFAULT 3,
  max_usuarios  INTEGER NOT NULL DEFAULT 5,
  status        TEXT NOT NULL DEFAULT 'ativo'
                CHECK (status IN ('ativo','suspenso','encerrado')),
  observacoes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE;

-- Alterar a coluna papel para usar o enum (manter compatibilidade)
-- Mantemos como text por enquanto para não quebrar dados existentes

CREATE TABLE IF NOT EXISTS public.permissoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empresa_id   UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  papel        public.empresa_papel NOT NULL,
  modulo       public.modulo NOT NULL,
  pode_ver     BOOLEAN NOT NULL DEFAULT true,
  pode_criar   BOOLEAN NOT NULL DEFAULT false,
  pode_editar  BOOLEAN NOT NULL DEFAULT false,
  pode_excluir BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_permissoes_full
  ON public.permissoes (cliente_id, COALESCE(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), papel, modulo);

ALTER TABLE public.clientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_clientes" ON public.clientes;
CREATE POLICY "admins_clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins_permissoes" ON public.permissoes;
CREATE POLICY "admins_permissoes" ON public.permissoes
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.membros m
      WHERE m.cliente_id = permissoes.cliente_id
        AND m.user_id = auth.uid()
        AND m.papel = 'dono'
        AND m.ativo = true
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.membros m
      WHERE m.cliente_id = permissoes.cliente_id
        AND m.user_id = auth.uid()
        AND m.papel = 'dono'
        AND m.ativo = true
    )
  );

CREATE OR REPLACE FUNCTION public.pode_acessar_modulo(
  _user_id UUID,
  _empresa_id UUID,
  _modulo public.modulo,
  _acao TEXT
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_papel    public.empresa_papel;
  v_cliente  UUID;
  v_pode     BOOLEAN := NULL;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;

  SELECT m.papel::public.empresa_papel, m.cliente_id INTO v_papel, v_cliente
  FROM public.membros m
  WHERE m.user_id = _user_id AND m.empresa_id = _empresa_id AND m.ativo = true
  LIMIT 1;

  IF v_papel IS NULL THEN RETURN false; END IF;
  IF v_papel = 'dono' THEN RETURN true; END IF;
  IF v_cliente IS NULL THEN RETURN false; END IF;

  SELECT CASE _acao
    WHEN 'ver'     THEN pode_ver
    WHEN 'criar'   THEN pode_criar
    WHEN 'editar'  THEN pode_editar
    WHEN 'excluir' THEN pode_excluir
  END INTO v_pode
  FROM public.permissoes
  WHERE cliente_id = v_cliente
    AND empresa_id = _empresa_id
    AND papel = v_papel
    AND modulo = _modulo
  LIMIT 1;

  IF v_pode IS NULL THEN
    SELECT CASE _acao
      WHEN 'ver'     THEN pode_ver
      WHEN 'criar'   THEN pode_criar
      WHEN 'editar'  THEN pode_editar
      WHEN 'excluir' THEN pode_excluir
    END INTO v_pode
    FROM public.permissoes
    WHERE cliente_id = v_cliente
      AND empresa_id IS NULL
      AND papel = v_papel
      AND modulo = _modulo
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_pode, false);
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_clientes ON public.clientes;
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_permissoes ON public.permissoes;
CREATE TRIGGER set_updated_at_permissoes
  BEFORE UPDATE ON public.permissoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();