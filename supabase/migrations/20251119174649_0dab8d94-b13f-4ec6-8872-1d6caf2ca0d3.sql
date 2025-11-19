-- Phase 4: Monitoring & Analytics
-- Table pour tracker les échecs d'intégration
CREATE TABLE IF NOT EXISTS public.integration_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('shopify', 'google_ads', 'google_merchant', 'google_search_console')),
  error_type TEXT NOT NULL,
  error_message TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_integration_failures_user_id ON public.integration_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_failures_type ON public.integration_failures(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_failures_created_at ON public.integration_failures(created_at DESC);

-- RLS pour integration_failures
ALTER TABLE public.integration_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integration failures"
  ON public.integration_failures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration failures"
  ON public.integration_failures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all integration failures"
  ON public.integration_failures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 1D: Fonction de nettoyage automatique des tokens Shopify expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_shopify_tokens()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Supprimer les tokens expirés non réclamés
  WITH deleted AS (
    DELETE FROM public.shopify_pending_connections
    WHERE expires_at < NOW()
      AND is_claimed = false
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;
  
  -- Logger le nettoyage
  RAISE NOTICE 'Cleaned up % expired Shopify tokens', v_deleted_count;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;