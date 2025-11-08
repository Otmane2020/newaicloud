-- Phase 1: Tables de sécurité anti-fraude
CREATE TABLE IF NOT EXISTS public.trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_ip inet,
  device_fingerprint text,
  trial_started_at timestamptz DEFAULT now(),
  trial_ended_at timestamptz,
  converted_to_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_email ON public.trial_history(email);
CREATE INDEX IF NOT EXISTS idx_trial_ip ON public.trial_history(signup_ip);
CREATE INDEX IF NOT EXISTS idx_trial_user ON public.trial_history(user_id);

-- Phase 2: Table des transitions de plan autorisées
CREATE TABLE IF NOT EXISTS public.plan_transitions (
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  requires_payment boolean DEFAULT true,
  allows_proration boolean DEFAULT true,
  max_changes_per_month integer DEFAULT 1,
  PRIMARY KEY (from_plan, to_plan)
);

-- Définir les transitions autorisées
INSERT INTO public.plan_transitions (from_plan, to_plan, requires_payment, allows_proration, max_changes_per_month) VALUES
('trial', 'starter', true, false, 999),
('trial', 'professional', true, false, 999),
('trial', 'enterprise', true, false, 999),
('starter', 'professional', true, true, 2),
('starter', 'enterprise', true, true, 2),
('professional', 'enterprise', true, true, 2),
('professional', 'starter', false, true, 1),
('enterprise', 'professional', false, true, 1),
('enterprise', 'starter', false, true, 1)
ON CONFLICT (from_plan, to_plan) DO NOTHING;

-- Phase 3: Table pour tracker les changements de plan
CREATE TABLE IF NOT EXISTS public.plan_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'initial')),
  stripe_subscription_id text,
  proration_amount numeric,
  changed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_change_user ON public.plan_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_date ON public.plan_change_history(changed_at);

-- Phase 4: Ajouter signup_ip à profiles pour tracking anti-fraude
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_ip inet;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- Phase 5: RLS policies pour trial_history
ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial history"
ON public.trial_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert trial history"
ON public.trial_history FOR INSERT
WITH CHECK (true);

-- Phase 6: RLS policies pour plan_transitions (lecture publique pour validation)
ALTER TABLE public.plan_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan transitions"
ON public.plan_transitions FOR SELECT
USING (true);

-- Phase 7: RLS policies pour plan_change_history
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan changes"
ON public.plan_change_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert plan changes"
ON public.plan_change_history FOR INSERT
WITH CHECK (true);

-- Phase 8: Fonction pour vérifier les tentatives de fraude
CREATE OR REPLACE FUNCTION public.check_trial_abuse(p_email text, p_ip inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_count integer;
  v_ip_count integer;
  v_recent_trials integer;
BEGIN
  -- Compter les trials pour cet email
  SELECT COUNT(*) INTO v_email_count
  FROM trial_history
  WHERE email = p_email;
  
  -- Compter les trials pour cette IP
  SELECT COUNT(*) INTO v_ip_count
  FROM trial_history
  WHERE signup_ip = p_ip;
  
  -- Compter les trials récents (dernières 24h)
  SELECT COUNT(*) INTO v_recent_trials
  FROM trial_history
  WHERE signup_ip = p_ip
    AND trial_started_at > now() - interval '24 hours';
  
  -- Retourner le résultat
  RETURN jsonb_build_object(
    'allowed', v_email_count = 0 AND v_ip_count < 3 AND v_recent_trials < 2,
    'email_count', v_email_count,
    'ip_count', v_ip_count,
    'recent_trials', v_recent_trials,
    'reason', CASE
      WHEN v_email_count > 0 THEN 'email_already_used'
      WHEN v_ip_count >= 3 THEN 'ip_limit_exceeded'
      WHEN v_recent_trials >= 2 THEN 'too_many_recent_trials'
      ELSE 'allowed'
    END
  );
END;
$$;