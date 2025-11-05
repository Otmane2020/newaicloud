-- Ajouter la colonne public_domain dans shopify_connections
ALTER TABLE shopify_connections 
ADD COLUMN IF NOT EXISTS public_domain TEXT;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN shopify_connections.public_domain IS 
'Domaine personnalisé récupéré automatiquement depuis Shopify (ex: decora-home.fr)';

-- Fonction pour synchroniser le domaine vers merchant_feed_settings
CREATE OR REPLACE FUNCTION sync_public_domain_to_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Si public_domain existe, le copier dans merchant_feed_settings
  IF NEW.public_domain IS NOT NULL THEN
    -- Créer ou mettre à jour merchant_feed_settings
    INSERT INTO merchant_feed_settings (
      user_id,
      feed_domain,
      store_name
    ) VALUES (
      NEW.user_id,
      NEW.public_domain,
      NEW.store_name
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      feed_domain = NEW.public_domain,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS sync_domain_on_connection_update ON shopify_connections;
CREATE TRIGGER sync_domain_on_connection_update
  AFTER INSERT OR UPDATE OF public_domain ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION sync_public_domain_to_feed();