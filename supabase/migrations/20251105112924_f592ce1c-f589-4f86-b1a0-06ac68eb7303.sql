-- Add body_html column to shopify_products to store full HTML description from Shopify
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS body_html TEXT;

COMMENT ON COLUMN shopify_products.body_html IS 
'Full product description with HTML from Shopify API (body_html field)';