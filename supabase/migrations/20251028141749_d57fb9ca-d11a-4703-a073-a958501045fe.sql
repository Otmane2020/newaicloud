-- Corriger les limites du plan Trial
UPDATE subscription_plans 
SET 
  max_optimizations_monthly = 50,
  max_articles_monthly = 1,
  max_chat_responses_monthly = 20,
  max_shopify_requests_monthly = 10,
  max_campaigns = 0,
  max_shopify_stores = 1,
  max_products = 50
WHERE id = 'trial';

-- Corriger les limites du plan Starter
UPDATE subscription_plans 
SET 
  max_optimizations_monthly = 100,
  max_articles_monthly = 1,
  max_chat_responses_monthly = 50,
  max_shopify_requests_monthly = 20,
  max_campaigns = 0,
  max_shopify_stores = 1,
  max_products = 100
WHERE id = 'starter';

-- Corriger les limites du plan Pro (professional)
UPDATE subscription_plans 
SET 
  max_optimizations_monthly = 500,
  max_articles_monthly = 5,
  max_campaigns = 3,
  max_chat_responses_monthly = 500,
  max_shopify_requests_monthly = 300,
  max_shopify_stores = 2,
  max_products = 1000
WHERE id = 'professional';

-- Corriger les limites du plan Enterprise
UPDATE subscription_plans 
SET 
  max_optimizations_monthly = 2000,
  max_articles_monthly = 20,
  max_campaigns = 10,
  max_chat_responses_monthly = 3000,
  max_shopify_requests_monthly = 2000,
  max_shopify_stores = 5,
  max_products = -1
WHERE id = 'enterprise';