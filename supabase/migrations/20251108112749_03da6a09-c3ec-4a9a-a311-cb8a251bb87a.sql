-- Modifier le trigger handle_new_user pour envoyer l'email de bienvenue 
-- aussi lors des inscriptions via Google OAuth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name TEXT;
  v_language TEXT;
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
    true,
    true,
    true,
    9,
    true,
    true,
    true,
    true,
    true
  );
  
  -- Envoyer l'email de bienvenue pour TOUS les types d'inscription
  -- (email/password ET OAuth Google)
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur');
  v_language := COALESCE(NEW.raw_user_meta_data->>'language', 'fr');
  
  -- Appeler la fonction edge pour envoyer l'email
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'fullName', v_full_name,
        'language', v_language
      )
    );
  
  RETURN NEW;
END;
$function$;