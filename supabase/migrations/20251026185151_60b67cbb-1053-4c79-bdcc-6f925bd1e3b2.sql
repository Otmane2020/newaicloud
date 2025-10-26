-- Mettre à jour les Price IDs Stripe avec les nouveaux produits créés
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SMZ1uEfti9t9nN9Yqu9AQ2d',
  stripe_price_id_yearly = 'price_1SMZ23Efti9t9nN97fW22h4N',
  updated_at = NOW()
WHERE id = 'starter';

UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SMZ24Efti9t9nN9iSpucdhL',
  stripe_price_id_yearly = 'price_1SMZ25Efti9t9nN9gbH9g6z2',
  updated_at = NOW()
WHERE id = 'professional';

UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_1SMZ26Efti9t9nN90Y7c4CQt',
  stripe_price_id_yearly = 'price_1SMZ27Efti9t9nN990x8DDcQ',
  updated_at = NOW()
WHERE id = 'enterprise';