-- Corriger la vue pour inclure le pending_token
DROP VIEW IF EXISTS public.shopify_pending_connections_status;

CREATE OR REPLACE VIEW public.shopify_pending_connections_status AS
SELECT 
  spc.id,
  spc.shop_url,
  spc.commercial_name,
  spc.pending_token,
  spc.is_claimed,
  spc.claimed_at,
  spc.created_at,
  spc.expires_at,
  CASE 
    WHEN spc.expires_at < NOW() THEN 'expired'
    WHEN spc.expires_at < NOW() + INTERVAL '24 hours' THEN 'expiring_soon'
    WHEN spc.is_claimed THEN 'claimed'
    ELSE 'active'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (spc.expires_at - NOW())) / 3600, 2) as hours_until_expiry,
  p.email as claimed_by_email
FROM public.shopify_pending_connections spc
LEFT JOIN auth.users u ON spc.claimed_by = u.id
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY spc.created_at DESC;