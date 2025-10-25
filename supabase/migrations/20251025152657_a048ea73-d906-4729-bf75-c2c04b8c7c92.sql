-- Create automation_settings table
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seo_auto_enabled BOOLEAN DEFAULT false,
  seo_auto_frequency TEXT DEFAULT 'daily',
  seo_auto_schedule_hour INTEGER DEFAULT 9,
  tag_auto_enabled BOOLEAN DEFAULT false,
  tag_auto_frequency TEXT DEFAULT 'daily',
  tag_auto_schedule_hour INTEGER DEFAULT 9,
  alt_auto_enabled BOOLEAN DEFAULT false,
  alt_auto_frequency TEXT DEFAULT 'daily',
  alt_auto_schedule_hour INTEGER DEFAULT 9,
  sync_auto_enabled BOOLEAN DEFAULT false,
  sync_after_optimization BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own automation settings"
ON public.automation_settings
FOR ALL
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_automation_settings_updated_at
BEFORE UPDATE ON public.automation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();