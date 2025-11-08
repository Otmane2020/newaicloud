-- Réactiver tous les plans
UPDATE subscription_plans
SET is_active = true
WHERE id IN ('pro-1000', 'pro-2000', 'pro-4000', 'pro-8000', 'pro-16000', 'pro-32000', 'pro-50000', 
             'enterprise-4000', 'enterprise-8000', 'enterprise-16000', 'enterprise-32000', 'enterprise-64000', 'enterprise-128000', 'enterprise-200000');