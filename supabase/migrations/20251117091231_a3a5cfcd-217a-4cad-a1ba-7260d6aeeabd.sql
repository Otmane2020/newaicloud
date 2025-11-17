-- Add vision analysis columns to shopify_products
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS vision_attributes JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vision_timestamp TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vision_model TEXT DEFAULT NULL;

-- Add index for vision_timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_shopify_products_vision_timestamp 
ON shopify_products(vision_timestamp DESC NULLS LAST);

COMMENT ON COLUMN shopify_products.vision_attributes IS 'Visual attributes extracted from product images using Gemini Vision AI';
COMMENT ON COLUMN shopify_products.vision_timestamp IS 'Timestamp of the last vision analysis';
COMMENT ON COLUMN shopify_products.vision_model IS 'AI model used for vision analysis (e.g., google/gemini-2.5-flash)';