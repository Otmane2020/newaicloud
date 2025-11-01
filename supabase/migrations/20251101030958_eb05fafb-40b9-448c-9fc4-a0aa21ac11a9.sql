-- Add last_synced_at column to blog_articles table
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add last_synced_at column to product_images table
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN blog_articles.last_synced_at IS 'Timestamp of last successful sync to Shopify';
COMMENT ON COLUMN product_images.last_synced_at IS 'Timestamp of last successful sync to Shopify';