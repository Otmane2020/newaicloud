-- Add collection_ids to shopify_products for linking
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS collection_ids UUID[] DEFAULT '{}';

-- Add collection_id to blog_articles
ALTER TABLE blog_articles
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES shopify_collections(id) ON DELETE SET NULL;