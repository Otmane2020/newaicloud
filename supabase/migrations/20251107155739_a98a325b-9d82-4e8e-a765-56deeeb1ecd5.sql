-- Modifier la fonction increment_usage pour empêcher de dépasser les limites du plan
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_seller_id uuid, 
  p_field text, 
  p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_current_count integer;
  v_max_limit integer;
  v_new_count integer;
BEGIN
  v_month := to_char(CURRENT_DATE, 'YYYY-MM-01');
  
  -- Si c'est une optimisation, vérifier la limite
  IF p_field = 'optimizations_count' THEN
    -- Récupérer le compteur actuel
    SELECT COALESCE(optimizations_count, 0) INTO v_current_count
    FROM usage_tracking
    WHERE seller_id = p_seller_id AND month = v_month;
    
    IF v_current_count IS NULL THEN
      v_current_count := 0;
    END IF;
    
    -- Récupérer la limite max du plan actuel
    SELECT COALESCE(sp.max_optimizations_monthly, 50) INTO v_max_limit
    FROM profiles p
    LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
    WHERE p.id = p_seller_id;
    
    -- Calculer le nouveau compteur sans dépasser la limite
    v_new_count := LEAST(v_current_count + p_increment, v_max_limit);
    
    -- Ne faire l'update que si on n'a pas déjà atteint la limite
    IF v_current_count < v_max_limit THEN
      INSERT INTO usage_tracking (
        seller_id,
        month,
        products_count,
        optimizations_count,
        articles_count,
        chat_responses_count,
        shopify_stores_count
      )
      VALUES (
        p_seller_id,
        v_month,
        0,
        v_new_count,
        0,
        0,
        0
      )
      ON CONFLICT (seller_id, month)
      DO UPDATE SET
        optimizations_count = v_new_count,
        updated_at = now();
    END IF;
    
    RETURN;
  END IF;
  
  -- Pour les autres champs, comportement normal
  INSERT INTO usage_tracking (
    seller_id,
    month,
    products_count,
    optimizations_count,
    articles_count,
    chat_responses_count,
    shopify_stores_count
  )
  VALUES (
    p_seller_id,
    v_month,
    CASE WHEN p_field = 'products_count' THEN p_increment ELSE 0 END,
    0,
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