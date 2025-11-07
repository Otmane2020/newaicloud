-- 1. Modifier la fonction handle_new_user pour créer automatiquement les notification_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer le profil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Créer le rôle
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Créer les paramètres de notification avec valeurs par défaut
  INSERT INTO public.notification_settings (
    user_id,
    email_enabled,
    in_app_enabled,
    daily_digest,
    digest_hour,
    notify_products,
    notify_collections,
    notify_blog,
    notify_images,
    notify_homepage
  ) VALUES (
    NEW.id,
    true,  -- email_enabled par défaut
    true,  -- in_app_enabled
    true,  -- daily_digest
    9,     -- digest_hour (9h du matin)
    true,  -- notify_products
    true,  -- notify_collections
    true,  -- notify_blog
    true,  -- notify_images
    true   -- notify_homepage
  );
  
  RETURN NEW;
END;
$$;

-- 2. Créer les paramètres de notification pour tous les utilisateurs existants qui n'en ont pas
INSERT INTO public.notification_settings (
  user_id,
  email_enabled,
  in_app_enabled,
  daily_digest,
  digest_hour,
  notify_products,
  notify_collections,
  notify_blog,
  notify_images,
  notify_homepage
)
SELECT 
  p.id,
  true,  -- email_enabled
  true,  -- in_app_enabled
  true,  -- daily_digest
  9,     -- digest_hour
  true,  -- notify_products
  true,  -- notify_collections
  true,  -- notify_blog
  true,  -- notify_images
  true   -- notify_homepage
FROM public.profiles p
LEFT JOIN public.notification_settings ns ON ns.user_id = p.id
WHERE ns.id IS NULL;