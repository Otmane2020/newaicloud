-- Create ai_opportunities table for AI SEO (ChatGPT, Gemini, Copilot) opportunities
CREATE TABLE public.ai_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('chatgpt', 'gemini', 'copilot')),
  query_type TEXT NOT NULL CHECK (query_type IN ('comparison', 'recommendation', 'howto', 'review', 'faq', 'guide')),
  question TEXT NOT NULL,
  suggested_title TEXT,
  suggested_structure JSONB,
  citation_potential INTEGER CHECK (citation_potential >= 0 AND citation_potential <= 100),
  product_ids TEXT[],
  keywords TEXT[],
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'treated', 'dismissed')),
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI opportunities" 
ON public.ai_opportunities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI opportunities" 
ON public.ai_opportunities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI opportunities" 
ON public.ai_opportunities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI opportunities" 
ON public.ai_opportunities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_ai_opportunities_user_id ON public.ai_opportunities(user_id);
CREATE INDEX idx_ai_opportunities_store_id ON public.ai_opportunities(store_id);
CREATE INDEX idx_ai_opportunities_platform ON public.ai_opportunities(platform);
CREATE INDEX idx_ai_opportunities_status ON public.ai_opportunities(status);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_opportunities_updated_at
BEFORE UPDATE ON public.ai_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();