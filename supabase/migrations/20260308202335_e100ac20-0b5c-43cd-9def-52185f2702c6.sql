
DROP POLICY "Service role can update payments" ON public.payments;
CREATE POLICY "Users can update their own payments" ON public.payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
