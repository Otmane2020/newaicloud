-- Create shopify_sync_settings table for managing automatic sync schedules
CREATE TABLE public.shopify_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Import settings
  import_frequency TEXT NOT NULL DEFAULT 'manual' CHECK (import_frequency IN ('manual', 'hourly', 'daily', 'weekly')),
  import_schedule_hour INTEGER DEFAULT 9 CHECK (import_schedule_hour >= 0 AND import_schedule_hour <= 23),
  import_schedule_day INTEGER DEFAULT 1 CHECK (import_schedule_day >= 0 AND import_schedule_day <= 6),
  import_types TEXT[] DEFAULT ARRAY['products', 'collections', 'pages', 'articles', 'images'],
  last_import_at TIMESTAMPTZ,
  next_import_at TIMESTAMPTZ,
  
  -- Export settings
  export_auto_enabled BOOLEAN DEFAULT false,
  export_after_optimization BOOLEAN DEFAULT true,
  last_export_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.shopify_sync_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sync settings
CREATE POLICY "Users can manage their own sync settings"
  ON public.shopify_sync_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_shopify_sync_settings_updated_at
  BEFORE UPDATE ON public.shopify_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sync_history table for logging
CREATE TABLE public.sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('import', 'export')),
  content_types TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  items_synced INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sync_history
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync history
CREATE POLICY "Users can view their own sync history"
  ON public.sync_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert sync history
CREATE POLICY "Service role can insert sync history"
  ON public.sync_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_sync_history_user_created ON public.sync_history(user_id, created_at DESC);
CREATE INDEX idx_shopify_sync_settings_next_import ON public.shopify_sync_settings(next_import_at) WHERE import_frequency != 'manual';