
-- Update RLS policies for profiles to use new admin email
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
CREATE POLICY "Admins can see all profiles" ON public.profiles
  FOR SELECT TO public
  USING ((auth.jwt() ->> 'email'::text) = 'admin@moneyguia.com.br'::text);

-- Update RLS policies for user_subscriptions to use new admin email
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions
  FOR ALL TO public
  USING ((auth.jwt() ->> 'email'::text) = 'admin@moneyguia.com.br'::text)
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'admin@moneyguia.com.br'::text);
