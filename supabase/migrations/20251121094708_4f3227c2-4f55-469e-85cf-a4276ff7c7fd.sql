-- Enable realtime for shopify_connections table to support auto-sync
ALTER PUBLICATION supabase_realtime ADD TABLE shopify_connections;