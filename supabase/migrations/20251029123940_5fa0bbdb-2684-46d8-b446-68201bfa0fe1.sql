-- Corriger les limites trial du plan Starter à 10 produits
UPDATE subscription_plans
SET 
  trial_max_products = 10,
  trial_max_optimizations = 10,
  updated_at = now()
WHERE id = 'starter';

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN subscription_plans.trial_max_products IS 'Nombre maximum de produits importables pendant la période d''essai';