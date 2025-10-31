-- Create seo_audit_reports table for storing SEO audit results
CREATE TABLE IF NOT EXISTS public.seo_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
  
  -- Global scores
  global_score INTEGER DEFAULT 0,
  homepage_score INTEGER DEFAULT 0,
  products_score INTEGER DEFAULT 0,
  collections_score INTEGER DEFAULT 0,
  blog_score INTEGER DEFAULT 0,
  
  -- Detailed results (JSONB for flexibility)
  meta_titles JSONB DEFAULT '{}',          -- {long: [], short: [], duplicate: [], missing: []}
  meta_descriptions JSONB DEFAULT '{}',    -- {long: [], short: [], duplicate: [], missing: []}
  heading_tags JSONB DEFAULT '{}',          -- {missing_h1: [], duplicate_h1: [], multiple_h1: []}
  image_alt_tags JSONB DEFAULT '{}',        -- {missing: [], optimized: [], total: 0}
  errors_404 JSONB DEFAULT '{}',            -- {urls: [], count: 0}
  
  -- Technical metrics
  page_speed JSONB DEFAULT '{}',            -- {mobile: 0, desktop: 0, metrics: {}}
  mobile_friendly BOOLEAN DEFAULT false,
  ssl_secure BOOLEAN DEFAULT false,
  has_sitemap BOOLEAN DEFAULT false,
  has_robots_txt BOOLEAN DEFAULT false,
  
  -- Authority metrics
  domain_authority INTEGER DEFAULT 0,
  page_authority INTEGER DEFAULT 0,
  indexed_pages INTEGER DEFAULT 0,
  backlinks_count INTEGER DEFAULT 0,
  
  -- Recommendations (prioritized)
  recommendations JSONB DEFAULT '[]',       -- [{category: '', priority: '', items: []}]
  
  -- Full audit results from edge function
  audit_results JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.seo_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit reports" ON public.seo_audit_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit reports" ON public.seo_audit_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audit reports" ON public.seo_audit_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own audit reports" ON public.seo_audit_reports
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_seo_audit_reports_user_id ON public.seo_audit_reports(user_id);
CREATE INDEX idx_seo_audit_reports_created_at ON public.seo_audit_reports(created_at DESC);