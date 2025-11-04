-- 1. Correction immédiate : Recalculer products_count pour tous les utilisateurs
UPDATE usage_tracking 
SET products_count = (
  SELECT COUNT(*) 
  FROM shopify_products 
  WHERE seller_id = usage_tracking.seller_id
),
updated_at = NOW()
WHERE month >= date_trunc('month', CURRENT_DATE);

-- 2. Trigger de synchronisation : Décrémenter products_count lors de la suppression d'un produit
CREATE OR REPLACE FUNCTION sync_products_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Décrémenter le compteur de produits pour le mois en cours et futurs
  UPDATE usage_tracking
  SET products_count = GREATEST(0, products_count - 1),
      updated_at = NOW()
  WHERE seller_id = OLD.seller_id
  AND month >= date_trunc('month', CURRENT_DATE);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_sync_products_count ON shopify_products;

-- Créer le trigger
CREATE TRIGGER trigger_sync_products_count
AFTER DELETE ON shopify_products
FOR EACH ROW
EXECUTE FUNCTION sync_products_count_on_delete();

-- 3. Fonction de réinitialisation mensuelle automatique
CREATE OR REPLACE FUNCTION reset_monthly_usage_counters()
RETURNS void AS $$
BEGIN
  -- Réinitialiser UNIQUEMENT les compteurs mensuels (pas products_count ni shopify_stores_count)
  UPDATE usage_tracking
  SET 
    optimizations_count = 0,
    articles_count = 0,
    chat_responses_count = 0,
    shopify_requests_count = 0,
    updated_at = NOW()
  WHERE month < date_trunc('month', CURRENT_DATE);
  
  -- Créer les entrées pour le nouveau mois si elles n'existent pas
  INSERT INTO usage_tracking (seller_id, month, products_count, shopify_stores_count, optimizations_count, articles_count, chat_responses_count, shopify_requests_count)
  SELECT 
    p.id as seller_id,
    date_trunc('month', CURRENT_DATE) as month,
    COALESCE((SELECT COUNT(*) FROM shopify_products WHERE seller_id = p.id), 0) as products_count,
    COALESCE((SELECT COUNT(*) FROM shopify_connections WHERE user_id = p.id), 0) as shopify_stores_count,
    0 as optimizations_count,
    0 as articles_count,
    0 as chat_responses_count,
    0 as shopify_requests_count
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM usage_tracking ut
    WHERE ut.seller_id = p.id
    AND ut.month = date_trunc('month', CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;