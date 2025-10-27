-- Add trial limit columns to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS trial_max_optimizations INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS trial_max_articles INTEGER DEFAULT 1;

-- Update the Starter plan with trial limits
UPDATE subscription_plans
SET 
  trial_max_optimizations = 10,
  trial_max_articles = 1,
  trial_max_chat_responses = 50,
  trial_max_products = 50,
  trial_max_shopify_requests = 20
WHERE id = 'starter';

-- Update other plans to have higher trial limits if needed
UPDATE subscription_plans
SET 
  trial_max_optimizations = 50,
  trial_max_articles = 2
WHERE id = 'pro';

UPDATE subscription_plans
SET 
  trial_max_optimizations = 100,
  trial_max_articles = 5
WHERE id = 'enterprise';