ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS send_hour integer NOT NULL DEFAULT 9 CHECK (send_hour >= 0 AND send_hour <= 23);