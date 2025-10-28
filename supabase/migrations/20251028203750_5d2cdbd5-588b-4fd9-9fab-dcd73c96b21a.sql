-- Mettre à jour les limites du plan trial
UPDATE subscription_plans
SET 
  trial_max_products = 10,
  trial_max_articles = 1,
  max_campaigns = 0,
  trial_max_optimizations = 999999, -- Illimité en pratique
  trial_max_chat_responses = 50,
  trial_max_shopify_requests = 20
WHERE id = 'trial';

-- Ajouter une colonne pour tracker les produits déjà optimisés
ALTER TABLE shopify_products
ADD COLUMN IF NOT EXISTS optimization_count INTEGER DEFAULT 0;