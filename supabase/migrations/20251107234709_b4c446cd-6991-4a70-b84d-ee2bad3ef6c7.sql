-- Clean up and recreate subscription plans

-- Step 1: Remove all FK references
UPDATE profiles SET current_plan_id = NULL WHERE TRUE;
DELETE FROM subscriptions;

-- Step 2: Delete all existing plans
DELETE FROM subscription_plans;

-- Step 3: Insert new clean plans with EUR/USD support

-- Starter Plan
INSERT INTO subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  price_monthly_eur, price_yearly_eur,
  stripe_price_id_monthly, stripe_price_id_yearly,
  stripe_price_id_monthly_eur, stripe_price_id_yearly_eur,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_chat_responses_monthly, max_shopify_stores, max_shopify_requests_monthly,
  max_campaigns, display_order, is_active
) VALUES (
  'starter', 'Starter', 'Perfect for small businesses',
  49.00, 470.40,
  49.00, 470.40,
  'price_1SQzLOEfti9t9nN9gvOwgvjM',
  'price_1SQzLQEfti9t9nN9H5g18481',
  'price_1SQzLNEfti9t9nN9tr0wrPtf',
  'price_1SQzLPEfti9t9nN9AdI5S5Pg',
  50, 100, 5, 100, 1, 50, 0, 1, true
);

-- Pro 100 Plan
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
  79.00, 758.40,
  79.00, 758.40,
  'price_1SQzLTEfti9t9nN9nRoggl0p',
  'price_1SQzLVEfti9t9nN9ZDAGtjdF',
  'price_1SQzLSEfti9t9nN91wLNLcN8',
  'price_1SQzLUEfti9t9nN9VFQo0wlf',
  100, 200, 10, 200, 2, 100, 1, 2, true, true
);

-- Pro 500 Plan
INSERT INTO subscription_plans (
  id, name, description,
  price_monthly, price_yearly,
  price_monthly_eur, price_yearly_eur,
  stripe_price_id_monthly, stripe_price_id_yearly,
  stripe_price_id_monthly_eur, stripe_price_id_yearly_eur,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_chat_responses_monthly, max_shopify_stores, max_shopify_requests_monthly,
  max_campaigns, display_order, is_active
) VALUES (
  'pro-500', 'Pro 500', 'For scaling businesses',
  156.00, 1497.60,
  156.00, 1497.60,
  'price_1SQzLcEfti9t9nN9KG19ZxPm',
  'price_1SQzLfEfti9t9nN9cEZtwNmF',
  'price_1SQzLcEfti9t9nN95sxeJaIb',
  'price_1SQzLdEfti9t9nN9qcEYRGfh',
  500, 1000, 25, 500, 3, 250, 3, 3, true
);

-- Enterprise 2000 Plan
INSERT INTO subscription_plans (
  id, name, description,
  price_monthly, price_yearly,
  price_monthly_eur, price_yearly_eur,
  stripe_price_id_monthly, stripe_price_id_yearly,
  stripe_price_id_monthly_eur, stripe_price_id_yearly_eur,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_chat_responses_monthly, max_shopify_stores, max_shopify_requests_monthly,
  max_campaigns, display_order, is_active, best_value
) VALUES (
  'enterprise-2000', 'Enterprise 2000', 'For large stores',
  318.00, 3052.80,
  318.00, 3052.80,
  'price_1SQzLhEfti9t9nN99cN4EBjR',
  'price_1SQzLjEfti9t9nN9tXQSjFWP',
  'price_1SQzLgEfti9t9nN9HNdq2yat',
  'price_1SQzLiEfti9t9nN9w21VsnpG',
  2000, 4000, 50, 1000, 5, 500, 10, 4, true, true
);

-- Step 4: Set all users to starter trial
UPDATE profiles
SET current_plan_id = 'starter',
    subscription_status = 'trialing',
    trial_ends_at = NOW() + INTERVAL '7 days'
WHERE TRUE;