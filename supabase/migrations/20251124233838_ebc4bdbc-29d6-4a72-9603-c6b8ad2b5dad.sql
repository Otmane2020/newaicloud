-- Create table for usage reference costs
CREATE TABLE IF NOT EXISTS public.usage_reference_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_code TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  feature_name_en TEXT NOT NULL,
  description TEXT,
  description_en TEXT,
  base_cost INTEGER NOT NULL DEFAULT 1,
  icon_name TEXT,
  cost_formula JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_reference_costs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view usage costs"
  ON public.usage_reference_costs
  FOR SELECT
  USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage usage costs"
  ON public.usage_reference_costs
  FOR ALL
  USING (true);

-- Insert reference data
INSERT INTO public.usage_reference_costs (feature_code, feature_name, feature_name_en, description, description_en, base_cost, icon_name, cost_formula, display_order) VALUES
('landing_page', 'Landing Page', 'Landing Page', 'Génération complète d''une landing page produit avec IA', 'Full AI-powered product landing page generation', 10, 'Sparkles', '{"type": "fixed", "value": 10}', 1),
('blog_article', 'Article de Blog', 'Blog Article', 'Rédaction et optimisation SEO d''un article complet', 'Complete article writing with SEO optimization', 10, 'FileText', '{"type": "fixed", "value": 10}', 2),
('campaign_daily', 'Campagne Ads (Journalière)', 'Ads Campaign (Daily)', 'Création d''une campagne publicitaire quotidienne', 'Daily advertising campaign creation', 1, 'ShoppingBag', '{"type": "fixed", "value": 1}', 3),
('campaign_weekly', 'Campagne Ads (Hebdomadaire)', 'Ads Campaign (Weekly)', 'Création d''une campagne publicitaire hebdomadaire', 'Weekly advertising campaign creation', 3, 'ShoppingBag', '{"type": "fixed", "value": 3}', 4),
('campaign_monthly', 'Campagne Ads (Mensuelle)', 'Ads Campaign (Monthly)', 'Création d''une campagne publicitaire mensuelle', 'Monthly advertising campaign creation', 5, 'ShoppingBag', '{"type": "fixed", "value": 5}', 5),
('product_seo', 'Optimisation SEO Produit', 'Product SEO Optimization', 'Optimisation du titre et de la description d''un produit', 'Product title and description optimization', 1, 'Package', '{"type": "fixed", "value": 1}', 6),
('image_analysis', 'Analyse Image (Vision AI)', 'Image Analysis (Vision AI)', 'Analyse et génération d''attributs visuels pour une image', 'Image analysis and visual attributes generation', 1, 'Image', '{"type": "fixed", "value": 1}', 7),
('alt_text', 'Texte Alternatif (Alt Text)', 'Alt Text', 'Génération de texte alternatif SEO pour une image', 'SEO alt text generation for images', 3, 'Image', '{"type": "fixed", "value": 3}', 8);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_usage_reference_costs_updated_at
  BEFORE UPDATE ON public.usage_reference_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();