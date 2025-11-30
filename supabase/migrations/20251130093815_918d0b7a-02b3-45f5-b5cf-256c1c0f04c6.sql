-- Add unique constraint on product_id + shopify_image_id for proper upsert support
-- First, clean up any duplicates that might exist

-- Delete duplicate images keeping only the most recent one
DELETE FROM public.product_images a
USING public.product_images b
WHERE a.product_id = b.product_id
  AND a.shopify_image_id = b.shopify_image_id
  AND a.shopify_image_id IS NOT NULL
  AND a.id < b.id;

-- Create the composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS product_images_product_shopify_unique 
ON public.product_images (product_id, shopify_image_id) 
WHERE shopify_image_id IS NOT NULL;