-- Create cost_reference table
CREATE TABLE public.cost_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost integer NOT NULL DEFAULT 1
);

-- Insert all cost data
INSERT INTO public.cost_reference (name, cost) VALUES
  ('Landing Page', 10),
  ('Article de Blog', 10),
  ('Titre + Description Produit', 5),
  ('SEO Produit', 2),
  ('Génération GTIN', 2),
  ('Enrichissement Produit', 1),
  ('SEO Article', 1),
  ('SEO Collection', 1),
  ('SEO Page', 1),
  ('Génération Tags', 1),
  ('Catégorie Google', 1),
  ('Alt Text Image', 1),
  ('Fond Blanc Image', 5),
  ('Fond IA Image', 8),
  ('Campagne Mensuelle', 10),
  ('Campagne Hebdomadaire', 40),
  ('Campagne Journalière', 300),
  ('Réponse Chat', 1),
  ('Sync Shopify', 1);

-- Enable RLS
ALTER TABLE public.cost_reference ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view (public reference table)
CREATE POLICY "Anyone can view cost reference"
  ON public.cost_reference FOR SELECT
  USING (true);