-- 1. Nettoyer les synchros bloquées
UPDATE sync_history
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Synchronisation interrompue - timeout ou erreur silencieuse',
  duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '5 minutes';

-- 2. Créer une fonction pour nettoyer automatiquement les synchros bloquées
CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sync_history
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = 'Timeout - synchro bloquée plus de 10 minutes',
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '10 minutes';
END;
$$;