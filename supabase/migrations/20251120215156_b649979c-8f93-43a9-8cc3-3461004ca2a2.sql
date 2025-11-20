-- Ajouter les colonnes pour tracer la réclamation
ALTER TABLE public.shopify_pending_connections
ADD COLUMN claimed_at TIMESTAMPTZ,
ADD COLUMN claimed_by UUID REFERENCES auth.users(id);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_pending_claimed_by 
ON public.shopify_pending_connections(claimed_by);

-- Commentaires pour documentation
COMMENT ON COLUMN public.shopify_pending_connections.claimed_at 
IS 'Timestamp when the connection was claimed by a user';
COMMENT ON COLUMN public.shopify_pending_connections.claimed_by 
IS 'User ID who claimed this connection';