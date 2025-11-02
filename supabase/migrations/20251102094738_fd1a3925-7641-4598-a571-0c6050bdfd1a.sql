-- Mettre à jour les limites d'optimisation du plan trial à 50
UPDATE subscription_plans
SET 
  trial_max_optimizations = 50,
  max_optimizations_monthly = 50
WHERE id = 'trial';