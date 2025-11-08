-- Créer un compte superadmin complet
-- Cette fonction crée un utilisateur avec le rôle admin directement

DO $$
DECLARE
  new_user_id UUID;
  admin_email TEXT := 'superadmin@newai.sale';
  admin_password TEXT := 'SuperAdmin2025!';  -- Mot de passe temporaire à changer après première connexion
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;

  -- Si l'utilisateur n'existe pas, le créer
  IF new_user_id IS NULL THEN
    -- Créer l'utilisateur dans auth.users avec le mot de passe
    -- Note: La création d'utilisateur via SQL nécessite de hasher le mot de passe
    -- Pour simplicité, on va créer un utilisateur qui devra être confirmé
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),  -- Hash du mot de passe
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      false,
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    RAISE NOTICE 'Utilisateur superadmin créé avec ID: %', new_user_id;

    -- Créer le profil
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new_user_id, admin_email, 'Super Admin')
    ON CONFLICT (id) DO NOTHING;

    -- Ajouter le rôle admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Créer les paramètres de notification
    INSERT INTO public.notification_settings (
      user_id,
      email_enabled,
      in_app_enabled,
      daily_digest,
      digest_hour
    ) VALUES (
      new_user_id,
      true,
      true,
      false,
      9
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Super administrateur créé avec succès!';
    RAISE NOTICE 'Email: %', admin_email;
    RAISE NOTICE 'Mot de passe temporaire: %', admin_password;
  ELSE
    RAISE NOTICE 'L''utilisateur existe déjà avec ID: %', new_user_id;
    
    -- S'assurer qu'il a le rôle admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;