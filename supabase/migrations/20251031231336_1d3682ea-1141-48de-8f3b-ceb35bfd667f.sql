-- Add unique constraint on shopify_article_id for blog_articles table
-- This allows upsert operations to work correctly when importing from Shopify

ALTER TABLE blog_articles 
ADD CONSTRAINT blog_articles_shopify_article_id_key 
UNIQUE (shopify_article_id);