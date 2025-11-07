-- Étape 1: Supprimer l'ancienne contrainte unique sur shopify_id
ALTER TABLE public.shopify_products 
DROP CONSTRAINT IF EXISTS shopify_products_shopify_id_key;

-- Étape 2: Ajouter une nouvelle contrainte unique composite (shopify_id, seller_id)
-- Cela permet à plusieurs utilisateurs d'avoir leurs propres enregistrements pour le même produit Shopify
ALTER TABLE public.shopify_products 
ADD CONSTRAINT shopify_products_shopify_id_seller_id_key 
UNIQUE (shopify_id, seller_id);

-- Étape 3: Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_shopify_products_shopify_id_seller_id 
ON public.shopify_products (shopify_id, seller_id);