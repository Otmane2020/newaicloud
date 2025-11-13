-- Drop the problematic index on featured_image
-- Base64 images are too large for btree indexes (max 8191 bytes)
DROP INDEX IF EXISTS public.idx_blog_articles_featured_image;

-- Add a comment explaining why we don't index this column
COMMENT ON COLUMN public.blog_articles.featured_image IS 'Base64 encoded image data - not indexed due to size constraints';