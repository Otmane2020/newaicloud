-- Fonction pour incrémenter le compteur de boutiques Shopify
CREATE OR REPLACE FUNCTION increment_shopify_stores_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrémenter shopify_stores_count pour le mois actuel et tous les mois futurs
  UPDATE usage_tracking
  SET 
    shopify_stores_count = shopify_stores_count + 1,
    updated_at = now()
  WHERE seller_id = NEW.user_id
    AND month >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Si aucune ligne n'existe pour ce mois, en créer une
  IF NOT FOUND THEN
    INSERT INTO usage_tracking (
      seller_id,
      month,
      shopify_stores_count,
      products_count,
      optimizations_count,
      articles_count,
      chat_responses_count,
      shopify_requests_count
    )
    VALUES (
      NEW.user_id,
      DATE_TRUNC('month', CURRENT_DATE),
      1,
      0,
      0,
      0,
      0,
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour incrémenter lors de l'ajout d'une boutique
DROP TRIGGER IF EXISTS increment_shopify_stores_on_insert ON shopify_connections;
CREATE TRIGGER increment_shopify_stores_on_insert
  AFTER INSERT ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION increment_shopify_stores_count();

-- Trigger pour décrémenter lors de la suppression d'une boutique
DROP TRIGGER IF EXISTS decrement_shopify_stores_on_delete ON shopify_connections;
CREATE TRIGGER decrement_shopify_stores_on_delete
  AFTER DELETE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION decrement_shopify_stores_count();

-- Fonction pour recalculer et synchroniser le nombre réel de boutiques
CREATE OR REPLACE FUNCTION sync_shopify_stores_count(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usage_tracking ut
  SET 
    shopify_stores_count = (
      SELECT COUNT(*)::integer
      FROM shopify_connections sc
      WHERE sc.user_id = ut.seller_id
    ),
    updated_at = now()
  WHERE ut.month >= DATE_TRUNC('month', CURRENT_DATE)
    AND (p_user_id IS NULL OR ut.seller_id = p_user_id);
END;
$$;

-- Corriger toutes les données existantes
SELECT sync_shopify_stores_count();