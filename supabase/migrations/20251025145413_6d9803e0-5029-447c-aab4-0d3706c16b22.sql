-- Insert subscription plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, max_products, max_optimizations_monthly, max_chat_responses_monthly, max_articles_monthly, max_campaigns, display_order, recommended, features) VALUES
('starter', 'Starter', 'Parfait pour démarrer', 29, 290, 100, 50, 100, 5, 1, 1, false, '["SEO de base", "100 produits", "50 optimisations/mois", "Support email"]'::jsonb),
('professional', 'Professional', 'Pour boutiques en croissance', 79, 790, 500, 200, 500, 20, 5, 2, true, '["SEO avancé", "500 produits", "200 optimisations/mois", "Chat smart illimité", "20 articles/mois", "Support prioritaire"]'::jsonb),
('enterprise', 'Enterprise', 'Pour grandes boutiques', 199, 1990, -1, -1, -1, -1, -1, 3, false, '["Tout illimité", "Produits illimités", "Optimisations illimitées", "Articles illimités", "Campagnes illimitées", "Support dédié 24/7"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_products = EXCLUDED.max_products,
  max_optimizations_monthly = EXCLUDED.max_optimizations_monthly,
  max_chat_responses_monthly = EXCLUDED.max_chat_responses_monthly,
  max_articles_monthly = EXCLUDED.max_articles_monthly,
  max_campaigns = EXCLUDED.max_campaigns,
  display_order = EXCLUDED.display_order,
  recommended = EXCLUDED.recommended,
  features = EXCLUDED.features;