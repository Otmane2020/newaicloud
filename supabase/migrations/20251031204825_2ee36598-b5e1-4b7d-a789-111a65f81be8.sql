-- Phase 1: Add homepage_data column to seo_audit_reports
ALTER TABLE seo_audit_reports ADD COLUMN IF NOT EXISTS homepage_data JSONB DEFAULT '{}'::JSONB;

-- Create seo_tasks table for persistent to-do list
CREATE TABLE IF NOT EXISTS seo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  estimated_impact INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seo_tasks_user_status ON seo_tasks(user_id, status);

-- Enable RLS
ALTER TABLE seo_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_tasks
CREATE POLICY "Users can view their own tasks" ON seo_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" ON seo_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON seo_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON seo_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_seo_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_tasks_updated_at
  BEFORE UPDATE ON seo_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_tasks_updated_at();