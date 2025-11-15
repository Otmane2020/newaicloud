-- Add Google category classification columns to shopify_products
ALTER TABLE public.shopify_products
ADD COLUMN IF NOT EXISTS google_category TEXT,
ADD COLUMN IF NOT EXISTS google_category_id BIGINT,
ADD COLUMN IF NOT EXISTS google_category_confidence INTEGER;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_shopify_products_google_category_id 
ON public.shopify_products(google_category_id);

COMMENT ON COLUMN public.shopify_products.google_category IS 'Auto-classified Google Product Category path';
COMMENT ON COLUMN public.shopify_products.google_category_id IS 'Auto-classified Google Product Category ID';
COMMENT ON COLUMN public.shopify_products.google_category_confidence IS 'AI confidence score for category classification (0-100)';