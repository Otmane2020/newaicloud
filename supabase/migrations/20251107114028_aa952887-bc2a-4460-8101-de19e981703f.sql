-- Créer les triggers manquants pour la gestion des compteurs

-- 1. Trigger pour la suppression de connexions Shopify
DROP TRIGGER IF EXISTS on_shopify_connection_delete ON shopify_connections;
CREATE TRIGGER on_shopify_connection_delete
  BEFORE DELETE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION delete_shopify_connection_cascade();

-- 2. Trigger pour la suppression de produits
DROP TRIGGER IF EXISTS on_shopify_product_delete ON shopify_products;
CREATE TRIGGER on_shopify_product_delete
  AFTER DELETE ON shopify_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_count_on_delete();

-- 3. Trigger pour l'ajout de produits (s'assurer qu'il existe)
DROP TRIGGER IF EXISTS sync_products_count_trigger ON shopify_products;
CREATE TRIGGER sync_products_count_trigger
  AFTER INSERT OR UPDATE ON shopify_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_products_count();

-- 4. Vérifier et corriger les compteurs actuels pour tous les utilisateurs
DO $$
DECLARE
  user_record RECORD;
  real_product_count INTEGER;
  real_store_count INTEGER;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT seller_id FROM shopify_products
    UNION
    SELECT DISTINCT user_id FROM shopify_connections
  LOOP
    -- Compter les produits réels
    SELECT COUNT(*) INTO real_product_count
    FROM shopify_products
    WHERE seller_id = user_record.seller_id;
    
    -- Compter les boutiques réelles
    SELECT COUNT(*) INTO real_store_count
    FROM shopify_connections
    WHERE user_id = user_record.seller_id;
    
    -- Corriger usage_tracking pour le mois en cours
    INSERT INTO usage_tracking (
      seller_id, 
      month, 
      products_count, 
      shopify_stores_count,
      optimizations_count,
      articles_count,
      chat_responses_count,
      shopify_requests_count
    )
    VALUES (
      user_record.seller_id,
      DATE_TRUNC('month', CURRENT_DATE),
      COALESCE(real_product_count, 0),
      COALESCE(real_store_count, 0),
      0,
      0,
      0,
      0
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
      products_count = COALESCE(real_product_count, 0),
      shopify_stores_count = COALESCE(real_store_count, 0),
      updated_at = NOW();
    
    RAISE NOTICE 'Corrected user % : products=%, stores=%', 
      user_record.seller_id, real_product_count, real_store_count;
  END LOOP;
END $$;