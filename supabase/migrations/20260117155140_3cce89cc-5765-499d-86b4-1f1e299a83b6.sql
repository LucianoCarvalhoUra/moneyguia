-- Add sender email configuration for Brevo
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS sender_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'Controle Financeiro';