-- Mettre à jour les IDs de prix Stripe pour les nouveaux plans Pro
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxX3Efti9t9nN90Je78cod',
  stripe_price_id_yearly = 'price_1SNxX5Efti9t9nN9ln5IkVxl',
  updated_at = now()
WHERE id = 'pro-98';

UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxX7Efti9t9nN9mWwa8wdJ',
  stripe_price_id_yearly = 'price_1SNxX8Efti9t9nN9n5i2Xpzw',
  updated_at = now()
WHERE id = 'pro-196';

UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxX9Efti9t9nN9vWBegkUR',
  stripe_price_id_yearly = 'price_1SNxX9Efti9t9nN9wKobbD6D',
  updated_at = now()
WHERE id = 'pro-392';