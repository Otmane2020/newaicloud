-- Mettre à jour tous les plans avec les vrais IDs Stripe

-- Enterprise 398
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdWEfti9t9nN9VDCxz6S8',
  stripe_price_id_yearly = 'price_1SNxdXEfti9t9nN9mjanwhcE',
  updated_at = now()
WHERE id = 'enterprise-398';

-- Pro 784
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdZEfti9t9nN9LoIBBHYc',
  stripe_price_id_yearly = 'price_1SNxdaEfti9t9nN9u4AtbXPs',
  updated_at = now()
WHERE id = 'pro-784';

-- Enterprise 796
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdcEfti9t9nN9VnPXHyux',
  stripe_price_id_yearly = 'price_1SNxdeEfti9t9nN9tQUA6zsB',
  updated_at = now()
WHERE id = 'enterprise-796';

-- Pro 1568
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdfEfti9t9nN9yU6DbNNP',
  stripe_price_id_yearly = 'price_1SNxdoEfti9t9nN94HoZ7kw0',
  updated_at = now()
WHERE id = 'pro-1568';

-- Enterprise 1592
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdoEfti9t9nN9ni2kRZbG',
  stripe_price_id_yearly = 'price_1SNxdpEfti9t9nN9jJAOtg06',
  updated_at = now()
WHERE id = 'enterprise-1592';

-- Pro 3136
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdpEfti9t9nN99l7KVH7v',
  stripe_price_id_yearly = 'price_1SNxdqEfti9t9nN9lCCUN03S',
  updated_at = now()
WHERE id = 'pro-3136';

-- Enterprise 3184
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxdyEfti9t9nN9mriynCdM',
  stripe_price_id_yearly = 'price_1SNxdzEfti9t9nN9svNH9EFR',
  updated_at = now()
WHERE id = 'enterprise-3184';

-- Pro 4900
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxe1Efti9t9nN95sRqJepF',
  stripe_price_id_yearly = 'price_1SNxe2Efti9t9nN9HskZD9fG',
  updated_at = now()
WHERE id = 'pro-4900';

-- Enterprise 6368
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxe3Efti9t9nN9m1mQQjNq',
  stripe_price_id_yearly = 'price_1SNxe5Efti9t9nN9c3CaO3mm',
  updated_at = now()
WHERE id = 'enterprise-6368';

-- Enterprise 12736
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxeAEfti9t9nN99ihSwYPi',
  stripe_price_id_yearly = 'price_1SNxeAEfti9t9nN9soKJ6EOA',
  updated_at = now()
WHERE id = 'enterprise-12736';

-- Enterprise 19900
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SNxeAEfti9t9nN9RCuTFJxQ',
  stripe_price_id_yearly = 'price_1SNxeBEfti9t9nN9ZbuOQpaO',
  updated_at = now()
WHERE id = 'enterprise-19900';