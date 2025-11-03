-- Ajouter le champ pour le nom personnalisé de l'assistant
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'Nicolas';