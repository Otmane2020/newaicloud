-- Solution 3: Augmenter l'expiration des tokens de 24h à 7 jours (168h)
-- Mettre à jour les tokens existants non expirés pour prolonger leur validité

-- Prolonger la validité des tokens existants non réclamés
UPDATE public.shopify_pending_connections
SET expires_at = expires_at + INTERVAL '144 hours'
WHERE is_claimed = false
  AND expires_at > NOW()
  AND expires_at < NOW() + INTERVAL '168 hours';

-- Créer une fonction pour notifier les tokens qui expirent bientôt
CREATE OR REPLACE FUNCTION public.notify_expiring_shopify_tokens()
RETURNS TABLE(user_email text, shop_url text, expires_in_hours numeric, pending_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Retourner les tokens qui expirent dans les prochaines 24h
  RETURN QUERY
  SELECT 
    p.email,
    spc.shop_url,
    ROUND(EXTRACT(EPOCH FROM (spc.expires_at - NOW())) / 3600, 2) as expires_in_hours,
    spc.pending_token
  FROM public.shopify_pending_connections spc
  LEFT JOIN auth.users u ON spc.claimed_by = u.id
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE spc.is_claimed = false
    AND spc.expires_at > NOW()
    AND spc.expires_at < NOW() + INTERVAL '24 hours'
  ORDER BY spc.expires_at ASC;
END;
$$;

COMMENT ON FUNCTION public.notify_expiring_shopify_tokens IS 'Retourne les tokens Shopify qui expirent dans les 24 prochaines heures pour envoyer des notifications';

-- Créer une vue pour voir l'état des pending connections
CREATE OR REPLACE VIEW public.shopify_pending_connections_status AS
SELECT 
  spc.id,
  spc.shop_url,
  spc.commercial_name,
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

COMMENT ON VIEW public.shopify_pending_connections_status IS 'Vue pour monitorer l''état des connexions Shopify en attente avec leur statut d''expiration';