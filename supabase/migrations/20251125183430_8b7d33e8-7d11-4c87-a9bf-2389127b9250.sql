-- Create system_health_checks table for monitoring
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ DEFAULT now(),
  total_functions INT NOT NULL,
  healthy_count INT NOT NULL,
  unhealthy_count INT NOT NULL,
  avg_response_time_ms INT,
  results JSONB NOT NULL,
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON public.system_health_checks(checked_at DESC);

-- RLS policies
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

-- Only admins can view health checks
CREATE POLICY "Admins can view health checks"
  ON public.system_health_checks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );