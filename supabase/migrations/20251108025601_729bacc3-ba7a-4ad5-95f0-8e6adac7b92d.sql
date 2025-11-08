-- Mise à jour complète des Price IDs Stripe pour tous les plans (68 Price IDs au total)

-- 1. STARTER
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzd0Efti9t9nN9tivsk56C',
  stripe_price_id_monthly_eur = 'price_1SQzd1Efti9t9nN9RqReUH5x',
  stripe_price_id_yearly = 'price_1SQzd2Efti9t9nN9hBwQVvNw',
  stripe_price_id_yearly_eur = 'price_1SQzd3Efti9t9nN9QRQZP3h2'
WHERE id = 'starter';

-- 2. PRO 500
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzd5Efti9t9nN9bJWXzvaz',
  stripe_price_id_monthly_eur = 'price_1SQzd5Efti9t9nN9nVmwkanI',
  stripe_price_id_yearly = 'price_1SQzdCEfti9t9nN9iwN3vRGp',
  stripe_price_id_yearly_eur = 'price_1SQzdDEfti9t9nN97eXF7we0'
WHERE id = 'pro-500';

-- 3. PRO 1000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzdEEfti9t9nN96kKE7f9k',
  stripe_price_id_monthly_eur = 'price_1SQzdFEfti9t9nN9jTtoBmgw',
  stripe_price_id_yearly = 'price_1SQzfKEfti9t9nN9sMhCF6Y9',
  stripe_price_id_yearly_eur = 'price_1SQzfLEfti9t9nN98XYcKn6L'
WHERE id = 'pro-1000';

-- 4. PRO 2000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzdkEfti9t9nN93BVAC3Yo',
  stripe_price_id_monthly_eur = 'price_1SQzdlEfti9t9nN9R6CLDItr',
  stripe_price_id_yearly = 'price_1SQzfMEfti9t9nN9KAuj9GOF',
  stripe_price_id_yearly_eur = 'price_1SQzfNEfti9t9nN9csNlypnf'
WHERE id = 'pro-2000';

-- 5. PRO 4000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzdnEfti9t9nN9nojYEVtl',
  stripe_price_id_monthly_eur = 'price_1SQzdnEfti9t9nN9bxBcTCXE',
  stripe_price_id_yearly = 'price_1SQzfOEfti9t9nN9om1Li4zh',
  stripe_price_id_yearly_eur = 'price_1SQzfPEfti9t9nN9JNonqYrW'
WHERE id = 'pro-4000';

-- 6. PRO 8000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzfVEfti9t9nN9DWelf18q',
  stripe_price_id_monthly_eur = 'price_1SQzfXEfti9t9nN9DnNVFNtB',
  stripe_price_id_yearly = 'price_1SQzfYEfti9t9nN9y4sqzXla',
  stripe_price_id_yearly_eur = 'price_1SQzfZEfti9t9nN9kwKPwoU4'
WHERE id = 'pro-8000';

-- 7. PRO 16000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzfaEfti9t9nN9oRnbYUST',
  stripe_price_id_monthly_eur = 'price_1SQzfbEfti9t9nN9SkFOkVcc',
  stripe_price_id_yearly = 'price_1SQzfhEfti9t9nN9T9F55VQk',
  stripe_price_id_yearly_eur = 'price_1SQzfiEfti9t9nN99p4BjoKI'
WHERE id = 'pro-16000';

-- 8. PRO 32000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzfjEfti9t9nN9CcfqAxhX',
  stripe_price_id_monthly_eur = 'price_1SQzfkEfti9t9nN9Q1y438At',
  stripe_price_id_yearly = 'price_1SQzflEfti9t9nN9571XzhIc',
  stripe_price_id_yearly_eur = 'price_1SQzfmEfti9t9nN9yw1OJlxy'
WHERE id = 'pro-32000';

-- 9. PRO 50000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzfsEfti9t9nN9gQfsmh2U',
  stripe_price_id_monthly_eur = 'price_1SQzftEfti9t9nN9bGd0VoLU',
  stripe_price_id_yearly = 'price_1SQzfvEfti9t9nN97KtVAEon',
  stripe_price_id_yearly_eur = 'price_1SQzfwEfti9t9nN9LJobUSP0'
WHERE id = 'pro-50000';

-- 10. ENTERPRISE 2000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzdGEfti9t9nN9AlizZy3r',
  stripe_price_id_monthly_eur = 'price_1SQzdHEfti9t9nN9OIj6TJJg',
  stripe_price_id_yearly = 'price_1SQzdPEfti9t9nN9Hqmav6Po',
  stripe_price_id_yearly_eur = 'price_1SQzdQEfti9t9nN9Kxo0Y1GG'
WHERE id = 'enterprise-2000';

-- 11. ENTERPRISE 4000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzdoEfti9t9nN9BZ70WkPv',
  stripe_price_id_monthly_eur = 'price_1SQzdpEfti9t9nN9WJiqehmh',
  stripe_price_id_yearly = 'price_1SQzfxEfti9t9nN9uO1AOYYL',
  stripe_price_id_yearly_eur = 'price_1SQzfyEfti9t9nN9rKqdQWVH'
WHERE id = 'enterprise-4000';

-- 12. ENTERPRISE 8000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzg5Efti9t9nN9tPc35aQB',
  stripe_price_id_monthly_eur = 'price_1SQzg6Efti9t9nN9zzqwZIr5',
  stripe_price_id_yearly = 'price_1SQzg7Efti9t9nN9qr4SFWxb',
  stripe_price_id_yearly_eur = 'price_1SQzg8Efti9t9nN9sPphDggr'
WHERE id = 'enterprise-8000';

-- 13. ENTERPRISE 16000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzg9Efti9t9nN9Qdbb53gq',
  stripe_price_id_monthly_eur = 'price_1SQzgAEfti9t9nN9ZiXkqOX7',
  stripe_price_id_yearly = 'price_1SQzgHEfti9t9nN9rl4qMduk',
  stripe_price_id_yearly_eur = 'price_1SQzgIEfti9t9nN9Z6WXKdo0'
WHERE id = 'enterprise-16000';

-- 14. ENTERPRISE 32000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzgJEfti9t9nN9vmgb7hB2',
  stripe_price_id_monthly_eur = 'price_1SQzgKEfti9t9nN9n6HMozJc',
  stripe_price_id_yearly = 'price_1SQzgMEfti9t9nN9AqQs5j8b',
  stripe_price_id_yearly_eur = 'price_1SQzgMEfti9t9nN9AeLLbBZx'
WHERE id = 'enterprise-32000';

-- 15. ENTERPRISE 64000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzgTEfti9t9nN9TnSIEdL5',
  stripe_price_id_monthly_eur = 'price_1SQzgUEfti9t9nN9jCFGG26f',
  stripe_price_id_yearly = 'price_1SQzgVEfti9t9nN9of0CVhGZ',
  stripe_price_id_yearly_eur = 'price_1SQzgWEfti9t9nN90Uklzfyd'
WHERE id = 'enterprise-64000';

-- 16. ENTERPRISE 128000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzgXEfti9t9nN9geHFKeZe',
  stripe_price_id_monthly_eur = 'price_1SQzgYEfti9t9nN9SPlcePke',
  stripe_price_id_yearly = 'price_1SQzgeEfti9t9nN9bUehQNhk',
  stripe_price_id_yearly_eur = 'price_1SQzgfEfti9t9nN9udiuag6o'
WHERE id = 'enterprise-128000';

-- 17. ENTERPRISE 200000
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SQzggEfti9t9nN9kQVIQihT',
  stripe_price_id_monthly_eur = 'price_1SQzghEfti9t9nN93MDea17m',
  stripe_price_id_yearly = 'price_1SQzgiEfti9t9nN9IWsBRYhN',
  stripe_price_id_yearly_eur = 'price_1SQzgjEfti9t9nN98kQICatB'
WHERE id = 'enterprise-200000';