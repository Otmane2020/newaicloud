-- Ajouter colonne is_ai_generated pour distinguer images IA vs images Shopify
ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Marquer les images existantes sans shopify_image_id comme générées par IA
UPDATE product_images 
SET is_ai_generated = true 
WHERE shopify_image_id IS NULL;

-- Marquer les images avec optimization_count > 0 comme IA (même si elles ont un shopify_image_id)
UPDATE product_images 
SET is_ai_generated = true 
WHERE optimization_count > 0;

-- Index pour optimiser les requêtes d'export
CREATE INDEX IF NOT EXISTS idx_product_images_ai_export 
ON product_images (product_id, is_ai_generated, shopify_sync_count) 
WHERE is_ai_generated = true;

-- Créer une contrainte unique pour éviter les doublons d'import
-- Note: on utilise un index unique partiel car shopify_image_id peut être NULL pour les images IA
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_shopify 
ON product_images (product_id, shopify_image_id) 
WHERE shopify_image_id IS NOT NULL;