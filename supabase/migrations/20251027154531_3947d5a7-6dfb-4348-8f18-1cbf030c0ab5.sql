-- Delete all user-related data to start fresh

-- Delete from tables that reference users
DELETE FROM usage_tracking;
DELETE FROM sync_logs;
DELETE FROM google_merchant_feeds;
DELETE FROM automation_settings;
DELETE FROM blog_opportunities;
DELETE FROM blog_campaigns;
DELETE FROM blog_articles;
DELETE FROM chat_messages;
DELETE FROM chat_sessions;
DELETE FROM shopify_connections;
DELETE FROM import_jobs;
DELETE FROM product_images;
DELETE FROM product_variants;
DELETE FROM shopify_products;
DELETE FROM products;
DELETE FROM subscriptions;
DELETE FROM user_roles;
DELETE FROM profiles;

-- Delete all auth users (this will cascade to any remaining references)
DELETE FROM auth.users;