-- Add featured_image column to blog_articles
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blog_articles_featured_image 
ON blog_articles(featured_image) 
WHERE featured_image IS NOT NULL;

-- Backfill existing articles with their featured images from content_images
UPDATE blog_articles
SET featured_image = (
  SELECT src 
  FROM content_images 
  WHERE content_images.content_id = blog_articles.id 
    AND content_images.content_type = 'article'
  ORDER BY content_images.position ASC
  LIMIT 1
)
WHERE featured_image IS NULL;