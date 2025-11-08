-- Update plan limits to follow x2 progression

-- Starter: base values
UPDATE subscription_plans
SET 
  max_articles_monthly = 5,
  max_campaigns = 0,
  max_chat_responses_monthly = 100
WHERE id = 'starter';

-- Pro 100: x2 progression (98€/mois)
UPDATE subscription_plans
SET 
  price_monthly = 98.00,
  price_yearly = 940.80,
  price_monthly_eur = 98.00,
  price_yearly_eur = 940.80,
  max_products = 100,
  max_optimizations_monthly = 200,
  max_articles_monthly = 10,
  max_campaigns = 6,
  max_chat_responses_monthly = 200,
  max_shopify_stores = 2
WHERE id = 'pro-100';

-- Pro 500: x5 from starter
UPDATE subscription_plans
SET 
  price_monthly = 196.00,
  price_yearly = 1881.60,
  price_monthly_eur = 196.00,
  price_yearly_eur = 1881.60,
  max_products = 500,
  max_optimizations_monthly = 1000,
  max_articles_monthly = 25,
  max_campaigns = 12,
  max_chat_responses_monthly = 500,
  max_shopify_stores = 3
WHERE id = 'pro-500';

-- Enterprise 2000: x20 from starter
UPDATE subscription_plans
SET 
  price_monthly = 392.00,
  price_yearly = 3763.20,
  price_monthly_eur = 392.00,
  price_yearly_eur = 3763.20,
  max_products = 2000,
  max_optimizations_monthly = 4000,
  max_articles_monthly = 100,
  max_campaigns = 24,
  max_chat_responses_monthly = 2000,
  max_shopify_stores = 5
WHERE id = 'enterprise-2000';