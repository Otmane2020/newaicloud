-- Table chat_knowledge_base - Base de connaissances enrichie
CREATE TABLE IF NOT EXISTS chat_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('delivery', 'return', 'payment', 'product', 'pickup', 'support', 'general')),
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[],
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_user ON chat_knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON chat_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON chat_knowledge_base USING GIN(keywords);

-- RLS policies for chat_knowledge_base
ALTER TABLE chat_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knowledge base"
  ON chat_knowledge_base FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge base"
  ON chat_knowledge_base FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base"
  ON chat_knowledge_base FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge base"
  ON chat_knowledge_base FOR DELETE
  USING (auth.uid() = user_id);

-- Table chat_order_tracking - Suivi des commandes Shopify
CREATE TABLE IF NOT EXISTS chat_order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES shopify_connections(id) ON DELETE CASCADE,
  shopify_order_id bigint NOT NULL,
  order_number text NOT NULL,
  customer_email text,
  customer_name text,
  total_price numeric,
  currency text DEFAULT 'EUR',
  financial_status text,
  fulfillment_status text,
  tracking_number text,
  tracking_url text,
  carrier text,
  estimated_delivery date,
  order_date timestamptz,
  notes text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shopify_order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_user ON chat_order_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_order_store ON chat_order_tracking(store_id);
CREATE INDEX IF NOT EXISTS idx_order_shopify ON chat_order_tracking(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON chat_order_tracking(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_date ON chat_order_tracking(order_date DESC);

-- RLS policies for chat_order_tracking
ALTER TABLE chat_order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON chat_order_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON chat_order_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON chat_order_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
  ON chat_order_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour updated_at sur chat_knowledge_base
CREATE OR REPLACE FUNCTION update_chat_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_knowledge_timestamp
BEFORE UPDATE ON chat_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION update_chat_knowledge_updated_at();

-- Trigger pour updated_at sur chat_order_tracking
CREATE OR REPLACE FUNCTION update_chat_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_order_timestamp
BEFORE UPDATE ON chat_order_tracking
FOR EACH ROW
EXECUTE FUNCTION update_chat_order_updated_at();