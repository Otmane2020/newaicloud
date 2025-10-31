-- Add missing columns to blog_articles table for Shopify import
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS shopify_article_id bigint,
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES shopify_connections(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_blog_articles_shopify_article_id ON blog_articles(shopify_article_id);
CREATE INDEX IF NOT EXISTS idx_blog_articles_store_id ON blog_articles(store_id);