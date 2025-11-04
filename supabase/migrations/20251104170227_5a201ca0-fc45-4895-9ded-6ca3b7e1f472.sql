-- Ajouter les colonnes manquantes à blog_campaigns pour stocker les paramètres
ALTER TABLE blog_campaigns
ADD COLUMN IF NOT EXISTS topic_niche TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_generation_date TIMESTAMPTZ;

-- Créer un index sur next_execution_at pour les requêtes cron
CREATE INDEX IF NOT EXISTS idx_blog_campaigns_next_execution 
ON blog_campaigns(next_execution_at) 
WHERE is_active = true;

-- Créer une fonction pour calculer la prochaine exécution selon la fréquence
CREATE OR REPLACE FUNCTION calculate_next_execution(
  p_frequency TEXT,
  p_last_execution TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'daily' THEN p_last_execution + INTERVAL '1 day'
    WHEN 'weekly' THEN p_last_execution + INTERVAL '1 week'
    WHEN 'biweekly' THEN p_last_execution + INTERVAL '2 weeks'
    WHEN 'monthly' THEN p_last_execution + INTERVAL '1 month'
    ELSE p_last_execution + INTERVAL '1 week'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Initialiser next_execution_at pour les campagnes existantes
UPDATE blog_campaigns
SET next_execution_at = NOW()
WHERE next_execution_at IS NULL AND is_active = true;

-- Créer le cron job pour générer automatiquement les articles de campagnes
-- S'exécute toutes les 6 heures
SELECT cron.schedule(
  'generate-campaign-articles',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/generate-blog-article',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5la3FxbGhyamdteXVkbW1ld2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNzAxMDQsImV4cCI6MjA3Njk0NjEwNH0.Alb88W0k8L4n-UnN5lx2e5AuGE2cZR_IyrwFDqYI2KU'
    ),
    body := jsonb_build_object('mode', 'auto', 'limit', 20)
  );
  $$
);