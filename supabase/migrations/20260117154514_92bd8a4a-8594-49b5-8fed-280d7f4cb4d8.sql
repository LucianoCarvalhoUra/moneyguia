-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a cron job to call the edge function daily at 08:00 UTC
SELECT cron.schedule(
  'check-due-expenses-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uuirvevhvjvnubihnstz.supabase.co/functions/v1/check-due-expenses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);