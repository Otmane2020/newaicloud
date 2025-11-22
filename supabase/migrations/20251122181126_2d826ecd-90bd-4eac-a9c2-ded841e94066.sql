-- Étape 1 : Ajouter la colonne manquante last_landing_generation_at
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS last_landing_generation_at TIMESTAMP WITH TIME ZONE;

-- Étape 2 : Migrer les données de landing_page vers landing_page_html
UPDATE shopify_products 
SET landing_page_html = landing_page,
    last_landing_generation_at = updated_at
WHERE landing_page IS NOT NULL 
  AND (landing_page_html IS NULL OR landing_page_html = '');

-- Étape 3 : Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_shopify_products_last_landing_generation 
ON shopify_products(last_landing_generation_at);