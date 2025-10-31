-- Create notifications table
CREATE TABLE IF NOT EXISTS public.seo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('seo_task', 'optimization', 'sync', 'alert')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL CHECK (category IN ('products', 'collections', 'blog', 'images', 'homepage')),
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.seo_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.seo_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.seo_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.seo_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.seo_notifications FOR INSERT
  WITH CHECK (true);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT TRUE,
  digest_hour INTEGER DEFAULT 9 CHECK (digest_hour >= 0 AND digest_hour <= 23),
  notify_products BOOLEAN DEFAULT TRUE,
  notify_collections BOOLEAN DEFAULT TRUE,
  notify_blog BOOLEAN DEFAULT TRUE,
  notify_images BOOLEAN DEFAULT TRUE,
  notify_homepage BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own settings"
  ON public.notification_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_seo_notifications_user_id ON public.seo_notifications(user_id);
CREATE INDEX idx_seo_notifications_is_read ON public.seo_notifications(is_read);
CREATE INDEX idx_seo_notifications_due_date ON public.seo_notifications(due_date);
CREATE INDEX idx_seo_notifications_category ON public.seo_notifications(category);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifications
CREATE TRIGGER update_seo_notifications_updated_at
  BEFORE UPDATE ON public.seo_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Trigger for settings
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();