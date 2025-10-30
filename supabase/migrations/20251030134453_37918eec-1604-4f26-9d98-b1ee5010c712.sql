-- Update trial limits for unlimited optimizations (1 per product)
UPDATE subscription_plans
SET 
  trial_max_optimizations = 999999,
  trial_max_products = 10,
  trial_max_articles = 1,
  updated_at = now()
WHERE id IN ('trial', 'starter');

-- Also update paid plans to have consistent structure
UPDATE subscription_plans
SET 
  max_optimizations_monthly = 999999,
  max_products = 100
WHERE id = 'starter' AND max_optimizations_monthly < 999999;

UPDATE subscription_plans
SET 
  max_optimizations_monthly = 999999,
  max_products = 500
WHERE id = 'pro' AND max_optimizations_monthly < 999999;

UPDATE subscription_plans
SET 
  max_optimizations_monthly = 999999,
  max_products = 2000
WHERE id = 'enterprise' AND max_optimizations_monthly < 999999;