CREATE TABLE public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes (email);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes (expires_at);