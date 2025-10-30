-- Corriger les optimisations mensuelles pour tous les plans
UPDATE subscription_plans SET max_optimizations_monthly = 999999 WHERE id = 'trial';
UPDATE subscription_plans SET max_optimizations_monthly = 1000 WHERE id = 'pro-98';
UPDATE subscription_plans SET max_optimizations_monthly = 2000 WHERE id = 'pro-196';
UPDATE subscription_plans SET max_optimizations_monthly = 4000 WHERE id = 'pro-392';
UPDATE subscription_plans SET max_optimizations_monthly = 8000 WHERE id = 'pro-784';
UPDATE subscription_plans SET max_optimizations_monthly = 16000 WHERE id = 'pro-1568';
UPDATE subscription_plans SET max_optimizations_monthly = 32000 WHERE id = 'pro-3136';
UPDATE subscription_plans SET max_optimizations_monthly = 50000 WHERE id = 'pro-4900';
UPDATE subscription_plans SET max_optimizations_monthly = 4000 WHERE id = 'enterprise-398';
UPDATE subscription_plans SET max_optimizations_monthly = 8000 WHERE id = 'enterprise-796';
UPDATE subscription_plans SET max_optimizations_monthly = 16000 WHERE id = 'enterprise-1592';
UPDATE subscription_plans SET max_optimizations_monthly = 32000 WHERE id = 'enterprise-3184';
UPDATE subscription_plans SET max_optimizations_monthly = 64000 WHERE id = 'enterprise-6368';
UPDATE subscription_plans SET max_optimizations_monthly = 128000 WHERE id = 'enterprise-12736';
UPDATE subscription_plans SET max_optimizations_monthly = 200000 WHERE id = 'enterprise-19900';

-- Corriger les produits pour tous les plans Enterprise (unlimited)
UPDATE subscription_plans SET max_products = -1 WHERE id IN (
  'enterprise-398', 'enterprise-796', 'enterprise-1592', 'enterprise-3184',
  'enterprise-6368', 'enterprise-12736', 'enterprise-19900'
);

-- Corriger les produits pour les plans Pro selon le CSV
UPDATE subscription_plans SET max_products = 1000 WHERE id = 'professional';
UPDATE subscription_plans SET max_products = 2000 WHERE id = 'pro-98';
UPDATE subscription_plans SET max_products = 4000 WHERE id = 'pro-196';
UPDATE subscription_plans SET max_products = 8000 WHERE id = 'pro-392';
UPDATE subscription_plans SET max_products = 16000 WHERE id = 'pro-784';
UPDATE subscription_plans SET max_products = 32000 WHERE id = 'pro-1568';
UPDATE subscription_plans SET max_products = 64000 WHERE id = 'pro-3136';
UPDATE subscription_plans SET max_products = 100000 WHERE id = 'pro-4900';

-- Corriger les prix annuels selon le CSV
UPDATE subscription_plans SET price_yearly = 468.19 WHERE id = 'professional';
UPDATE subscription_plans SET price_yearly = 936.39 WHERE id = 'pro-98';
UPDATE subscription_plans SET price_yearly = 1872.78 WHERE id = 'pro-196';
UPDATE subscription_plans SET price_yearly = 3745.56 WHERE id = 'pro-392';
UPDATE subscription_plans SET price_yearly = 7491.12 WHERE id = 'pro-784';
UPDATE subscription_plans SET price_yearly = 14982.24 WHERE id = 'pro-1568';
UPDATE subscription_plans SET price_yearly = 29964.48 WHERE id = 'pro-3136';
UPDATE subscription_plans SET price_yearly = 46819.50 WHERE id = 'pro-4900';
UPDATE subscription_plans SET price_yearly = 1908.01 WHERE id = 'enterprise-199';
UPDATE subscription_plans SET price_yearly = 3816.02 WHERE id = 'enterprise-398';
UPDATE subscription_plans SET price_yearly = 7632.05 WHERE id = 'enterprise-796';
UPDATE subscription_plans SET price_yearly = 15264.10 WHERE id = 'enterprise-1592';
UPDATE subscription_plans SET price_yearly = 30528.19 WHERE id = 'enterprise-3184';
UPDATE subscription_plans SET price_yearly = 61056.38 WHERE id = 'enterprise-6368';
UPDATE subscription_plans SET price_yearly = 122112.77 WHERE id = 'enterprise-12736';
UPDATE subscription_plans SET price_yearly = 190801.20 WHERE id = 'enterprise-19900';