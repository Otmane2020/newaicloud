-- Create translation audit results table
CREATE TABLE IF NOT EXISTS public.translation_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT,
  code_snippet TEXT,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrected_code TEXT,
  translations_fr JSONB DEFAULT '{}'::jsonb,
  translations_en JSONB DEFAULT '{}'::jsonb,
  total_issues INTEGER DEFAULT 0,
  fr_count INTEGER DEFAULT 0,
  en_count INTEGER DEFAULT 0,
  mixed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.translation_audit_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own audit results"
ON public.translation_audit_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit results"
ON public.translation_audit_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit results"
ON public.translation_audit_results FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit results"
ON public.translation_audit_results FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_translation_audit_user_id ON public.translation_audit_results(user_id);
CREATE INDEX idx_translation_audit_created_at ON public.translation_audit_results(created_at DESC);