-- Add source column to blog_articles to differentiate AI-generated from Shopify imports
ALTER TABLE blog_articles 
ADD COLUMN source TEXT DEFAULT 'ai_generated' 
CHECK (source IN ('ai_generated', 'shopify_import'));

-- Update existing articles to be marked as AI-generated
UPDATE blog_articles 
SET source = 'ai_generated' 
WHERE source IS NULL;

-- Add index for better query performance
CREATE INDEX idx_blog_articles_source ON blog_articles(source);
CREATE INDEX idx_blog_articles_user_source ON blog_articles(user_id, source);