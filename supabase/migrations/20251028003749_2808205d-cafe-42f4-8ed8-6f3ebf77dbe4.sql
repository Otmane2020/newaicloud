-- Create performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_user ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_function ON performance_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_performance_created ON performance_metrics(created_at DESC);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (true);