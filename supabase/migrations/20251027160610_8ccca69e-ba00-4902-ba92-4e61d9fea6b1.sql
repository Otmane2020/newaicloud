-- Update increment_usage function to support shopify_stores_count
CREATE OR REPLACE FUNCTION public.increment_usage(p_seller_id uuid, p_field text, p_increment integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_month DATE;
BEGIN
  v_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Insert or update usage tracking
  INSERT INTO public.usage_tracking (seller_id, month, products_count, optimizations_count, articles_count, chat_responses_count, shopify_stores_count)
  VALUES (
    p_seller_id,
    v_month,
    CASE WHEN p_field = 'products_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'optimizations_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'articles_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'chat_responses_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'shopify_stores_count' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (seller_id, month)
  DO UPDATE SET
    products_count = CASE 
      WHEN p_field = 'products_count' THEN usage_tracking.products_count + p_increment
      ELSE usage_tracking.products_count
    END,
    optimizations_count = CASE 
      WHEN p_field = 'optimizations_count' THEN usage_tracking.optimizations_count + p_increment
      ELSE usage_tracking.optimizations_count
    END,
    articles_count = CASE 
      WHEN p_field = 'articles_count' THEN usage_tracking.articles_count + p_increment
      ELSE usage_tracking.articles_count
    END,
    chat_responses_count = CASE 
      WHEN p_field = 'chat_responses_count' THEN usage_tracking.chat_responses_count + p_increment
      ELSE usage_tracking.chat_responses_count
    END,
    shopify_stores_count = CASE 
      WHEN p_field = 'shopify_stores_count' THEN usage_tracking.shopify_stores_count + p_increment
      ELSE usage_tracking.shopify_stores_count
    END,
    updated_at = now();
END;
$$;