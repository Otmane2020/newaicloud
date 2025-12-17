-- Create ai_answers table for AIO (Answer Engine Optimization)
CREATE TABLE IF NOT EXISTS public.ai_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid,
  
  platform text NOT NULL CHECK (platform IN ('chatgpt', 'gemini', 'copilot')),
  query_type text NOT NULL CHECK (query_type IN ('direct', 'list', 'comparison')),
  
  question text NOT NULL,
  
  -- AIO CORE (what AI cites)
  direct_answer text NOT NULL,
  answer_confidence numeric DEFAULT 0.85,
  
  -- Secondary content
  supporting_content jsonb,
  
  citation_potential integer NOT NULL,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  product_ids text[],
  keywords text[],
  
  status text DEFAULT 'pending',
  article_id uuid REFERENCES public.blog_articles(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_answers_user_store ON public.ai_answers(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_ai_answers_platform ON public.ai_answers(platform);
CREATE INDEX IF NOT EXISTS idx_ai_answers_citation ON public.ai_answers(citation_potential DESC);

-- Enable RLS
ALTER TABLE public.ai_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own ai_answers"
ON public.ai_answers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);