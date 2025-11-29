-- Add unique constraint on (product_id, src) to prevent duplicate images
-- First, delete existing duplicates keeping the first one
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, src ORDER BY created_at ASC) as rn
  FROM product_images
)
DELETE FROM product_images WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS product_images_product_src_unique 
ON product_images (product_id, src);