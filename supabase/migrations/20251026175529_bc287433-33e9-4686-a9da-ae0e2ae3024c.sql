-- Update subscription plans with new pricing and limits
DELETE FROM subscription_plans;

-- Insert Starter plan
INSERT INTO subscription_plans (
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  max_products,
  max_optimizations_monthly,
  max_articles_monthly,
  max_chat_responses_monthly,
  max_campaigns,
  trial_days,
  is_active,
  display_order,
  popular,
  features
) VALUES (
  'starter',
  'Starter',
  'Pour les petites boutiques qui veulent découvrir la puissance de l''IA',
  9.99,
  95.88,
  'price_starter_monthly',
  'price_starter_yearly',
  1000,
  1000,
  5,
  200,
  0,
  14,
  true,
  1,
  false,
  jsonb_build_object(
    'shops_limit', 1,
    'shopify_requests_limit', 100,
    'google_merchant', false,
    'automation', true,
    'support', 'E-mail prioritaire',
    'trial_limits', jsonb_build_object(
      'products_limit', 50,
      'seo_optimizations_limit', 300,
      'articles_limit', 1,
      'shopify_requests_limit', 20,
      'chat_limit', 50
    )
  )
);

-- Insert Pro plan
INSERT INTO subscription_plans (
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  max_products,
  max_optimizations_monthly,
  max_articles_monthly,
  max_chat_responses_monthly,
  max_campaigns,
  trial_days,
  is_active,
  display_order,
  popular,
  recommended,
  features
) VALUES (
  'pro',
  'Pro',
  'Pour les boutiques en croissance',
  49,
  468,
  'price_pro_monthly',
  'price_pro_yearly',
  999999,
  2000,
  10,
  1000,
  5,
  14,
  true,
  2,
  true,
  true,
  jsonb_build_object(
    'shops_limit', 3,
    'shopify_requests_limit', 500,
    'google_merchant', true,
    'automation', true,
    'support', '24/7 prioritaire'
  )
);

-- Insert Enterprise plan
INSERT INTO subscription_plans (
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  max_products,
  max_optimizations_monthly,
  max_articles_monthly,
  max_chat_responses_monthly,
  max_campaigns,
  trial_days,
  is_active,
  display_order,
  best_value,
  features
) VALUES (
  'enterprise',
  'Enterprise',
  'Pour les grandes boutiques et agences',
  199,
  1908,
  'price_enterprise_monthly',
  'price_enterprise_yearly',
  999999,
  10000,
  100,
  10000,
  20,
  14,
  true,
  3,
  true,
  jsonb_build_object(
    'shops_limit', 10,
    'shopify_requests_limit', 5000,
    'google_merchant', true,
    'automation', true,
    'support', 'Account manager dédié',
    'api_access', true,
    'training', true,
    'sla', true
  )
);