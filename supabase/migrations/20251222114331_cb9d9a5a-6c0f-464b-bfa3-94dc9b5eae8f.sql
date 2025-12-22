-- Add regenerated_title column to shopify_products
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS regenerated_title TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.shopify_products.regenerated_title IS 'AI regenerated title that will replace Shopify title on export';

-- Add last_exported_at to track when product was last synced to Shopify
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ;

-- Add needs_export flag to track products that need to be exported
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS needs_export BOOLEAN DEFAULT false;

-- Create index for efficient querying of products needing export
CREATE INDEX IF NOT EXISTS idx_shopify_products_needs_export 
ON public.shopify_products(seller_id, needs_export) 
WHERE needs_export = true;