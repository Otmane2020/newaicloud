-- Correction: limites dynamiques selon le plan actuel de l'utilisateur
CREATE OR REPLACE FUNCTION public.increment_usage(p_seller_id uuid, p_field text, p_increment integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month text;
  v_current_count integer;
  v_max_limit integer;
  v_new_count integer;
  v_current_plan_id text;
BEGIN
  v_month := to_char(CURRENT_DATE, 'YYYY-MM-01');
  
  -- Récupérer le plan actuel de l'utilisateur (trial ou payant)
  SELECT 
    CASE 
      WHEN subscription_status = 'trialing' THEN 'trial'
      ELSE COALESCE(current_plan_id, 'trial')
    END INTO v_current_plan_id
  FROM profiles
  WHERE id = p_seller_id;
  
  -- Récupérer le compteur actuel selon le champ
  EXECUTE format('SELECT COALESCE(%I, 0) FROM usage_tracking WHERE seller_id = $1 AND month = $2', p_field)
  INTO v_current_count
  USING p_seller_id, v_month;
  
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;
  
  -- Récupérer la limite depuis subscription_plans selon le champ
  IF p_field = 'products_count' THEN
    SELECT COALESCE(max_products, 10) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'shopify_stores_count' THEN
    SELECT COALESCE(max_shopify_stores, 1) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'optimizations_count' THEN
    SELECT COALESCE(max_optimizations_monthly, 50) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'articles_count' THEN
    SELECT COALESCE(max_articles_monthly, 1) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'chat_responses_count' THEN
    SELECT COALESCE(max_chat_responses_monthly, 50) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'shopify_requests_count' THEN
    SELECT COALESCE(max_shopify_requests_monthly, 20) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSIF p_field = 'campaigns_count' THEN
    SELECT COALESCE(max_campaigns, 0) INTO v_max_limit
    FROM subscription_plans
    WHERE id = v_current_plan_id;
  ELSE
    -- Fallback: limite par défaut
    v_max_limit := 100;
  END IF;
  
  -- Si aucune limite trouvée, utiliser des valeurs par défaut sécurisées
  IF v_max_limit IS NULL THEN
    v_max_limit := CASE p_field
      WHEN 'products_count' THEN 10
      WHEN 'shopify_stores_count' THEN 1
      WHEN 'optimizations_count' THEN 50
      WHEN 'articles_count' THEN 1
      WHEN 'chat_responses_count' THEN 50
      WHEN 'shopify_requests_count' THEN 20
      WHEN 'campaigns_count' THEN 0
      ELSE 100
    END;
  END IF;
  
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
      shopify_requests_count,
      shopify_stores_count,
      campaigns_count
    )
    VALUES (
      p_seller_id,
      v_month,
      CASE WHEN p_field = 'products_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'optimizations_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'articles_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'chat_responses_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'shopify_requests_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'shopify_stores_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'campaigns_count' THEN v_new_count ELSE 0 END
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
      products_count = CASE 
        WHEN p_field = 'products_count' THEN v_new_count
        ELSE usage_tracking.products_count
      END,
      optimizations_count = CASE 
        WHEN p_field = 'optimizations_count' THEN v_new_count
        ELSE usage_tracking.optimizations_count
      END,
      articles_count = CASE 
        WHEN p_field = 'articles_count' THEN v_new_count
        ELSE usage_tracking.articles_count
      END,
      chat_responses_count = CASE 
        WHEN p_field = 'chat_responses_count' THEN v_new_count
        ELSE usage_tracking.chat_responses_count
      END,
      shopify_requests_count = CASE 
        WHEN p_field = 'shopify_requests_count' THEN v_new_count
        ELSE usage_tracking.shopify_requests_count
      END,
      shopify_stores_count = CASE 
        WHEN p_field = 'shopify_stores_count' THEN v_new_count
        ELSE usage_tracking.shopify_stores_count
      END,
      campaigns_count = CASE 
        WHEN p_field = 'campaigns_count' THEN v_new_count
        ELSE usage_tracking.campaigns_count
      END,
      updated_at = now();
  END IF;
END;
$function$;