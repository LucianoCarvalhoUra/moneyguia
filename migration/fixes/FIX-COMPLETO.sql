-- =====================================================================
-- FIX COMPLETO — Execute este arquivo ÚNICO no SQL Editor do novo Supabase
-- Substitui os migrations com erros:
--   20260126172000_add_rls_to_system_settings.sql
--   20260325160000_security_lockdown.sql
--   20260326000000_admin_subscription_access.sql
--   20260402112523_2ca6ed02...sql
--   20260402112538_04cd7913...sql
--   20260402112727_8e82153f...sql
--   20260402120000_admin_view_all_profiles.sql
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. CRIAR TABELA system_settings (nunca foi criada nos migrations)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. ADICIONAR COLUNA is_admin EM profiles (estava faltando)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────
-- 3. REMOVER user_roles (não é mais usada)
-- ─────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 4. REMOVER TODAS AS VERSÕES DAS FUNÇÕES (para recriar sem conflito)
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_check() CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RECRIAR has_role — aceita app_role (usado por políticas posteriores)
--    Lógica migrada de user_roles → profiles.is_admin
-- ─────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = _user_id;

  -- Admin tem qualquer role
  IF COALESCE(v_is_admin, FALSE) THEN
    RETURN TRUE;
  END IF;

  -- Usuário comum só tem 'user'
  RETURN _role = 'user';
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Versão TEXT para compatibilidade com migration security_lockdown
CREATE FUNCTION public.has_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = check_user_id;

  IF COALESCE(v_is_admin, FALSE) THEN
    RETURN TRUE;
  END IF;

  RETURN required_role IN ('user', 'viewer');
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RECRIAR is_admin(UUID) — usada em políticas RLS
-- ─────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = check_user_id;

  RETURN COALESCE(v_is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. RECRIAR is_admin() sem parâmetro — usada em migrations posteriores
-- ─────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Alias check_is_admin()
CREATE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_admin(auth.uid());
END;
$$;

-- Alias is_admin_check()
CREATE FUNCTION public.is_admin_check()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_admin(auth.uid());
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. RLS — system_settings
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
-- 9. RLS — password_reset_codes
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable service role full access" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Enable insert for anon"          ON public.password_reset_codes;
DROP POLICY IF EXISTS "Service role only"               ON public.password_reset_codes;

CREATE POLICY "Service role only"
  ON public.password_reset_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
-- 10. RLS — profiles (limpar e recriar todas as políticas)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone"    ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                  ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"                ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"                ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"              ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert any profile"         ON public.profiles;
DROP POLICY IF EXISTS "Service role can update any profile"         ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert any profile"
  ON public.profiles FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update any profile"
  ON public.profiles FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
-- 11. RLS — user_subscriptions (admin pode gerenciar todas)
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all subscriptions"   ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
-- 12. RECRIAR políticas do CSAT (removidas pelo CASCADE acima)
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage campaigns"       ON public.csat_campaigns;
DROP POLICY IF EXISTS "Admins can manage CSAT responses"  ON public.csat_responses;

CREATE POLICY "Admins can manage campaigns"
  ON public.csat_campaigns FOR ALL TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage CSAT responses"
  ON public.csat_responses FOR ALL TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
-- FIM DO FIX — Verificação opcional:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
-- ORDER BY routine_name;
-- ─────────────────────────────────────────────────────────────────────
