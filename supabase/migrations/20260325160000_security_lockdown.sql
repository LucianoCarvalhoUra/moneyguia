-- =====================================================
-- MIGRATION: Blindagem de Segurança Final
-- Data: 2026-03-25
-- =====================================================

-- =====================================================
-- 1. REMOÇÃO DE DEPENDÊNCIA DA TABELA user_roles
-- =====================================================

-- A tabela user_roles não é mais utilizada para permissões.
-- Toda a lógica agora reside em profiles.is_admin.
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- =====================================================
-- 2. REFATORAR has_role COM SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Busca o status de admin diretamente no perfil
  SELECT p.is_admin INTO is_admin_user
  FROM public.profiles p
  WHERE p.id = check_user_id;

  -- Se for Super Admin, tem todas as roles
  IF COALESCE(is_admin_user, FALSE) THEN
    RETURN TRUE;
  END IF;

  -- Usuário comum só tem acesso a permissão 'user' ou 'viewer'
  RETURN required_role IN ('user', 'viewer');
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, retorna false por segurança
  RETURN FALSE;
END;
$$;

-- =====================================================
-- 3. RLS NA TABELA password_reset_codes
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable service role full access" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.password_reset_codes;

-- Criar política: Apenas service_role pode acessar
DROP POLICY IF EXISTS "Service role only" ON public.password_reset_codes;
CREATE POLICY "Service role only"
ON public.password_reset_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. PROTEÇÃO DA TABELA profiles
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Políticas mais restritivas
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert any profile" ON public.profiles;
CREATE POLICY "Service role can insert any profile"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update any profile" ON public.profiles;
CREATE POLICY "Service role can update any profile"
ON public.profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. CRIAR FUNÇÃO PARA VERIFICAR SE É ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND is_admin = true
  ) INTO is_admin;

  RETURN COALESCE(is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- =====================================================
-- NOTAS:
-- 1. Execute este SQL no Supabase Dashboard > SQL Editor
-- 2. A tabela user_roles agora só pode ser modificada pelo service_role
-- 3. A função has_role agora usa SECURITY DEFINER
-- 4. A tabela password_reset_codes é acessível apenas pelo backend
-- =====================================================
