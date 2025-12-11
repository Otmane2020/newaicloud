-- Create potential customers table for leads from mobile ads checkout
CREATE TABLE public.potential_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  country TEXT,
  plan_interest TEXT,
  billing_period TEXT,
  source TEXT DEFAULT 'mobileads',
  status TEXT DEFAULT 'lead',
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX potential_customers_email_key ON public.potential_customers (email);

-- Enable RLS
ALTER TABLE public.potential_customers ENABLE ROW LEVEL SECURITY;

-- Admin can read all potential customers
CREATE POLICY "Admins can read potential customers"
ON public.potential_customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can insert (for checkout capture)
CREATE POLICY "Anyone can insert potential customers"
ON public.potential_customers
FOR INSERT
WITH CHECK (true);

-- Admins can update
CREATE POLICY "Admins can update potential customers"
ON public.potential_customers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_potential_customers_updated_at
BEFORE UPDATE ON public.potential_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();