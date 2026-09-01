-- Keep AI Chat settings compatible with the fields used by ChatSettings.tsx.
-- This migration is intentionally idempotent so it is safe on environments
-- where one or more columns may already exist.

alter table if exists public.chat_settings
  add column if not exists embed_avatar text default 'professional',
  add column if not exists embed_sales_focus boolean not null default true,
  add column if not exists embed_product_recommendations boolean not null default true,
  add column if not exists embed_order_support boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure existing rows have usable values if any of these columns were created
-- previously without defaults / NOT NULL constraints.
update public.chat_settings
set
  embed_avatar = coalesce(embed_avatar, 'professional'),
  embed_sales_focus = coalesce(embed_sales_focus, true),
  embed_product_recommendations = coalesce(embed_product_recommendations, true),
  embed_order_support = coalesce(embed_order_support, true),
  updated_at = coalesce(updated_at, now());

-- Ask PostgREST to refresh its schema cache immediately after the migration.
notify pgrst, 'reload schema';
