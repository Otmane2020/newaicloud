-- Table pour l'historique des variations de compteurs
CREATE TABLE IF NOT EXISTS public.usage_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  field_name TEXT NOT NULL,
  old_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  operation TEXT NOT NULL, -- 'increment', 'decrement', 'manual_update'
  trigger_source TEXT, -- 'product_insert', 'product_delete', 'store_delete', 'manual', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes de l'audit
CREATE INDEX idx_usage_history_seller_month ON public.usage_tracking_history(seller_id, month DESC);
CREATE INDEX idx_usage_history_field ON public.usage_tracking_history(field_name);
CREATE INDEX idx_usage_history_created ON public.usage_tracking_history(created_at DESC);

-- RLS policies pour usage_tracking_history
ALTER TABLE public.usage_tracking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage history"
  ON public.usage_tracking_history
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Service role can insert usage history"
  ON public.usage_tracking_history
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour enregistrer les changements dans usage_tracking
CREATE OR REPLACE FUNCTION public.log_usage_tracking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log only if values actually changed
  IF OLD.products_count != NEW.products_count THEN
    INSERT INTO public.usage_tracking_history (
      seller_id, month, field_name, old_value, new_value, delta, operation, trigger_source
    ) VALUES (
      NEW.seller_id, 
      NEW.month, 
      'products_count',
      OLD.products_count,
      NEW.products_count,
      NEW.products_count - OLD.products_count,
      CASE 
        WHEN NEW.products_count > OLD.products_count THEN 'increment'
        WHEN NEW.products_count < OLD.products_count THEN 'decrement'
        ELSE 'no_change'
      END,
      'usage_tracking_update'
    );
  END IF;

  IF OLD.shopify_stores_count != NEW.shopify_stores_count THEN
    INSERT INTO public.usage_tracking_history (
      seller_id, month, field_name, old_value, new_value, delta, operation, trigger_source
    ) VALUES (
      NEW.seller_id,
      NEW.month,
      'shopify_stores_count',
      OLD.shopify_stores_count,
      NEW.shopify_stores_count,
      NEW.shopify_stores_count - OLD.shopify_stores_count,
      CASE 
        WHEN NEW.shopify_stores_count > OLD.shopify_stores_count THEN 'increment'
        WHEN NEW.shopify_stores_count < OLD.shopify_stores_count THEN 'decrement'
        ELSE 'no_change'
      END,
      'usage_tracking_update'
    );
  END IF;

  IF OLD.optimizations_count != NEW.optimizations_count THEN
    INSERT INTO public.usage_tracking_history (
      seller_id, month, field_name, old_value, new_value, delta, operation, trigger_source
    ) VALUES (
      NEW.seller_id,
      NEW.month,
      'optimizations_count',
      OLD.optimizations_count,
      NEW.optimizations_count,
      NEW.optimizations_count - OLD.optimizations_count,
      CASE 
        WHEN NEW.optimizations_count > OLD.optimizations_count THEN 'increment'
        WHEN NEW.optimizations_count < OLD.optimizations_count THEN 'decrement'
        ELSE 'no_change'
      END,
      'usage_tracking_update'
    );
  END IF;

  IF OLD.articles_count != NEW.articles_count THEN
    INSERT INTO public.usage_tracking_history (
      seller_id, month, field_name, old_value, new_value, delta, operation, trigger_source
    ) VALUES (
      NEW.seller_id,
      NEW.month,
      'articles_count',
      OLD.articles_count,
      NEW.articles_count,
      NEW.articles_count - OLD.articles_count,
      CASE 
        WHEN NEW.articles_count > OLD.articles_count THEN 'increment'
        WHEN NEW.articles_count < OLD.articles_count THEN 'decrement'
        ELSE 'no_change'
      END,
      'usage_tracking_update'
    );
  END IF;

  IF OLD.chat_responses_count != NEW.chat_responses_count THEN
    INSERT INTO public.usage_tracking_history (
      seller_id, month, field_name, old_value, new_value, delta, operation, trigger_source
    ) VALUES (
      NEW.seller_id,
      NEW.month,
      'chat_responses_count',
      OLD.chat_responses_count,
      NEW.chat_responses_count,
      NEW.chat_responses_count - OLD.chat_responses_count,
      CASE 
        WHEN NEW.chat_responses_count > OLD.chat_responses_count THEN 'increment'
        WHEN NEW.chat_responses_count < OLD.chat_responses_count THEN 'decrement'
        ELSE 'no_change'
      END,
      'usage_tracking_update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour enregistrer les changements
DROP TRIGGER IF EXISTS trigger_log_usage_tracking_changes ON public.usage_tracking;
CREATE TRIGGER trigger_log_usage_tracking_changes
  AFTER UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.log_usage_tracking_change();

-- Fonction pour détecter les anomalies dans les compteurs
CREATE OR REPLACE FUNCTION public.detect_usage_anomalies(
  p_user_id UUID,
  p_threshold INTEGER DEFAULT 50
)
RETURNS TABLE (
  field_name TEXT,
  anomaly_type TEXT,
  description TEXT,
  current_value INTEGER,
  expected_value INTEGER,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH current_usage AS (
    SELECT 
      ut.seller_id,
      ut.products_count,
      ut.shopify_stores_count,
      ut.optimizations_count
    FROM public.usage_tracking ut
    WHERE ut.seller_id = p_user_id
      AND ut.month = DATE_TRUNC('month', CURRENT_DATE)
  ),
  actual_counts AS (
    SELECT
      (SELECT COUNT(*) FROM public.shopify_products WHERE seller_id = p_user_id) as actual_products,
      (SELECT COUNT(*) FROM public.shopify_connections WHERE user_id = p_user_id) as actual_stores
  )
  SELECT 
    'products_count'::TEXT as field_name,
    'count_mismatch'::TEXT as anomaly_type,
    format('Compteur produits: %s vs réalité: %s (delta: %s)', 
      cu.products_count, ac.actual_products, abs(cu.products_count - ac.actual_products))::TEXT as description,
    cu.products_count as current_value,
    ac.actual_products as expected_value,
    CASE 
      WHEN abs(cu.products_count - ac.actual_products) > p_threshold THEN 'high'::TEXT
      WHEN abs(cu.products_count - ac.actual_products) > p_threshold/2 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END as severity
  FROM current_usage cu, actual_counts ac
  WHERE abs(cu.products_count - ac.actual_products) > 0
  
  UNION ALL
  
  SELECT 
    'shopify_stores_count'::TEXT as field_name,
    'count_mismatch'::TEXT as anomaly_type,
    format('Compteur boutiques: %s vs réalité: %s (delta: %s)', 
      cu.shopify_stores_count, ac.actual_stores, abs(cu.shopify_stores_count - ac.actual_stores))::TEXT as description,
    cu.shopify_stores_count as current_value,
    ac.actual_stores as expected_value,
    CASE 
      WHEN abs(cu.shopify_stores_count - ac.actual_stores) > 0 THEN 'high'::TEXT
      ELSE 'low'::TEXT
    END as severity
  FROM current_usage cu, actual_counts ac
  WHERE abs(cu.shopify_stores_count - ac.actual_stores) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour nettoyer les données orphelines
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS TABLE (
  cleanup_type TEXT,
  items_cleaned INTEGER,
  details JSONB
) AS $$
DECLARE
  v_orphaned_products INTEGER;
  v_orphaned_images INTEGER;
  v_orphaned_variants INTEGER;
  v_orphaned_content_images INTEGER;
BEGIN
  -- 1. Supprimer les produits sans store_id et sans seller_id valide
  WITH deleted_products AS (
    DELETE FROM public.shopify_products
    WHERE (store_id IS NULL AND seller_id NOT IN (SELECT id FROM auth.users))
       OR (store_id IS NOT NULL AND store_id NOT IN (SELECT id FROM public.shopify_connections))
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_products FROM deleted_products;

  -- 2. Supprimer les images de produits sans produit parent
  WITH deleted_images AS (
    DELETE FROM public.product_images
    WHERE product_id NOT IN (SELECT id FROM public.shopify_products)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_images FROM deleted_images;

  -- 3. Supprimer les variantes de produits sans produit parent
  WITH deleted_variants AS (
    DELETE FROM public.product_variants
    WHERE product_id NOT IN (SELECT id FROM public.shopify_products)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_variants FROM deleted_variants;

  -- 4. Supprimer les content_images sans contenu parent
  WITH deleted_content_images AS (
    DELETE FROM public.content_images
    WHERE (content_type = 'article' AND content_id NOT IN (SELECT id FROM public.blog_articles))
       OR (content_type = 'page' AND content_id NOT IN (SELECT id FROM public.shopify_pages))
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_content_images FROM deleted_content_images;

  -- Retourner les résultats
  RETURN QUERY SELECT 
    'orphaned_products'::TEXT, 
    v_orphaned_products,
    jsonb_build_object('description', 'Produits sans boutique ou utilisateur valide')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_images'::TEXT, 
    v_orphaned_images,
    jsonb_build_object('description', 'Images sans produit parent')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_variants'::TEXT, 
    v_orphaned_variants,
    jsonb_build_object('description', 'Variantes sans produit parent')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_content_images'::TEXT, 
    v_orphaned_content_images,
    jsonb_build_object('description', 'Images de contenu sans parent')::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;