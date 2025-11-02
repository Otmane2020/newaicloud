-- Correction finale de check_optimization_allowed pour respecter le paramètre force
CREATE OR REPLACE FUNCTION public.check_optimization_allowed(
  p_user_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_is_trial BOOLEAN;
  v_is_paid BOOLEAN;
  v_optimization_count INTEGER;
  v_last_optimization TIMESTAMPTZ;
  v_usage_count INTEGER;
  v_max_optimizations INTEGER;
  v_table_name TEXT;
BEGIN
  -- Get user subscription status
  SELECT 
    subscription_status = 'trialing',
    subscription_status IN ('active', 'past_due')
  INTO v_is_trial, v_is_paid
  FROM profiles WHERE id = p_user_id;
  
  -- Determine table name
  v_table_name := CASE p_resource_type
    WHEN 'product' THEN 'shopify_products'
    WHEN 'image' THEN 'product_images'
    WHEN 'article' THEN 'blog_articles'
    WHEN 'page' THEN 'shopify_pages'
    WHEN 'collection' THEN 'shopify_collections'
    ELSE NULL
  END;
  
  IF v_table_name IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'invalid_resource_type',
      'message', 'Type de ressource invalide.'
    );
  END IF;
  
  -- Get resource optimization count
  EXECUTE format('SELECT COALESCE(optimization_count, 0), last_optimization_at FROM %I WHERE id = $1', v_table_name)
  INTO v_optimization_count, v_last_optimization 
  USING p_resource_id;
  
  -- Trial users: strict limit of 1 optimization
  IF v_is_trial THEN
    IF v_optimization_count >= 1 THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'reason', 'trial_limit_reached',
        'message', 'Limite d''essai atteinte. Passez à un plan payant pour ré-optimiser.',
        'count', v_optimization_count
      );
    END IF;
    -- First optimization allowed for trial users
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'is_trial', TRUE,
      'is_paid', FALSE,
      'current_count', v_optimization_count
    );
  END IF;
  
  -- Paid users
  IF v_is_paid THEN
    -- Check monthly limits first
    SELECT COALESCE(optimizations_count, 0) INTO v_usage_count
    FROM usage_tracking
    WHERE seller_id = p_user_id
      AND month = DATE_TRUNC('month', CURRENT_DATE);
    
    SELECT sp.max_optimizations_monthly INTO v_max_optimizations
    FROM profiles p
    JOIN subscription_plans sp ON sp.id = p.current_plan_id
    WHERE p.id = p_user_id;
    
    IF v_usage_count >= v_max_optimizations THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'reason', 'monthly_limit_reached',
        'message', 'Limite mensuelle d''optimisations atteinte.',
        'usage', v_usage_count,
        'limit', v_max_optimizations
      );
    END IF;
    
    -- For paid users with force=true, always allow
    IF p_force THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'is_trial', FALSE,
        'is_paid', TRUE,
        'current_count', v_optimization_count,
        'forced', TRUE
      );
    END IF;
    
    -- For paid users without force, check if already optimized
    IF v_optimization_count >= 1 THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'reason', 'already_optimized',
        'message', 'Contenu déjà optimisé. Utilisez le mode force.',
        'count', v_optimization_count,
        'last_optimized_at', v_last_optimization
      );
    END IF;
    
    -- First optimization for paid users
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'is_trial', FALSE,
      'is_paid', TRUE,
      'current_count', v_optimization_count
    );
  END IF;
  
  -- No active subscription
  RETURN jsonb_build_object(
    'allowed', FALSE,
    'reason', 'no_active_subscription',
    'message', 'Aucun abonnement actif.'
  );
END;
$function$;