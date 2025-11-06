-- Créer la table pour les paramètres de synchronisation Google Merchant
CREATE TABLE IF NOT EXISTS public.google_merchant_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('daily', 'weekly', 'monthly', 'manual')),
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_errors_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_merchant_sync_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour google_merchant_sync_settings
CREATE POLICY "Users can manage their own sync settings"
  ON public.google_merchant_sync_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_google_merchant_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_google_merchant_sync_settings_timestamp
  BEFORE UPDATE ON public.google_merchant_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_google_merchant_sync_settings_updated_at();

-- Activer les extensions nécessaires pour le cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;