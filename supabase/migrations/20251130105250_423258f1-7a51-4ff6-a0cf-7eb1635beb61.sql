-- Drop existing constraint and recreate with extended values
ALTER TABLE sync_history 
DROP CONSTRAINT IF EXISTS sync_history_sync_type_check;

ALTER TABLE sync_history 
ADD CONSTRAINT sync_history_sync_type_check 
CHECK (sync_type IN ('import', 'export', 'products', 'costs', 'collections', 'pages', 'articles', 'images', 'completed'));