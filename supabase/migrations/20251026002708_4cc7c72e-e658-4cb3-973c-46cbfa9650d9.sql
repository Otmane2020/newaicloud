-- Create blog_campaigns table if not exists
CREATE TABLE IF NOT EXISTS public.blog_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'stopped', 'completed')),
  frequency TEXT NOT NULL,
  auto_post BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  keywords TEXT[],
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  articles_generated INTEGER DEFAULT 0,
  articles_published INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  last_message TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON public.blog_campaigns;
CREATE POLICY "Users can manage their own campaigns"
  ON public.blog_campaigns
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can manage their own sessions"
  ON public.chat_sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.chat_messages;
CREATE POLICY "Users can view messages from their sessions"
  ON public.chat_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert messages to their sessions" ON public.chat_messages;
CREATE POLICY "Users can insert messages to their sessions"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete messages from their sessions" ON public.chat_messages;
CREATE POLICY "Users can delete messages from their sessions"
  ON public.chat_messages
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_campaigns_user ON public.blog_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);