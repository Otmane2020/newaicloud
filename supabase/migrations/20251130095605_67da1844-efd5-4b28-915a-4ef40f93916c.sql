-- Fix product_images constraints to enable proper ON CONFLICT handling
-- Problem: Partial index cannot be used by PostgreSQL for ON CONFLICT

-- 1. Drop the partial index that cannot be used with ON CONFLICT
DROP INDEX IF EXISTS product_images_product_shopify_unique;

-- 2. Drop the unique constraint on shopify_image_id alone (blocks shared images)
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_shopify_image_id_key;

-- 3. Create a proper NON-PARTIAL unique constraint for ON CONFLICT
CREATE UNIQUE INDEX product_images_product_shopify_unique 
ON public.product_images (product_id, shopify_image_id);

-- 4. Add index comment for documentation
COMMENT ON INDEX product_images_product_shopify_unique IS 'Non-partial unique constraint for proper ON CONFLICT handling during image imports';