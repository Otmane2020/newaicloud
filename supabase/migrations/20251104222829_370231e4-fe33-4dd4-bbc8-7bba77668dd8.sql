-- Add google_white_background column to shopify_products
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS google_white_background BOOLEAN DEFAULT false;

-- Add index for optimized filtering
CREATE INDEX IF NOT EXISTS idx_shopify_products_google_optimization 
ON shopify_products(google_product_category, google_gtin, google_white_background) 
WHERE google_product_category IS NOT NULL;