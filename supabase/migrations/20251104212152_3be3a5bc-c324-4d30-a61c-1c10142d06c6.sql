-- Add GTIN generation toggle to merchant_feed_settings
ALTER TABLE public.merchant_feed_settings
ADD COLUMN IF NOT EXISTS generate_gtin_enabled BOOLEAN DEFAULT true;