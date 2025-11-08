-- Create user_activity table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  page TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for user_activity
CREATE POLICY "Service role can insert activity"
  ON public.user_activity
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own activity"
  ON public.user_activity
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.user_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_user_activity_user_date ON public.user_activity(user_id, date DESC);
CREATE INDEX idx_user_activity_page ON public.user_activity(page);
CREATE INDEX idx_user_activity_date ON public.user_activity(date DESC);

-- Fix admin_emails RLS to allow service role inserts
DROP POLICY IF EXISTS "Service role can insert emails" ON public.admin_emails;

CREATE POLICY "Service role can insert emails"
  ON public.admin_emails
  FOR INSERT
  WITH CHECK (true);

-- Ensure service role can also update for webhook processing
DROP POLICY IF EXISTS "Service role can update emails" ON public.admin_emails;

CREATE POLICY "Service role can update emails"
  ON public.admin_emails
  FOR UPDATE
  USING (true);

-- Add helpful comment
COMMENT ON TABLE public.user_activity IS 'Tracks detailed user activity across the application for analytics and monitoring';
COMMENT ON COLUMN public.user_activity.action_type IS 'Type of action: page_view, optimization, sync, etc.';
COMMENT ON COLUMN public.user_activity.page IS 'Page or section where action occurred';
COMMENT ON COLUMN public.user_activity.metadata IS 'Additional context about the action (product_id, store_id, etc.)';
