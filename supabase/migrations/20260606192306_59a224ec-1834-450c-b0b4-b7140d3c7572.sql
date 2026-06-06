
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS alert_overdue_expenses boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_upcoming_expenses boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_pending_incomes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_received_incomes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'daily';

ALTER TABLE public.notification_settings
  DROP CONSTRAINT IF EXISTS notification_settings_frequency_check;
ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_frequency_check
  CHECK (frequency IN ('daily','weekly','monthly'));
