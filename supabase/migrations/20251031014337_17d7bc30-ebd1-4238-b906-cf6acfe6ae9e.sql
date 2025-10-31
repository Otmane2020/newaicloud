-- Add SEO columns to shopify_collections table
ALTER TABLE shopify_collections
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN shopify_collections.seo_title IS 'SEO optimized meta title for the collection';
COMMENT ON COLUMN shopify_collections.seo_description IS 'SEO optimized meta description for the collection';
COMMENT ON COLUMN shopify_collections.optimization_count IS 'Number of times this collection has been SEO optimized';
COMMENT ON COLUMN shopify_collections.last_optimization_at IS 'Timestamp of the last SEO optimization';