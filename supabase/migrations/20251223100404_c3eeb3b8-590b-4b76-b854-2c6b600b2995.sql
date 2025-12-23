-- Ajouter import_count pour tracker les imports Shopify (combien de fois l'image a été vue lors des syncs)
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS import_count integer DEFAULT 0;

-- Ajouter shopify_media_id pour tracker l'ID du média créé sur Shopify après export IA
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS shopify_media_id text;

-- Mettre à jour import_count à 1 pour toutes les images Shopify existantes
UPDATE product_images 
SET import_count = 1 
WHERE source = 'shopify' AND (import_count IS NULL OR import_count = 0);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_product_images_shopify_media_id ON product_images(shopify_media_id) WHERE shopify_media_id IS NOT NULL;