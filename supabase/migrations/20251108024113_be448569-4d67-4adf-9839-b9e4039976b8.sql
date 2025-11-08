-- Update ALL Pro plans with consistent x2 logic based on optimization count
-- Pro 500 (base): already correct
-- Pro 1000 (x2): already correct  
-- Pro 2000 (x2): already correct
-- Pro 4000 (x2): already correct

-- Pro 8000 (x2 from 4000)
UPDATE subscription_plans 
SET 
  max_products = 16000,
  max_optimizations_monthly = 8000,
  max_articles_monthly = 160,
  max_campaigns = 48,
  max_chat_responses_monthly = 8000,
  max_shopify_stores = 48
WHERE id = 'pro-8000';

-- Pro 16000 (x2 from 8000)
UPDATE subscription_plans 
SET 
  max_products = 32000,
  max_optimizations_monthly = 16000,
  max_articles_monthly = 320,
  max_campaigns = 96,
  max_chat_responses_monthly = 16000,
  max_shopify_stores = 96
WHERE id = 'pro-16000';

-- Pro 32000 (x2 from 16000)
UPDATE subscription_plans 
SET 
  max_products = 64000,
  max_optimizations_monthly = 32000,
  max_articles_monthly = 640,
  max_campaigns = 192,
  max_chat_responses_monthly = 32000,
  max_shopify_stores = 192
WHERE id = 'pro-32000';

-- Pro 50000 (keep as special top tier)
UPDATE subscription_plans 
SET 
  max_products = 100000,
  max_optimizations_monthly = 50000,
  max_articles_monthly = 1000,
  max_campaigns = 300,
  max_chat_responses_monthly = 50000,
  max_shopify_stores = 300
WHERE id = 'pro-50000';

-- Update ALL Enterprise plans - Products unlimited, others follow x2 pattern
-- Enterprise 2000 (base): already correct with 2000 opt

-- Enterprise 4000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 4000,
  max_articles_monthly = 200,
  max_campaigns = 20,
  max_chat_responses_monthly = 4000,
  max_shopify_stores = 10
WHERE id = 'enterprise-4000';

-- Enterprise 8000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 8000,
  max_articles_monthly = 400,
  max_campaigns = 40,
  max_chat_responses_monthly = 8000,
  max_shopify_stores = 20
WHERE id = 'enterprise-8000';

-- Enterprise 16000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 16000,
  max_articles_monthly = 800,
  max_campaigns = 80,
  max_chat_responses_monthly = 16000,
  max_shopify_stores = 40
WHERE id = 'enterprise-16000';

-- Enterprise 32000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 32000,
  max_articles_monthly = 1600,
  max_campaigns = 160,
  max_chat_responses_monthly = 32000,
  max_shopify_stores = 80
WHERE id = 'enterprise-32000';

-- Enterprise 64000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 64000,
  max_articles_monthly = 3200,
  max_campaigns = 320,
  max_chat_responses_monthly = 64000,
  max_shopify_stores = 160
WHERE id = 'enterprise-64000';

-- Enterprise 128000 (x2)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 128000,
  max_articles_monthly = 6400,
  max_campaigns = 640,
  max_chat_responses_monthly = 128000,
  max_shopify_stores = 320
WHERE id = 'enterprise-128000';

-- Enterprise 200000 (top tier)
UPDATE subscription_plans 
SET 
  max_products = 999999999,
  max_optimizations_monthly = 200000,
  max_articles_monthly = 10000,
  max_campaigns = 1000,
  max_chat_responses_monthly = 200000,
  max_shopify_stores = 512
WHERE id = 'enterprise-200000';