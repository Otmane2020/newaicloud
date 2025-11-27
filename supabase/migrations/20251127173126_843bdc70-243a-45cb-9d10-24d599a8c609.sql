-- Add execution_hour field to blog_campaigns
ALTER TABLE public.blog_campaigns 
ADD COLUMN IF NOT EXISTS execution_hour INTEGER DEFAULT 12 CHECK (execution_hour >= 0 AND execution_hour <= 23);

COMMENT ON COLUMN public.blog_campaigns.execution_hour IS 'Hour of day (0-23) when campaign should run, e.g., 12 for noon';

-- Update the cron job to run once per day at noon instead of every 6 hours
SELECT cron.unschedule('process-blog-campaigns');

SELECT cron.schedule(
  'process-blog-campaigns',
  '0 12 * * *',  -- Run daily at noon (12:00 UTC)
  $$
  SELECT net.http_post(
    url := 'https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/process-blog-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5la3FxbGhyamdteXVkbW1ld2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNzAxMDQsImV4cCI6MjA3Njk0NjEwNH0.Alb88W0k8L4n-UnN5lx2e5AuGE2cZR_IyrwFDqYI2KU'
    ),
    body := jsonb_build_object()
  );
  $$
);