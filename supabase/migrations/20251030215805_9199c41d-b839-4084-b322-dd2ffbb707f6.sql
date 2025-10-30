-- Fix shopify_stores_count in usage_tracking to reflect actual number of connected stores
UPDATE usage_tracking ut
SET 
  shopify_stores_count = (
    SELECT COUNT(*) 
    FROM shopify_connections sc 
    WHERE sc.user_id = ut.seller_id
  ),
  updated_at = now()
WHERE month = DATE_TRUNC('month', CURRENT_DATE);