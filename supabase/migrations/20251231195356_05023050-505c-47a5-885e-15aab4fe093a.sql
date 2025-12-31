-- Create sync settings for all users who have shopify connections but no sync settings
INSERT INTO public.shopify_sync_settings (user_id, import_frequency, import_schedule_hour, import_schedule_day, import_types, export_auto_enabled)
SELECT DISTINCT 
  sc.user_id,
  'hourly' as import_frequency,
  9 as import_schedule_hour,
  1 as import_schedule_day,
  ARRAY['products', 'collections', 'pages', 'articles', 'images'] as import_types,
  false as export_auto_enabled
FROM shopify_connections sc
WHERE sc.user_id NOT IN (SELECT user_id FROM shopify_sync_settings WHERE user_id IS NOT NULL)
  AND sc.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;