-- Table pour stocker les connexions Shopify en attente d'association utilisateur
CREATE TABLE IF NOT EXISTS public.shopify_pending_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_url TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  commercial_name TEXT,
  pending_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_claimed BOOLEAN DEFAULT false
);

-- Index pour recherche rapide par pending_token
CREATE INDEX IF NOT EXISTS idx_pending_connections_token 
ON public.shopify_pending_connections(pending_token);

-- Index pour nettoyage des connexions expirées
CREATE INDEX IF NOT EXISTS idx_pending_connections_expires 
ON public.shopify_pending_connections(expires_at, is_claimed);

-- Pas de RLS nécessaire car accès uniquement via edge functions avec service role