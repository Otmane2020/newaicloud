-- Create table for landing page configuration options
CREATE TABLE public.landing_page_config_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- 'layout', 'design_style', 'color_scheme', 'content_length'
  option_key TEXT NOT NULL,
  option_label TEXT NOT NULL,
  option_value JSONB NOT NULL, -- For color schemes: {primary, secondary, accent, background, surface, text, text_muted}
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, option_key)
);

-- Enable RLS (read-only for all authenticated users)
ALTER TABLE public.landing_page_config_options ENABLE ROW LEVEL SECURITY;

-- Anyone can view the options
CREATE POLICY "Anyone can view config options"
ON public.landing_page_config_options
FOR SELECT
USING (true);

-- Only admins can modify (optional, for future admin interface)
CREATE POLICY "Only admins can modify config options"
ON public.landing_page_config_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_landing_config_options_updated_at
BEFORE UPDATE ON public.landing_page_config_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_landing_config_category ON public.landing_page_config_options(category);
CREATE INDEX idx_landing_config_active ON public.landing_page_config_options(is_active) WHERE is_active = true;