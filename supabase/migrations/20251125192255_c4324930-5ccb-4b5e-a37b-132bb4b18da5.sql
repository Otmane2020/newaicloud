-- ============================================
-- SuperAdmin v2: Premium Modules - Database Setup
-- ============================================

-- 1. Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'debug')),
  function_name TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(type);
CREATE INDEX IF NOT EXISTS idx_system_logs_function ON public.system_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id);

-- RLS: Admins can view, service can insert
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON public.system_logs 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert logs" ON public.system_logs 
  FOR INSERT 
  WITH CHECK (true);

-- 2. Create feature_usage table
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  first_used_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, feature_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON public.feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_last_used ON public.feature_usage(last_used_at DESC);

-- RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all feature usage" ON public.feature_usage 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own feature usage" ON public.feature_usage 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage feature usage" ON public.feature_usage 
  FOR ALL 
  WITH CHECK (true);

-- 3. Create admin_smart_search RPC function
CREATE OR REPLACE FUNCTION public.admin_smart_search(term TEXT)
RETURNS TABLE(id TEXT, label TEXT, type TEXT, metadata JSONB) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search in profiles
  SELECT 
    p.id::TEXT, 
    p.email AS label, 
    'user'::TEXT AS type, 
    jsonb_build_object(
      'name', COALESCE(p.full_name, ''),
      'status', p.subscription_status,
      'plan', p.current_plan_id
    ) AS metadata
  FROM profiles p
  WHERE p.email ILIKE '%' || term || '%' 
     OR COALESCE(p.full_name, '') ILIKE '%' || term || '%'
  
  UNION ALL
  
  -- Search in system_logs
  SELECT 
    sl.id::TEXT, 
    sl.message AS label, 
    'log'::TEXT AS type,
    jsonb_build_object(
      'function', sl.function_name, 
      'type', sl.type,
      'created_at', sl.created_at
    ) AS metadata
  FROM system_logs sl
  WHERE sl.message ILIKE '%' || term || '%' 
     OR sl.function_name ILIKE '%' || term || '%'
  
  UNION ALL
  
  -- Search in admin_emails
  SELECT 
    ae.id::TEXT, 
    ae.subject AS label, 
    'email'::TEXT AS type,
    jsonb_build_object(
      'from', ae.from_email, 
      'status', ae.status,
      'direction', ae.direction
    ) AS metadata
  FROM admin_emails ae
  WHERE ae.subject ILIKE '%' || term || '%' 
     OR ae.from_email ILIKE '%' || term || '%'
     OR ae.body ILIKE '%' || term || '%'
  
  LIMIT 50;
END;
$$;