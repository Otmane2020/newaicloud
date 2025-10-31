-- Add synchronization columns to merchant_feed_settings
ALTER TABLE merchant_feed_settings
ADD COLUMN IF NOT EXISTS sync_frequency TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_shopify_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false;