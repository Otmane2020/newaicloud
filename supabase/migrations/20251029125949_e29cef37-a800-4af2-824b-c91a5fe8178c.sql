-- Ajouter 14 jours d'essai gratuit aux plans Professional et Enterprise
UPDATE subscription_plans 
SET trial_days = 14,
    updated_at = now()
WHERE id IN ('professional', 'enterprise');