-- Add unique constraint on shopify_article_id to enable upsert operations
-- This allows the import-shopify-articles function to update existing articles
-- NULL values are allowed (for AI-generated articles that aren't from Shopify)
ALTER TABLE blog_articles 
ADD CONSTRAINT unique_shopify_article_id UNIQUE (shopify_article_id);