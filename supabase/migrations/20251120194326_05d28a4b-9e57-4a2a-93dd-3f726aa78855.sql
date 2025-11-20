-- Modifier le type de la colonne specs_confidence pour accepter les valeurs 0-100
ALTER TABLE shopify_products 
ALTER COLUMN specs_confidence TYPE INTEGER 
USING ROUND(specs_confidence)::INTEGER;

-- Ajouter une contrainte pour s'assurer que la valeur reste entre 0 et 100
ALTER TABLE shopify_products 
ADD CONSTRAINT specs_confidence_range 
CHECK (specs_confidence IS NULL OR (specs_confidence >= 0 AND specs_confidence <= 100));