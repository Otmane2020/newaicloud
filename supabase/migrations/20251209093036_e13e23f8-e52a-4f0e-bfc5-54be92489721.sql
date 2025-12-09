-- Add trial-specific limits columns to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS trial_max_optimizations INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_max_articles INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_max_products INTEGER DEFAULT NULL;

-- Update Starter plan with trial limits (7-day trial = 30 optimizations, 1 article, 20 products)
UPDATE subscription_plans 
SET 
  trial_max_optimizations = 30,
  trial_max_articles = 1,
  trial_max_products = 20
WHERE id = 'starter';

-- Ensure other paid plans have NULL trial limits (full access immediately)
UPDATE subscription_plans 
SET 
  trial_max_optimizations = NULL,
  trial_max_articles = NULL,
  trial_max_products = NULL
WHERE id IN ('pro-500', 'pro-1000', 'enterprise');