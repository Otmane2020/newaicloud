-- Ajouter les colonnes manquantes à subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_shopify_requests_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_max_products INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_max_optimizations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_max_articles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_max_shopify_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_max_chat_responses INTEGER DEFAULT 0;

-- Ajouter les colonnes manquantes à usage_tracking
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS shopify_requests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaigns_count INTEGER DEFAULT 0;

-- Supprimer les anciens plans et recréer avec les bonnes données
DELETE FROM subscription_plans;

-- Recréer les plans avec les bonnes limites et IDs
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
  max_campaigns,
  max_chat_responses_monthly,
  max_shopify_requests_monthly,
  trial_days,
  trial_max_products,
  trial_max_optimizations,
  trial_max_articles,
  trial_max_shopify_requests,
  trial_max_chat_responses,
  is_active,
  display_order,
  popular,
  best_value,
  features
) VALUES 
(
  'starter',
  'Starter',
  'Pour les petites boutiques qui veulent découvrir la puissance de l''IA',
  9.99,
  95.88,
  'price_starter_monthly',
  'price_starter_yearly',
  100,  -- max 100 produits
  1000,
  5,
  0,  -- pas de campagnes
  200,
  100,
  14,  -- 14 jours d'essai
  50,  -- trial: 50 produits
  300, -- trial: 300 optimisations
  1,   -- trial: 1 article
  20,  -- trial: 20 recherches
  50,  -- trial: 50 réponses chat
  true,
  1,
  false,
  false,
  '{"support_email": true, "shopify_integration": true, "automation": true}'::jsonb
),
(
  'professional',
  'Pro',
  'Pour les boutiques en croissance',
  49,
  468,
  'price_pro_monthly',
  'price_pro_yearly',
  1000, -- max 1000 produits
  2000,
  10,
  5,
  1000,
  500,
  0,  -- pas d'essai pour Pro
  0,
  0,
  0,
  0,
  0,
  true,
  2,
  true,  -- Plus populaire
  false,
  '{"support_247": true, "google_merchant": true, "multi_shops": 3, "automation": true}'::jsonb
),
(
  'enterprise',
  'Enterprise',
  'Pour les grandes boutiques et agences',
  199,
  1908,
  'price_enterprise_monthly',
  'price_enterprise_yearly',
  -1,  -- illimité
  10000,
  100,
  20,
  10000,
  5000,
  0,  -- pas d'essai
  0,
  0,
  0,
  0,
  0,
  true,
  3,
  false,
  true,  -- Meilleur rapport
  '{"account_manager": true, "custom_api": true, "multi_shops": 10, "sla": true, "formation": true}'::jsonb
);