-- =====================================================================
-- FIX: Substitui 20260325160000_security_lockdown.sql
-- Execute este arquivo NO LUGAR do arquivo original no SQL Editor
-- =====================================================================

-- 1. Adicionar coluna is_admin em profiles (estava faltando nos migrations)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Remover user_roles (não usada mais)
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 3. DROP explícito das funções antes de recriar
--    (necessário quando nomes de parâmetros mudam)
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- 4. Recriar has_role
CREATE FUNCTION public.has_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;  -- prefixo v_ evita conflito com nome de coluna
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

-- 5. Recriar is_admin
CREATE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;  -- prefixo v_ evita conflito com coluna is_admin
BEGIN
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = check_user_id;

  RETURN COALESCE(v_is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- 6. RLS em password_reset_codes
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable service role full access" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Service role only" ON public.password_reset_codes;
CREATE POLICY "Service role only"
  ON public.password_reset_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Políticas de profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert any profile"    ON public.profiles;
DROP POLICY IF EXISTS "Service role can update any profile"    ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can insert any profile"
  ON public.profiles FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update any profile"
  ON public.profiles FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
