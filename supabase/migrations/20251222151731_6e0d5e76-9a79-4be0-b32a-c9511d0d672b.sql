-- Migration: Create missing product_image_history entries for existing AI-generated images
-- This ensures all existing AI images appear in the history panel with is_current: true

-- First, insert history entries for AI images that don't have any history yet
INSERT INTO product_image_history (
  product_id,
  image_id,
  user_id,
  optimization_type,
  original_url,
  optimized_url,
  version_number,
  is_current,
  ai_model,
  ai_prompt,
  quality_score
)
SELECT 
  pi.product_id,
  pi.id as image_id,
  sp.seller_id as user_id,
  'ai_background' as optimization_type,
  pi.src as original_url, -- No original available, use same URL
  pi.src as optimized_url,
  1 as version_number,
  true as is_current,
  'Lovable AI (migrated)' as ai_model,
  CONCAT('AI-generated image for ', sp.title) as ai_prompt,
  85 as quality_score -- Default quality score
FROM product_images pi
JOIN shopify_products sp ON sp.id = pi.product_id
WHERE pi.is_ai_generated = true
AND NOT EXISTS (
  SELECT 1 FROM product_image_history pih 
  WHERE pih.image_id = pi.id
);

-- Log how many entries were created (for debugging)
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM product_images pi
  WHERE pi.is_ai_generated = true
  AND EXISTS (
    SELECT 1 FROM product_image_history pih 
    WHERE pih.image_id = pi.id
  );
  
  RAISE NOTICE 'AI images with history entries: %', migrated_count;
END $$;