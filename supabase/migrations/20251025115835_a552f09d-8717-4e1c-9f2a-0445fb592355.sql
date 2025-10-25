-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  max_products INTEGER NOT NULL DEFAULT 0,
  max_optimizations_monthly INTEGER NOT NULL DEFAULT 0,
  max_articles_monthly INTEGER NOT NULL DEFAULT 0,
  max_campaigns INTEGER NOT NULL DEFAULT 0,
  max_chat_responses_monthly INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 14,
  popular BOOLEAN DEFAULT false,
  best_value BOOLEAN DEFAULT false,
  recommended BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Add subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_plan_id TEXT REFERENCES public.subscription_plans(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- RLS Policies for subscription_plans (public readable)
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (
  id, name, description, price_monthly, price_yearly,
  max_products, max_optimizations_monthly, max_articles_monthly,
  max_campaigns, max_chat_responses_monthly,
  features, trial_days, popular, best_value, display_order
) VALUES
(
  'starter',
  'Starter',
  'Parfait pour les petites boutiques qui débutent avec l''IA',
  49.00, 470.00,
  500, 1000, 10, 3, 500,
  '{"analytics": "Basique", "support": "Email", "api": false, "backup": false, "support_chat": true, "support_phone": false}'::jsonb,
  14, false, false, 1
),
(
  'professional',
  'Professional',
  'Idéal pour les e-commerces en croissance avec un volume important',
  99.00, 950.00,
  5000, 10000, 50, 10, 5000,
  '{"analytics": "Avancé", "support": "Prioritaire", "api": true, "backup": true, "support_chat": true, "support_phone": true, "dedicated_manager": false, "custom_training": true, "sla": true}'::jsonb,
  14, true, true, 2
),
(
  'enterprise',
  'Enterprise',
  'Solution complète pour les grandes entreprises et marketplaces',
  299.00, 2870.00,
  -1, -1, -1, -1, -1,
  '{"analytics": "Entreprise", "support": "Dédié 24/7", "api": true, "backup": true, "support_chat": true, "support_phone": true, "dedicated_manager": true, "custom_training": true, "sla": true, "full_api": true}'::jsonb,
  14, false, false, 3
);

-- Trigger for subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();