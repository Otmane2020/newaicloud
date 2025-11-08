-- Supprimer le trial pour tous les plans Pro et Enterprise
-- Seuls les plans Trial et Starter doivent avoir un trial

UPDATE subscription_plans 
SET trial_days = 0
WHERE name IN ('Pro', 'Enterprise')
AND is_active = true;