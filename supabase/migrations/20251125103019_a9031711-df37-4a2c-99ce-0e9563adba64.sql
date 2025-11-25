-- Update cost_reference table with corrected values
DELETE FROM public.cost_reference;

INSERT INTO public.cost_reference (name, cost) VALUES
  ('Landing Page', 10),
  ('Article de Blog', 10),
  ('Titre + Description Produit', 5),
  ('SEO Produit (DeepSeek)', 2),
  ('Génération GTIN', 2),
  ('Enrichissement Produit', 1),
  ('SEO Article', 2),
  ('SEO Collection', 2),
  ('SEO Page', 2),
  ('Génération Tags', 1),
  ('Catégorie Google', 1),
  ('Alt Text Image', 3),
  ('Fond Blanc Image', 5),
  ('Fond IA Image', 8),
  ('Campagne Mensuelle', 10),
  ('Campagne Hebdomadaire', 40),
  ('Campagne Journalière', 300),
  ('Titre Généré (SERP)', 1),
  ('Réponse Chat', 1),
  ('Sync Shopify', 0);