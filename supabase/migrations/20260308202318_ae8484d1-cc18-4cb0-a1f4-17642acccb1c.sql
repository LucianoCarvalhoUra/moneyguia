
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update payments" ON public.payments
  FOR UPDATE USING (true);
