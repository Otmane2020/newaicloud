-- Add shopify_sync_count column to track how many times an image has been synced to Shopify
-- AI-generated images should only be synced once to prevent duplicates

ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS shopify_sync_count INTEGER DEFAULT 0;

COMMENT ON COLUMN product_images.shopify_sync_count IS 'Counter for how many times this image has been synced to Shopify. AI-generated images should only be synced once (max 1).';