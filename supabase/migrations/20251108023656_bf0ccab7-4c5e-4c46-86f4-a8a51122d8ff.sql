-- Update Pro plans with x2 progression logic starting from 49€
-- Pro 500 (Base): 49€
UPDATE subscription_plans 
SET 
  max_products = 1000,
  max_optimizations_monthly = 500,
  max_articles_monthly = 10,
  max_campaigns = 3,
  max_chat_responses_monthly = 500,
  max_shopify_stores = 3
WHERE id = 'pro-500';

-- Pro 1000 (x2): 98€
UPDATE subscription_plans 
SET 
  max_products = 2000,
  max_optimizations_monthly = 1000,
  max_articles_monthly = 20,
  max_campaigns = 6,
  max_chat_responses_monthly = 1000,
  max_shopify_stores = 6
WHERE id = 'pro-1000';

-- Pro 2000 (x2 again): 196€
UPDATE subscription_plans 
SET 
  max_products = 4000,
  max_optimizations_monthly = 2000,
  max_articles_monthly = 40,
  max_campaigns = 12,
  max_chat_responses_monthly = 2000,
  max_shopify_stores = 12
WHERE id = 'pro-2000';

-- Pro 4000 (x2): 392€
UPDATE subscription_plans 
SET 
  max_products = 8000,
  max_optimizations_monthly = 4000,
  max_articles_monthly = 80,
  max_campaigns = 24,
  max_chat_responses_monthly = 4000,
  max_shopify_stores = 24
WHERE id = 'pro-4000';

-- Update Enterprise plans - Products unlimited (999999999), other limits follow x2 pattern
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 2000,
  max_articles_monthly = 100,
  max_campaigns = 10,
  max_chat_responses_monthly = 2000
WHERE id LIKE 'enterprise-%';