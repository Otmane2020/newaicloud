-- ============================================
-- PHASE 2: TRIGGER AUTOMATIQUE PRODUCTS_COUNT
-- ============================================

-- Créer trigger pour synchroniser automatiquement products_count
CREATE OR REPLACE FUNCTION public.sync_products_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sur INSERT, incrémenter le compteur
  IF TG_OP = 'INSERT' THEN
    INSERT INTO usage_tracking (seller_id, month, products_count, optimizations_count, articles_count, chat_responses_count, shopify_stores_count)
    VALUES (
      NEW.seller_id,
      DATE_TRUNC('month', CURRENT_DATE),
      1,
      0,
      0,
      0,
      0
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
      products_count = usage_tracking.products_count + 1,
      updated_at = now();
    
    RETURN NEW;
  END IF;
  
  -- Sur UPDATE, si le seller_id change, décrémenter ancien et incrémenter nouveau
  IF TG_OP = 'UPDATE' AND OLD.seller_id != NEW.seller_id THEN
    -- Décrémenter ancien seller
    UPDATE usage_tracking
    SET products_count = GREATEST(0, products_count - 1),
        updated_at = now()
    WHERE seller_id = OLD.seller_id
      AND month = DATE_TRUNC('month', CURRENT_DATE);
    
    -- Incrémenter nouveau seller
    INSERT INTO usage_tracking (seller_id, month, products_count, optimizations_count, articles_count, chat_responses_count, shopify_stores_count)
    VALUES (
      NEW.seller_id,
      DATE_TRUNC('month', CURRENT_DATE),
      1,
      0,
      0,
      0,
      0
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
      products_count = usage_tracking.products_count + 1,
      updated_at = now();
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger sur shopify_products
DROP TRIGGER IF EXISTS trigger_sync_products_count ON public.shopify_products;
CREATE TRIGGER trigger_sync_products_count
AFTER INSERT OR UPDATE ON public.shopify_products
FOR EACH ROW
EXECUTE FUNCTION public.sync_products_count();

-- Script de correction pour recalculer products_count existants
DO $$
DECLARE
  user_record RECORD;
  product_count INTEGER;
BEGIN
  -- Pour chaque utilisateur
  FOR user_record IN 
    SELECT DISTINCT seller_id FROM shopify_products
  LOOP
    -- Compter les produits réels
    SELECT COUNT(*) INTO product_count
    FROM shopify_products
    WHERE seller_id = user_record.seller_id;
    
    -- Mettre à jour usage_tracking pour le mois courant
    INSERT INTO usage_tracking (seller_id, month, products_count, optimizations_count, articles_count, chat_responses_count, shopify_stores_count)
    VALUES (
      user_record.seller_id,
      DATE_TRUNC('month', CURRENT_DATE),
      product_count,
      0,
      0,
      0,
      0
    )
    ON CONFLICT (seller_id, month)
    DO UPDATE SET
      products_count = product_count,
      updated_at = now();
    
    RAISE NOTICE 'Corrected products_count for user % to %', user_record.seller_id, product_count;
  END LOOP;
END $$;