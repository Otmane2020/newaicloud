-- Create table for tracking keywords in AI responses
CREATE TABLE public.aeo_keyword_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'all',
  last_checked_at TIMESTAMP WITH TIME ZONE,
  check_count INTEGER DEFAULT 0,
  found_count INTEGER DEFAULT 0,
  last_found_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking URLs in AI citations
CREATE TABLE public.aeo_url_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  brand_name TEXT,
  platform TEXT NOT NULL DEFAULT 'all',
  last_checked_at TIMESTAMP WITH TIME ZONE,
  check_count INTEGER DEFAULT 0,
  cited_count INTEGER DEFAULT 0,
  last_cited_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking check results/history
CREATE TABLE public.aeo_tracking_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tracking_type TEXT NOT NULL, -- 'keyword' or 'url'
  tracking_id UUID NOT NULL,
  platform TEXT NOT NULL,
  query_used TEXT,
  was_found BOOLEAN DEFAULT false,
  position INTEGER,
  response_snippet TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aeo_keyword_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeo_url_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeo_tracking_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword tracking
CREATE POLICY "Users can view their own keyword tracking" 
ON public.aeo_keyword_tracking FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keyword tracking" 
ON public.aeo_keyword_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword tracking" 
ON public.aeo_keyword_tracking FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword tracking" 
ON public.aeo_keyword_tracking FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for URL tracking
CREATE POLICY "Users can view their own url tracking" 
ON public.aeo_url_tracking FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own url tracking" 
ON public.aeo_url_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own url tracking" 
ON public.aeo_url_tracking FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own url tracking" 
ON public.aeo_url_tracking FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tracking results
CREATE POLICY "Users can view their own tracking results" 
ON public.aeo_tracking_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking results" 
ON public.aeo_tracking_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_aeo_keyword_tracking_user ON public.aeo_keyword_tracking(user_id);
CREATE INDEX idx_aeo_url_tracking_user ON public.aeo_url_tracking(user_id);
CREATE INDEX idx_aeo_tracking_results_user ON public.aeo_tracking_results(user_id);
CREATE INDEX idx_aeo_tracking_results_tracking ON public.aeo_tracking_results(tracking_type, tracking_id);