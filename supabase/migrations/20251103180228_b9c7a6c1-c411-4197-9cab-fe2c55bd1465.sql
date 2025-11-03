-- Ajouter cost_price dans product_variants (car Shopify stocke le cost par variant via InventoryItem)
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC;

-- Ajouter cost_price dans shopify_products (pour affichage rapide, sera la moyenne des variants)
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_variants_cost_price ON product_variants(cost_price) WHERE cost_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_products_cost_price ON shopify_products(cost_price) WHERE cost_price IS NOT NULL;