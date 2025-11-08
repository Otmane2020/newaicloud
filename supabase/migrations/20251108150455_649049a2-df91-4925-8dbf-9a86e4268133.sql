-- Function to recalculate real Shopify connections count
CREATE OR REPLACE FUNCTION public.recalculate_shopify_stores_count(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, old_count integer, new_count integer, fixed boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH real_counts AS (
    SELECT 
      sc.user_id,
      COUNT(*)::integer as real_count
    FROM shopify_connections sc
    WHERE p_user_id IS NULL OR sc.user_id = p_user_id
    GROUP BY sc.user_id
  ),
  current_counts AS (
    SELECT 
      ut.seller_id as user_id,
      ut.shopify_stores_count as current_count
    FROM usage_tracking ut
    WHERE ut.month >= DATE_TRUNC('month', CURRENT_DATE)
      AND (p_user_id IS NULL OR ut.seller_id = p_user_id)
  ),
  comparison AS (
    SELECT 
      COALESCE(rc.user_id, cc.user_id) as user_id,
      COALESCE(cc.current_count, 0) as old_count,
      COALESCE(rc.real_count, 0) as new_count,
      COALESCE(cc.current_count, 0) != COALESCE(rc.real_count, 0) as needs_fix
    FROM real_counts rc
    FULL OUTER JOIN current_counts cc ON rc.user_id = cc.user_id
  )
  SELECT 
    c.user_id,
    c.old_count,
    c.new_count,
    c.needs_fix as fixed
  FROM comparison c
  WHERE c.needs_fix;
  
  -- Apply fixes for current and future months
  UPDATE usage_tracking ut
  SET 
    shopify_stores_count = (
      SELECT COUNT(*)::integer
      FROM shopify_connections sc
      WHERE sc.user_id = ut.seller_id
    ),
    updated_at = now()
  WHERE ut.month >= DATE_TRUNC('month', CURRENT_DATE)
    AND (p_user_id IS NULL OR ut.seller_id = p_user_id)
    AND ut.shopify_stores_count != (
      SELECT COUNT(*)::integer
      FROM shopify_connections sc
      WHERE sc.user_id = ut.seller_id
    );
END;
$$;

COMMENT ON FUNCTION public.recalculate_shopify_stores_count IS 'Recalculate and fix shopify_stores_count based on actual shopify_connections table. Call with no params to fix all users, or pass user_id to fix specific user.';