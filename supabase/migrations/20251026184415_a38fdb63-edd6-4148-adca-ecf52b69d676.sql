-- Mettre à jour les Price IDs Stripe dans les plans d'abonnement
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SM6FaEfti9t9nN9vuYjXX0Z',
  stripe_price_id_yearly = 'price_1SM6FlEfti9t9nN9yzfwWjVH',
  updated_at = NOW()
WHERE id = 'starter';

UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SM6FxEfti9t9nN9IixfZqkl',
  stripe_price_id_yearly = 'price_1SM6G8Efti9t9nN91k4LTEE8',
  updated_at = NOW()
WHERE id = 'professional';

UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SM6GSEfti9t9nN9McUJQu0O',
  stripe_price_id_yearly = 'price_1SM6H0Efti9t9nN9TNEhFYJ9',
  updated_at = NOW()
WHERE id = 'enterprise';