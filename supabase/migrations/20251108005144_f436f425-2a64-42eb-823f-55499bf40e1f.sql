-- Activer Realtime pour la table admin_emails
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_emails;

-- Ajouter un index pour améliorer les performances de lecture
CREATE INDEX IF NOT EXISTS idx_admin_emails_direction_created ON admin_emails(direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_emails_status ON admin_emails(status);

-- Ajouter une colonne pour marquer les emails comme lus
ALTER TABLE admin_emails ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Fonction pour mettre à jour le statut des emails reçus
CREATE OR REPLACE FUNCTION mark_email_as_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.status = 'read';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le statut
DROP TRIGGER IF EXISTS trigger_mark_email_read ON admin_emails;
CREATE TRIGGER trigger_mark_email_read
  BEFORE UPDATE ON admin_emails
  FOR EACH ROW
  EXECUTE FUNCTION mark_email_as_read();