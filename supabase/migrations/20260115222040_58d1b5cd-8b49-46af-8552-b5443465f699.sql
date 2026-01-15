-- Add is_paid column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

-- Add email notification fields to notification_settings
ALTER TABLE public.notification_settings 
ADD COLUMN email_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN send_once_only boolean NOT NULL DEFAULT false,
ADD COLUMN last_notification_date date DEFAULT NULL,
ADD COLUMN notification_email text DEFAULT NULL;

-- Create index for efficient querying of unpaid expenses near due date
CREATE INDEX idx_expenses_due_date_unpaid ON public.expenses (due_date, is_paid) WHERE is_paid = false;