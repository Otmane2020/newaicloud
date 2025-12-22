-- Create aeo_projects table for organizing Aeoreply data by brand/site
CREATE TABLE public.aeo_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  llms_txt_url TEXT,
  target_platforms TEXT[] DEFAULT ARRAY['chatgpt', 'gemini', 'perplexity', 'claude'],
  language TEXT DEFAULT 'fr',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create aeo_sources table for tracking URLs, keywords, links per project
CREATE TABLE public.aeo_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.aeo_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'keyword', 'link', 'product')),
  value TEXT NOT NULL,
  label TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'error')),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project and source references to ai_answers
ALTER TABLE public.ai_answers 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.aeo_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.aeo_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS brand_mention TEXT;

-- Add project and source references to ai_opportunities  
ALTER TABLE public.ai_opportunities
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.aeo_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.aeo_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS brand_mention TEXT;

-- Enable RLS on new tables
ALTER TABLE public.aeo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeo_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for aeo_projects
CREATE POLICY "Users can view their own projects" 
ON public.aeo_projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.aeo_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.aeo_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.aeo_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for aeo_sources
CREATE POLICY "Users can view their own sources" 
ON public.aeo_sources 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sources" 
ON public.aeo_sources 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources" 
ON public.aeo_sources 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources" 
ON public.aeo_sources 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_aeo_projects_user_id ON public.aeo_projects(user_id);
CREATE INDEX idx_aeo_sources_project_id ON public.aeo_sources(project_id);
CREATE INDEX idx_aeo_sources_user_id ON public.aeo_sources(user_id);
CREATE INDEX idx_ai_answers_project_id ON public.ai_answers(project_id);
CREATE INDEX idx_ai_opportunities_project_id ON public.ai_opportunities(project_id);

-- Trigger for updated_at on aeo_projects
CREATE TRIGGER update_aeo_projects_updated_at
BEFORE UPDATE ON public.aeo_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on aeo_sources
CREATE TRIGGER update_aeo_sources_updated_at
BEFORE UPDATE ON public.aeo_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();