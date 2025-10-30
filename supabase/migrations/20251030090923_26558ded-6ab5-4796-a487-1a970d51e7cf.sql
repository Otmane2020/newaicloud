-- Désactiver le plan pay-as-you-go
UPDATE subscription_plans SET is_active = false WHERE id = 'pay-as-you-go';

-- Créer les nouveaux plans Pro avec paliers progressifs
INSERT INTO subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  max_products, max_optimizations_monthly, max_articles_monthly, 
  max_chat_responses_monthly, max_shopify_stores, max_campaigns,
  trial_days, is_active, display_order
) VALUES
  ('pro-98', 'Pro 98', 'Pour les boutiques en croissance', 98, 940.80, 'price_pro_98_monthly', 'price_pro_98_yearly', 5000, 500, 10, 1000, 2, 5, 14, true, 2),
  ('pro-196', 'Pro 196', 'Pour les boutiques en expansion', 196, 1881.60, 'price_pro_196_monthly', 'price_pro_196_yearly', 10000, 1000, 20, 2000, 4, 10, 14, true, 3),
  ('pro-392', 'Pro 392', 'Pour les boutiques avancées', 392, 3763.20, 'price_pro_392_monthly', 'price_pro_392_yearly', 20000, 2000, 40, 4000, 8, 20, 14, true, 4),
  ('pro-784', 'Pro 784', 'Pour les boutiques professionnelles', 784, 7526.40, 'price_pro_784_monthly', 'price_pro_784_yearly', 40000, 4000, 80, 8000, 16, 40, 14, true, 5),
  ('pro-1568', 'Pro 1568', 'Pour les grandes boutiques', 1568, 15052.80, 'price_pro_1568_monthly', 'price_pro_1568_yearly', 80000, 8000, 160, 16000, 32, 80, 14, true, 6),
  ('pro-3136', 'Pro 3136', 'Pour les très grandes boutiques', 3136, 30105.60, 'price_pro_3136_monthly', 'price_pro_3136_yearly', 160000, 16000, 320, 32000, 64, 160, 14, true, 7),
  ('pro-4900', 'Pro 4900', 'Pour les boutiques enterprise', 4900, 47040, 'price_pro_4900_monthly', 'price_pro_4900_yearly', 320000, 32000, 640, 64000, 128, 320, 14, true, 8);

-- Mettre à jour le plan enterprise existant et créer les nouveaux paliers
UPDATE subscription_plans 
SET 
  id = 'enterprise-199',
  display_order = 9
WHERE id = 'enterprise';

-- Créer les nouveaux plans Enterprise avec paliers progressifs
INSERT INTO subscription_plans (
  id, name, description,
  price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_chat_responses_monthly, max_shopify_stores, max_campaigns,
  trial_days, is_active, display_order, recommended, best_value
) VALUES
  ('enterprise-398', 'Enterprise 398', 'Pour les opérations avancées', 398, 3820.80, 'price_enterprise_398_monthly', 'price_enterprise_398_yearly', 200000, 10000, 200, 20000, 20, 100, 14, true, 10, false, false),
  ('enterprise-796', 'Enterprise 796', 'Pour les grandes opérations', 796, 7641.60, 'price_enterprise_796_monthly', 'price_enterprise_796_yearly', 400000, 20000, 400, 40000, 40, 200, 14, true, 11, false, false),
  ('enterprise-1592', 'Enterprise 1592', 'Pour les opérations massives', 1592, 15283.20, 'price_enterprise_1592_monthly', 'price_enterprise_1592_yearly', 800000, 40000, 800, 80000, 80, 400, 14, true, 12, false, false),
  ('enterprise-3184', 'Enterprise 3184', 'Pour les très grandes opérations', 3184, 30566.40, 'price_enterprise_3184_monthly', 'price_enterprise_3184_yearly', 1600000, 80000, 1600, 160000, 160, 800, 14, true, 13, false, false),
  ('enterprise-6368', 'Enterprise 6368', 'Pour les opérations globales', 6368, 61132.80, 'price_enterprise_6368_monthly', 'price_enterprise_6368_yearly', 3200000, 160000, 3200, 320000, 320, 1600, 14, true, 14, false, false),
  ('enterprise-12736', 'Enterprise 12736', 'Pour les opérations internationales', 12736, 122265.60, 'price_enterprise_12736_monthly', 'price_enterprise_12736_yearly', 6400000, 320000, 6400, 640000, 640, 3200, 14, true, 15, false, false),
  ('enterprise-19900', 'Enterprise 19900', 'Pour les opérations mondiales', 19900, 191040, 'price_enterprise_19900_monthly', 'price_enterprise_19900_yearly', 12800000, 640000, 12800, 1280000, 1280, 6400, 14, true, 16, false, true);