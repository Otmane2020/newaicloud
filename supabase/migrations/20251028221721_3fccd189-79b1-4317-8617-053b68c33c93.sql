-- Corriger les limites du plan Trial
UPDATE subscription_plans
SET
  max_products = 10,
  max_optimizations_monthly = 10,
  trial_max_products = 10,
  trial_max_optimizations = 10,
  updated_at = now()
WHERE id = 'trial';

-- S'assurer que optimization_count existe et est initialisé à 0
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0;

UPDATE shopify_products
SET optimization_count = 0
WHERE optimization_count IS NULL;