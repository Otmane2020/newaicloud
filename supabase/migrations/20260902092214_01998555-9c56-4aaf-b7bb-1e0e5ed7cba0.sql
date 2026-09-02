create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-shopify-tokens-hourly') then
    perform cron.unschedule('refresh-shopify-tokens-hourly');
  end if;
end $$;

select cron.schedule(
  'refresh-shopify-tokens-hourly',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://xkrrcusvmxifbiejxker.supabase.co/functions/v1/refresh-shopify-tokens',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_CYxK4_XGw5hfxiZMEcWkyg_LeDS5Ivk"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);