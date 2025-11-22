-- Phase 2: Create Collections-Products Relationship

-- 1. Create the product_collections join table
CREATE TABLE IF NOT EXISTS product_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES shopify_collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, collection_id)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_collections_product ON product_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_collection ON product_collections(collection_id);

-- 3. Migrate existing collection_ids data into product_collections
INSERT INTO product_collections (product_id, collection_id)
SELECT 
  p.id AS product_id,
  unnest(p.collection_ids) AS collection_id
FROM shopify_products p
WHERE p.collection_ids IS NOT NULL 
  AND array_length(p.collection_ids, 1) > 0
ON CONFLICT (product_id, collection_id) DO NOTHING;