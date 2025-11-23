-- Create table for landing page customization preferences
CREATE TABLE public.landing_page_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  
  -- Design configuration
  layout TEXT NOT NULL DEFAULT '2 colonnes',
  design_style TEXT NOT NULL DEFAULT 'modern',
  content_length TEXT NOT NULL DEFAULT 'medium',
  
  -- Color scheme with all 7 theme colors in HSL format
  palette_id TEXT NOT NULL DEFAULT 'modern',
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  color_background TEXT NOT NULL,
  color_surface TEXT NOT NULL,
  color_text TEXT NOT NULL,
  color_text_muted TEXT NOT NULL,
  
  -- Additional customization
  custom_highlights TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_page_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences"
ON public.landing_page_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
ON public.landing_page_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.landing_page_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.landing_page_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_landing_preferences_updated_at
BEFORE UPDATE ON public.landing_page_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_landing_preferences_user_id ON public.landing_page_preferences(user_id);
CREATE INDEX idx_landing_preferences_store_id ON public.landing_page_preferences(store_id);
CREATE INDEX idx_landing_preferences_is_default ON public.landing_page_preferences(user_id, is_default) WHERE is_default = true;