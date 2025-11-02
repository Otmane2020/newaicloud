-- Ajouter une colonne pour compter les produits dans chaque collection
ALTER TABLE shopify_collections 
ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0;

-- Fonction pour mettre à jour le compteur de produits d'une collection
CREATE OR REPLACE FUNCTION update_collection_products_count()
RETURNS TRIGGER AS $$
DECLARE
  collection_id_to_update UUID;
  affected_collection_ids UUID[];
BEGIN
  -- Collecter tous les IDs de collections affectés
  IF TG_OP = 'DELETE' THEN
    affected_collection_ids := OLD.collection_ids;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Union des anciennes et nouvelles collections
    affected_collection_ids := ARRAY(
      SELECT DISTINCT unnest(COALESCE(OLD.collection_ids, '{}') || COALESCE(NEW.collection_ids, '{}'))
    );
  ELSIF TG_OP = 'INSERT' THEN
    affected_collection_ids := NEW.collection_ids;
  END IF;

  -- Mettre à jour le compteur pour chaque collection affectée
  IF affected_collection_ids IS NOT NULL THEN
    FOREACH collection_id_to_update IN ARRAY affected_collection_ids
    LOOP
      UPDATE shopify_collections
      SET 
        products_count = (
          SELECT COUNT(*)
          FROM shopify_products
          WHERE collection_id_to_update = ANY(collection_ids)
            AND seller_id = shopify_collections.user_id
        ),
        updated_at = NOW()
      WHERE id = collection_id_to_update;
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur shopify_products
DROP TRIGGER IF EXISTS trigger_update_collection_products_count ON shopify_products;
CREATE TRIGGER trigger_update_collection_products_count
AFTER INSERT OR UPDATE OR DELETE ON shopify_products
FOR EACH ROW
EXECUTE FUNCTION update_collection_products_count();

-- Initialiser les compteurs pour les collections existantes
UPDATE shopify_collections c
SET products_count = (
  SELECT COUNT(*)
  FROM shopify_products p
  WHERE c.id = ANY(p.collection_ids)
    AND p.seller_id = c.user_id
);

-- Créer un index pour optimiser les requêtes sur collection_ids
CREATE INDEX IF NOT EXISTS idx_shopify_products_collection_ids 
ON shopify_products USING GIN (collection_ids);