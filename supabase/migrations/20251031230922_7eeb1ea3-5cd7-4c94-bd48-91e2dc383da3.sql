-- Add missing score columns and change all scores to NUMERIC to support decimal values
ALTER TABLE seo_audit_reports 
  ADD COLUMN IF NOT EXISTS images_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS technical_score NUMERIC(5,2) DEFAULT 0;

-- Convert existing integer score columns to NUMERIC
ALTER TABLE seo_audit_reports 
  ALTER COLUMN global_score TYPE NUMERIC(5,2),
  ALTER COLUMN homepage_score TYPE NUMERIC(5,2),
  ALTER COLUMN products_score TYPE NUMERIC(5,2),
  ALTER COLUMN collections_score TYPE NUMERIC(5,2),
  ALTER COLUMN blog_score TYPE NUMERIC(5,2);