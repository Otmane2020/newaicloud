-- Ajouter les colonnes collection_ids et product_ids à blog_campaigns
ALTER TABLE blog_campaigns 
ADD COLUMN IF NOT EXISTS collection_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS product_ids uuid[] DEFAULT '{}';

-- Ajouter un commentaire pour documenter ces colonnes
COMMENT ON COLUMN blog_campaigns.collection_ids IS 'IDs des collections Shopify associées à cette campagne';
COMMENT ON COLUMN blog_campaigns.product_ids IS 'IDs des produits Shopify associés à cette campagne';