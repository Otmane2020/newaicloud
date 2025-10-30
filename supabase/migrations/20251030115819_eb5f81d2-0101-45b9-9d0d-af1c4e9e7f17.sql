-- Remove trial period from all Pro and Enterprise plans
UPDATE subscription_plans
SET trial_days = 0
WHERE id IN (
  'professional', 'pro-98', 'pro-196', 'pro-392', 'pro-784', 'pro-1568', 'pro-3136', 'pro-4900',
  'enterprise-199', 'enterprise-398', 'enterprise-796', 'enterprise-1592', 'enterprise-3184', 'enterprise-6368', 'enterprise-12736', 'enterprise-19900'
);