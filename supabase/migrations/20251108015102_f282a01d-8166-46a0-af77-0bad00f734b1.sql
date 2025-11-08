-- Désactiver tous les plans sauf ceux demandés
UPDATE subscription_plans SET is_active = false;

-- Corriger Starter avec le bon prix
UPDATE subscription_plans
SET 
  price_monthly_eur = 9.99,
  price_yearly_eur = 99.90,
  max_products = 100,
  max_optimizations_monthly = 100,
  max_articles_monthly = 10,
  max_campaigns = 0,
  max_chat_responses_monthly = 100,
  is_active = true,
  display_order = 1
WHERE id = 'starter';

-- Réactiver et corriger les plans Pro demandés
UPDATE subscription_plans
SET 
  price_monthly_eur = 49,
  price_yearly_eur = 490,
  max_products = 1000,
  max_optimizations_monthly = 500,
  max_articles_monthly = 10,
  max_campaigns = 3,
  max_chat_responses_monthly = 500,
  is_active = true,
  display_order = 2
WHERE id = 'pro-500';

UPDATE subscription_plans
SET 
  price_monthly_eur = 99,
  price_yearly_eur = 990,
  max_products = 2000,
  max_optimizations_monthly = 1000,
  max_articles_monthly = 20,
  max_campaigns = 10,
  max_chat_responses_monthly = 1000,
  is_active = true,
  display_order = 3
WHERE id = 'pro-1000';

UPDATE subscription_plans
SET 
  price_monthly_eur = 490,
  price_yearly_eur = 4900,
  max_products = 10000,
  max_optimizations_monthly = 5000,
  max_articles_monthly = 100,
  max_campaigns = 30,
  max_chat_responses_monthly = 5000,
  is_active = true,
  display_order = 4
WHERE id = 'pro-5000';

UPDATE subscription_plans
SET 
  price_monthly_eur = 4900,
  price_yearly_eur = 49000,
  max_products = 50000,
  max_optimizations_monthly = 50000,
  max_articles_monthly = 1000,
  max_campaigns = 300,
  max_chat_responses_monthly = 50000,
  is_active = true,
  display_order = 5
WHERE id = 'pro-50000';

-- Réactiver et corriger les plans Enterprise demandés
UPDATE subscription_plans
SET 
  price_monthly_eur = 199,
  price_yearly_eur = 1990,
  max_products = 100000,
  max_optimizations_monthly = 2000,
  max_articles_monthly = 100,
  max_campaigns = 10,
  max_chat_responses_monthly = 2000,
  is_active = true,
  display_order = 6
WHERE id = 'enterprise-2000';

UPDATE subscription_plans
SET 
  price_monthly_eur = 990,
  price_yearly_eur = 9900,
  max_products = 500000,
  max_optimizations_monthly = 10000,
  max_articles_monthly = 500,
  max_campaigns = 100,
  max_chat_responses_monthly = 10000,
  is_active = true,
  display_order = 7
WHERE id = 'enterprise-10000';

UPDATE subscription_plans
SET 
  price_monthly_eur = 19900,
  price_yearly_eur = 199000,
  max_products = 9999999,
  max_optimizations_monthly = 200000,
  max_articles_monthly = 10000,
  max_campaigns = 1000,
  max_chat_responses_monthly = 200000,
  is_active = true,
  display_order = 8
WHERE id = 'enterprise-200000';