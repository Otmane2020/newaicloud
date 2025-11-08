-- Add trigger to decrement shopify_stores_count when disconnecting a store
-- This trigger was missing, causing the limit not to be freed up when disconnecting

DROP TRIGGER IF EXISTS on_shopify_connection_delete ON public.shopify_connections;

CREATE TRIGGER on_shopify_connection_delete
  BEFORE DELETE ON public.shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_shopify_connection_cascade();