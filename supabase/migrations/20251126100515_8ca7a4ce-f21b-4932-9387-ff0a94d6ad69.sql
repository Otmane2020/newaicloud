-- Corriger le trial_days du plan Starter
UPDATE subscription_plans
SET trial_days = 0, updated_at = NOW()
WHERE id = 'starter';

-- Réinitialiser tous les profils utilisateurs avec des abonnements actifs
UPDATE profiles
SET 
  subscription_status = 'inactive',
  stripe_customer_id = NULL,
  current_plan_id = NULL,
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE subscription_status IN ('active', 'trialing', 'past_due');