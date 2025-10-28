-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the report-usage-to-stripe function to run daily at 2 AM
SELECT cron.schedule(
  'report-usage-to-stripe-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/report-usage-to-stripe',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  ) AS request_id;
  $$
);
