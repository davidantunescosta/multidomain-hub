
-- Restrict pode_acessar_modulo so callers can only probe their own permissions
CREATE OR REPLACE FUNCTION public.pode_acessar_modulo(_user_id uuid, _empresa_id uuid, _modulo modulo, _acao text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_papel    public.empresa_papel;
  v_cliente  UUID;
  v_pode     BOOLEAN := NULL;
BEGIN
  -- Only allow checking your own permissions, unless you're an admin
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

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
$function$;

-- Revoke EXECUTE from anon and public so only authenticated users can call these
REVOKE EXECUTE ON FUNCTION public.pode_acessar_modulo(uuid, uuid, modulo, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.pode_acessar_modulo(uuid, uuid, modulo, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
