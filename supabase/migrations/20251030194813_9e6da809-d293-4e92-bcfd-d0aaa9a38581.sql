-- Update delete_shopify_connection_cascade to recalculate usage counters
CREATE OR REPLACE FUNCTION public.delete_shopify_connection_cascade()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete import jobs first
  DELETE FROM import_jobs WHERE store_id = OLD.id;
  
  -- Delete sync logs
  DELETE FROM sync_logs WHERE store_id = OLD.id;
  
  -- Delete product images (via products)
  DELETE FROM product_images 
  WHERE product_id IN (
    SELECT id FROM shopify_products WHERE store_id = OLD.id
  );
  
  -- Delete product variants (via products)
  DELETE FROM product_variants 
  WHERE product_id IN (
    SELECT id FROM shopify_products WHERE store_id = OLD.id
  );
  
  -- Delete shopify pages
  DELETE FROM shopify_pages WHERE store_id = OLD.id;
  
  -- Delete shopify products
  DELETE FROM shopify_products WHERE store_id = OLD.id;
  
  -- Also delete products without store_id but belonging to the same user
  DELETE FROM product_images 
  WHERE product_id IN (
    SELECT id FROM shopify_products 
    WHERE seller_id = OLD.user_id AND store_id IS NULL
  );
  
  DELETE FROM product_variants 
  WHERE product_id IN (
    SELECT id FROM shopify_products 
    WHERE seller_id = OLD.user_id AND store_id IS NULL
  );
  
  DELETE FROM shopify_products 
  WHERE seller_id = OLD.user_id AND store_id IS NULL;
  
  -- Recalculate usage counters in usage_tracking
  UPDATE usage_tracking
  SET 
    -- Recalculate the real number of remaining products
    products_count = (
      SELECT COUNT(*) 
      FROM shopify_products 
      WHERE seller_id = OLD.user_id
    ),
    -- Decrement the number of Shopify stores
    shopify_stores_count = GREATEST(0, shopify_stores_count - 1),
    updated_at = now()
  WHERE seller_id = OLD.user_id 
    AND month = DATE_TRUNC('month', CURRENT_DATE);
  
  -- If no row exists for the current month, we do nothing
  -- (the user had no activity this month yet)
  
  RETURN OLD;
END;
$$;