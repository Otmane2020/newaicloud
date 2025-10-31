-- Ajouter les métadonnées de boutique pour améliorer la génération SEO et les contextes AI
ALTER TABLE shopify_connections 
ADD COLUMN IF NOT EXISTS store_label TEXT,
ADD COLUMN IF NOT EXISTS store_category TEXT,
ADD COLUMN IF NOT EXISTS store_phone TEXT,
ADD COLUMN IF NOT EXISTS store_address TEXT,
ADD COLUMN IF NOT EXISTS store_business_hours TEXT,
ADD COLUMN IF NOT EXISTS store_description TEXT;

COMMENT ON COLUMN shopify_connections.store_label IS 'Nom commercial de la boutique (ex: Sweet Deco)';
COMMENT ON COLUMN shopify_connections.store_category IS 'Secteur d''activité (ex: Décoration d''intérieur)';
COMMENT ON COLUMN shopify_connections.store_phone IS 'Numéro de téléphone de contact';
COMMENT ON COLUMN shopify_connections.store_address IS 'Adresse physique de la boutique';
COMMENT ON COLUMN shopify_connections.store_business_hours IS 'Horaires d''ouverture';
COMMENT ON COLUMN shopify_connections.store_description IS 'Description courte de la boutique pour le contexte AI';