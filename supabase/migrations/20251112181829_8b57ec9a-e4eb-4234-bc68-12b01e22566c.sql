-- Enable realtime for products and collections tables
ALTER TABLE public.shopify_products REPLICA IDENTITY FULL;
ALTER TABLE public.shopify_collections REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_collections;