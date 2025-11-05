-- Corriger la fonction avec search_path sécurisé
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;