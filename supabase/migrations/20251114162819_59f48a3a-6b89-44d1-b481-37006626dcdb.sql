-- Migration: Associate existing articles with user's first active store
-- Update blog_articles where store_id is null

-- First, create a function to update articles with the user's first store
UPDATE blog_articles
SET store_id = (
  SELECT sc.id
  FROM shopify_connections sc
  WHERE sc.user_id = blog_articles.user_id
    AND sc.is_active = true
  ORDER BY sc.created_at ASC
  LIMIT 1
)
WHERE store_id IS NULL
  AND user_id IN (
    SELECT DISTINCT user_id 
    FROM shopify_connections 
    WHERE is_active = true
  );

-- For articles without an active store connection, keep them null but log a warning
-- These will need manual intervention
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM blog_articles
  WHERE store_id IS NULL
    AND user_id NOT IN (
      SELECT DISTINCT user_id 
      FROM shopify_connections 
      WHERE is_active = true
    );
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Warning: % articles remain without a store_id (no active store found for their users)', orphan_count;
  END IF;
END $$;