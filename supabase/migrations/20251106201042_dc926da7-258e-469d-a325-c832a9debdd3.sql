-- Create table for GSC alerts
CREATE TABLE IF NOT EXISTS public.gsc_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'clicks_drop', 'position_drop', 'impressions_drop'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  metric_name TEXT NOT NULL,
  previous_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  change_percentage NUMERIC NOT NULL,
  detection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for GSC sync configuration
CREATE TABLE IF NOT EXISTS public.gsc_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  sync_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly'
  alert_thresholds JSONB DEFAULT '{"clicks_drop": 20, "position_drop": 5, "impressions_drop": 30}'::jsonb,
  notification_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gsc_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.gsc_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.gsc_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert alerts"
  ON public.gsc_alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for gsc_sync_config
CREATE POLICY "Users can view their own sync config"
  ON public.gsc_sync_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync config"
  ON public.gsc_sync_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync config"
  ON public.gsc_sync_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gsc_alerts_user_id ON public.gsc_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_alerts_domain ON public.gsc_alerts(domain);
CREATE INDEX IF NOT EXISTS idx_gsc_alerts_is_read ON public.gsc_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_gsc_alerts_detection_date ON public.gsc_alerts(detection_date DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_gsc_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gsc_alerts_updated_at
  BEFORE UPDATE ON public.gsc_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_alerts_updated_at();

CREATE TRIGGER gsc_sync_config_updated_at
  BEFORE UPDATE ON public.gsc_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_alerts_updated_at();