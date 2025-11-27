-- Fix the blog campaigns cron job to call the correct endpoint
-- First, unschedule the incorrect cron job
SELECT cron.unschedule('generate-campaign-articles');

-- Create the correct cron job that calls process-blog-campaigns
-- Runs every 6 hours
SELECT cron.schedule(
  'process-blog-campaigns',
  '0 */6 * * *',
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