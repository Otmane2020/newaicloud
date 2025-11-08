-- Désactiver tous les anciens plans sauf ceux que nous voulons garder
UPDATE subscription_plans
SET is_active = false
WHERE id NOT IN ('trial', 'starter', 'pro-100', 'pro-500', 'enterprise-2000');

-- Corriger le plan Starter
UPDATE subscription_plans
SET 
  price_monthly = 49.00,
  price_yearly = 470.40,
  price_monthly_eur = 49.00,
  price_yearly_eur = 470.40,
  max_products = 50,
  max_optimizations_monthly = 100,
  max_articles_monthly = 5,
  max_campaigns = 0,
  max_chat_responses_monthly = 100,
  max_shopify_stores = 1,
  display_order = 1
WHERE id = 'starter';

-- S'assurer que pro-100 existe avec les bonnes valeurs
INSERT INTO subscription_plans (
  id, name, description,
  price_monthly, price_yearly,
  price_monthly_eur, price_yearly_eur,
  stripe_price_id_monthly, stripe_price_id_yearly,
  stripe_price_id_monthly_eur, stripe_price_id_yearly_eur,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_chat_responses_monthly, max_shopify_stores, max_shopify_requests_monthly,
  max_campaigns, display_order, is_active, popular
) VALUES (
  'pro-100', 'Pro 100', 'For growing businesses',
  98.00, 940.80,
  98.00, 940.80,
  'price_1SQzLTEfti9t9nN9nRoggl0p',
  'price_1SQzLVEfti9t9nN9ZDAGtjdF',
  'price_1SQzLSEfti9t9nN91wLNLcN8',
  'price_1SQzLUEfti9t9nN9VFQo0wlf',
  100, 200, 10, 200, 2, 100, 6, 2, true, true
)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = 98.00,
  price_yearly = 940.80,
  price_monthly_eur = 98.00,
  price_yearly_eur = 940.80,
  max_products = 100,
  max_optimizations_monthly = 200,
  max_articles_monthly = 10,
  max_campaigns = 6,
  max_chat_responses_monthly = 200,
  max_shopify_stores = 2,
  display_order = 2,
  is_active = true,
  popular = true;