-- Retirer l'essai gratuit des plans Professional et Enterprise
-- Seul le plan Starter doit avoir un essai gratuit de 14 jours
UPDATE subscription_plans 
SET trial_days = 0,
    updated_at = now()
WHERE id IN ('professional', 'enterprise');