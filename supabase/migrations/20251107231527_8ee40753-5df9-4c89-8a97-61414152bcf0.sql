-- Créer la table pour les emails admin
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'received')),
  direction TEXT DEFAULT 'outgoing' CHECK (direction IN ('outgoing', 'incoming')),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_emails_to_email ON public.admin_emails(to_email);
CREATE INDEX IF NOT EXISTS idx_admin_emails_from_email ON public.admin_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_admin_emails_status ON public.admin_emails(status);
CREATE INDEX IF NOT EXISTS idx_admin_emails_direction ON public.admin_emails(direction);
CREATE INDEX IF NOT EXISTS idx_admin_emails_created_at ON public.admin_emails(created_at DESC);

-- RLS
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Seuls les admins peuvent voir les emails
CREATE POLICY "Admins can view all emails"
  ON public.admin_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Seuls les admins peuvent envoyer des emails
CREATE POLICY "Admins can insert emails"
  ON public.admin_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Seuls les admins peuvent modifier des emails
CREATE POLICY "Admins can update emails"
  ON public.admin_emails
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE TRIGGER update_admin_emails_updated_at
  BEFORE UPDATE ON public.admin_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();