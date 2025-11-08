-- Add store_id to user_activity table
ALTER TABLE public.user_activity 
ADD COLUMN store_id uuid REFERENCES public.shopify_connections(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_store_id ON public.user_activity(store_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_store ON public.user_activity(user_id, store_id);

COMMENT ON COLUMN public.user_activity.store_id IS 'Reference to the Shopify store associated with this activity';