-- Amélioration de increment_usage pour plafonner TOUS les compteurs mensuels
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
  v_is_trial boolean;
BEGIN
  v_month := to_char(CURRENT_DATE, 'YYYY-MM-01');
  
  -- Déterminer si l'utilisateur est en trial
  SELECT subscription_status = 'trialing' INTO v_is_trial
  FROM profiles
  WHERE id = p_seller_id;
  
  -- Récupérer le compteur actuel selon le champ
  EXECUTE format('SELECT COALESCE(%I, 0) FROM usage_tracking WHERE seller_id = $1 AND month = $2', p_field)
  INTO v_current_count
  USING p_seller_id, v_month;
  
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;
  
  -- Déterminer la limite max selon le type de compteur et le statut trial/paid
  IF p_field = 'optimizations_count' THEN
    IF v_is_trial THEN
      v_max_limit := 50; -- Trial: 50 optimisations max
    ELSE
      SELECT COALESCE(sp.max_optimizations_monthly, 999999) INTO v_max_limit
      FROM profiles p
      LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
      WHERE p.id = p_seller_id;
    END IF;
  ELSIF p_field = 'articles_count' THEN
    IF v_is_trial THEN
      v_max_limit := 1; -- Trial: 1 article max
    ELSE
      SELECT COALESCE(sp.max_articles_monthly, 5) INTO v_max_limit
      FROM profiles p
      LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
      WHERE p.id = p_seller_id;
    END IF;
  ELSIF p_field = 'chat_responses_count' THEN
    IF v_is_trial THEN
      v_max_limit := 50; -- Trial: 50 réponses chat max
    ELSE
      SELECT COALESCE(sp.max_chat_responses_monthly, 200) INTO v_max_limit
      FROM profiles p
      LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
      WHERE p.id = p_seller_id;
    END IF;
  ELSIF p_field = 'shopify_requests_count' THEN
    IF v_is_trial THEN
      v_max_limit := 20; -- Trial: 20 requêtes Shopify max
    ELSE
      SELECT COALESCE(sp.max_shopify_requests_monthly, 100) INTO v_max_limit
      FROM profiles p
      LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
      WHERE p.id = p_seller_id;
    END IF;
  ELSIF p_field = 'campaigns_count' THEN
    IF v_is_trial THEN
      v_max_limit := 0; -- Trial: 0 campagnes
    ELSE
      SELECT COALESCE(sp.max_campaigns, 10) INTO v_max_limit
      FROM profiles p
      LEFT JOIN subscription_plans sp ON p.current_plan_id = sp.id
      WHERE p.id = p_seller_id;
    END IF;
  ELSE
    -- Pour products_count et shopify_stores_count, pas de plafonnement mensuel
    -- (gérés par d'autres triggers)
    v_max_limit := 999999;
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
      0,
      CASE WHEN p_field = 'optimizations_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'articles_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'chat_responses_count' THEN v_new_count ELSE 0 END,
      CASE WHEN p_field = 'shopify_requests_count' THEN v_new_count ELSE 0 END,
      0,
      CASE WHEN p_field = 'campaigns_count' THEN v_new_count ELSE 0 END
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
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
      campaigns_count = CASE 
        WHEN p_field = 'campaigns_count' THEN v_new_count
        ELSE usage_tracking.campaigns_count
      END,
      updated_at = now();
  END IF;
END;
$function$;