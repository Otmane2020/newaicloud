-- Migration: Fonction pour créer un utilisateur admin pour le superadmin
-- Cette fonction permet d'ajouter le rôle 'admin' à un utilisateur existant

-- Fonction pour promouvoir un utilisateur au rôle admin
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  role_exists BOOLEAN;
BEGIN
  -- Trouver l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Utilisateur non trouvé avec cet email: ' || user_email
    );
  END IF;

  -- Vérifier si l'utilisateur a déjà le rôle admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  ) INTO role_exists;

  IF role_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cet utilisateur est déjà admin',
      'user_id', target_user_id
    );
  END IF;

  -- Ajouter le rôle admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Utilisateur promu au rôle admin avec succès',
    'user_id', target_user_id,
    'email', user_email
  );
END;
$$;

-- Commentaire explicatif
COMMENT ON FUNCTION public.make_user_admin(TEXT) IS 
'Fonction pour promouvoir un utilisateur existant au rôle admin. 
Usage: SELECT public.make_user_admin(''email@example.com'');';