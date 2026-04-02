
-- Fix 1: Remove public profiles exposure
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Remove duplicate profile SELECT policy (keep one)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Fix 2: Consolidate user_roles ALL policies to use safe has_role()
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
