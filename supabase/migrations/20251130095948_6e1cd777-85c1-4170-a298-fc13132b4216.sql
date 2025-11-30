-- Fix: Drop the src-based unique constraint that blocks image upserts
-- Problem: onConflict on shopify_image_id fails when same src exists with different shopify_image_id

-- Drop the problematic constraint
DROP INDEX IF EXISTS product_images_product_src_unique;

-- Note: We keep product_images_product_shopify_unique as the primary deduplication mechanism
-- This allows same src URL across different shopify_image_ids (edge case but possible during reimports)