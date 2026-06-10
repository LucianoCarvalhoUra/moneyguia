-- =====================================================================
-- FIX: Substitui 20260402120000_admin_view_all_profiles.sql
--      e    20260326000000_admin_subscription_access.sql
-- Execute APÓS o FIX-security-lockdown.sql
-- =====================================================================

-- Garante que is_admin existe (caso este arquivo seja executado isolado)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ── Políticas de profiles para admin ─────────────────────────────────

DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── Políticas de user_subscriptions para admin ───────────────────────

DROP POLICY IF EXISTS "Admins can view all subscriptions"   ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
