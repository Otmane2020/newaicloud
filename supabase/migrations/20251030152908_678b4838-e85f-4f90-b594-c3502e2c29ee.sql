-- Corriger le plan Starter: 100 optimisations/mois seulement
UPDATE subscription_plans
SET 
  max_optimizations_monthly = 100,
  updated_at = now()
WHERE id = 'starter';