-- Add feed_domain column to merchant_feed_settings
ALTER TABLE merchant_feed_settings 
ADD COLUMN IF NOT EXISTS feed_domain text;

COMMENT ON COLUMN merchant_feed_settings.feed_domain IS 'Custom domain for feed URLs (e.g., decora-home.fr instead of store code)';