-- Add landing_page column to shopify_products table
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS landing_page TEXT;

COMMENT ON COLUMN shopify_products.landing_page IS 'Stores the generated HTML landing page description. When synced, this replaces the standard description on Shopify.';