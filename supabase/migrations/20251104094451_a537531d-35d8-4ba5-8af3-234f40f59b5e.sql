-- Add products column to chat_messages for storing suggested products
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for better performance on products queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_products 
ON chat_messages USING gin(products);

-- Add helpful comment
COMMENT ON COLUMN chat_messages.products IS 
'Array of products suggested by assistant: [{id, title, price, image_url, category}]';