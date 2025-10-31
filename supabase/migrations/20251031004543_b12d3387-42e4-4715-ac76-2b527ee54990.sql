-- Phase 1: Add tracking columns for optimization limits

-- Add optimization tracking to shopify_products
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS optimization_history JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_synced_data JSONB;

-- Add optimization tracking to product_images
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMPTZ;

-- Add optimization tracking to blog_articles
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMPTZ;

-- Add optimization tracking to shopify_pages
ALTER TABLE shopify_pages 
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMPTZ;

-- Phase 2: Create RPC function for centralized limit checking
CREATE OR REPLACE FUNCTION check_optimization_allowed(
  p_user_id UUID,
  p_resource_type TEXT, -- 'product', 'image', 'article', 'page'
  p_resource_id UUID,
  p_force BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
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
  
  -- Trial users: max 1 optimization per resource
  IF v_is_trial THEN
    IF v_optimization_count >= 1 AND NOT p_force THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'reason', 'trial_limit_reached',
        'message', 'Ce contenu a déjà été optimisé pendant votre période d''essai. Passez à un plan payant pour ré-optimiser.',
        'count', v_optimization_count
      );
    END IF;
  ELSIF v_is_paid THEN
    -- Paid users: check monthly limits
    SELECT COALESCE(optimizations_count, 0) INTO v_usage_count
    FROM usage_tracking
    WHERE seller_id = p_user_id
      AND month = DATE_TRUNC('month', CURRENT_DATE);
    
    -- Get plan limits
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
    
    -- Allow re-optimization with force flag for paid users
    IF v_optimization_count >= 1 AND NOT p_force THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'reason', 'already_optimized',
        'message', 'Ce contenu a déjà été optimisé. Utilisez le paramètre force pour ré-optimiser.',
        'count', v_optimization_count,
        'last_optimized_at', v_last_optimization
      );
    END IF;
  ELSE
    -- Inactive subscription
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'no_active_subscription',
      'message', 'Aucun abonnement actif. Veuillez souscrire à un plan.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'is_trial', v_is_trial,
    'is_paid', v_is_paid,
    'current_count', v_optimization_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_seller_month ON usage_tracking(seller_id, month);
CREATE INDEX IF NOT EXISTS idx_product_images_optimization ON product_images(optimization_count, last_optimization_at);
CREATE INDEX IF NOT EXISTS idx_blog_articles_optimization ON blog_articles(optimization_count, last_optimization_at);
CREATE INDEX IF NOT EXISTS idx_shopify_pages_optimization ON shopify_pages(optimization_count, last_optimization_at);