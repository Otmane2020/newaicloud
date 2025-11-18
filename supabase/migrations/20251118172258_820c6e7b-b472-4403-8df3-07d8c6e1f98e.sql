-- Add seo_title column to blog_articles
ALTER TABLE public.blog_articles ADD COLUMN IF NOT EXISTS seo_title TEXT;

-- Initialize with existing title where seo_title is null
UPDATE public.blog_articles SET seo_title = title WHERE seo_title IS NULL;

-- Create function to repair orphan articles (assign them to a specific store)
CREATE OR REPLACE FUNCTION public.repair_orphan_articles(p_user_id UUID, p_store_id UUID)
RETURNS TABLE(repaired_count INTEGER, article_ids UUID[]) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_repaired_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Update articles without valid store_id to the provided store
  WITH updated AS (
    UPDATE public.blog_articles
    SET store_id = p_store_id, updated_at = NOW()
    WHERE user_id = p_user_id
      AND (store_id IS NULL OR store_id NOT IN (SELECT id FROM public.shopify_connections WHERE user_id = p_user_id))
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER
  INTO v_repaired_ids, v_count
  FROM updated;
  
  RETURN QUERY SELECT COALESCE(v_count, 0), COALESCE(v_repaired_ids, ARRAY[]::UUID[]);
END;
$$;

-- Create function to diagnose orphan articles
CREATE OR REPLACE FUNCTION public.get_orphan_articles(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  store_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ba.id, ba.title, ba.store_id, ba.created_at
  FROM public.blog_articles ba
  WHERE ba.user_id = p_user_id
    AND (ba.store_id IS NULL OR ba.store_id NOT IN (SELECT id FROM public.shopify_connections WHERE user_id = p_user_id))
  ORDER BY ba.created_at DESC;
END;
$$;