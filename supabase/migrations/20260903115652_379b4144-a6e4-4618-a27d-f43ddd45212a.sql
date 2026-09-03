ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 50;
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 50;

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  stripe_product_id text,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_packages TO authenticated;
GRANT ALL ON public.credit_packages TO service_role;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active credit packages" ON public.credit_packages;
CREATE POLICY "Authenticated users can read active credit packages"
  ON public.credit_packages FOR SELECT TO authenticated USING (active = true);

INSERT INTO public.credit_packages (id, name, credits, amount_cents, currency, active, sort_order)
VALUES
  ('credits_100', '100 crédits', 100, 499, 'eur', true, 10),
  ('credits_300', '300 crédits', 300, 999, 'eur', true, 20),
  ('credits_1000', '1 000 crédits', 1000, 2499, 'eur', true, 30)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, credits = EXCLUDED.credits, amount_cents = EXCLUDED.amount_cents,
  currency = EXCLUDED.currency, active = EXCLUDED.active, sort_order = EXCLUDED.sort_order, updated_at = now();

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  type text NOT NULL,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their credit history" ON public.credit_transactions;
CREATE POLICY "Users can read their credit history"
  ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_reference_id_key
  ON public.credit_transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx
  ON public.credit_transactions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_credit_transaction(
  p_user_id uuid, p_amount integer, p_type text,
  p_reference_id text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current integer; v_new integer;
BEGIN
  IF p_amount = 0 THEN RAISE EXCEPTION 'Credit transaction amount cannot be zero'; END IF;
  SELECT COALESCE(credits, 0) INTO v_current FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p_reference_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.credit_transactions WHERE reference_id = p_reference_id) THEN
    RETURN v_current;
  END IF;
  v_new := v_current + p_amount;
  IF v_new < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, reference_id, metadata)
  VALUES (p_user_id, p_amount, v_new, p_type, p_reference_id, COALESCE(p_metadata, '{}'::jsonb));
  RETURN v_new;
END; $$;

REVOKE ALL ON FUNCTION public.apply_credit_transaction(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_credit_transaction(uuid, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.apply_credit_transaction(uuid, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_transaction(uuid, integer, text, text, jsonb) TO service_role;

UPDATE public.profiles SET credits = 30000, updated_at = now()
WHERE lower(email) = 'oben.rockman@gmail.com';