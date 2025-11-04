-- Ajouter un champ details JSON à sync_history pour des logs détaillés
ALTER TABLE sync_history 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sync_history.details IS 'Detailed import statistics: new, updated, skipped items per type';