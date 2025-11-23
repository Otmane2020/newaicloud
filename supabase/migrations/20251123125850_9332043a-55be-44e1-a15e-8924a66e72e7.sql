-- ✅ PHASE 5.3: Créer des données de test pour faciliter les tests

-- Insérer des préférences de test pour chaque palette de couleurs
-- Note: Remplacer 'YOUR_USER_ID' par un vrai user_id dans votre application

-- Fonction helper pour créer des préférences de test
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Récupérer un utilisateur existant (ou en créer un pour les tests)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Supprimer les anciennes préférences de test si elles existent
    DELETE FROM landing_page_preferences 
    WHERE user_id = test_user_id 
    AND palette_id IN ('ocean_blue', 'forest_green', 'sunset_orange');
    
    -- Insérer préférence Ocean Blue (par défaut)
    INSERT INTO landing_page_preferences (
      user_id, layout, design_style, content_length,
      palette_id,
      color_primary, color_secondary, color_accent,
      color_background, color_surface, color_text, color_text_muted,
      is_default
    ) VALUES (
      test_user_id, 'hero', 'modern', 'medium',
      'ocean_blue',
      'hsl(199, 89%, 48%)', 'hsl(187, 85%, 53%)', 'hsl(172, 66%, 50%)',
      'hsl(0, 0%, 100%)', 'hsl(195, 53%, 97%)', 'hsl(200, 24%, 10%)', 'hsl(200, 24%, 40%)',
      true
    );
    
    -- Insérer préférence Forest Green
    INSERT INTO landing_page_preferences (
      user_id, layout, design_style, content_length,
      palette_id,
      color_primary, color_secondary, color_accent,
      color_background, color_surface, color_text, color_text_muted,
      is_default
    ) VALUES (
      test_user_id, 'hero', 'modern', 'medium',
      'forest_green',
      'hsl(142, 76%, 36%)', 'hsl(158, 72%, 42%)', 'hsl(174, 65%, 48%)',
      'hsl(0, 0%, 100%)', 'hsl(142, 44%, 97%)', 'hsl(142, 20%, 15%)', 'hsl(142, 20%, 40%)',
      false
    );
    
    -- Insérer préférence Sunset Orange
    INSERT INTO landing_page_preferences (
      user_id, layout, design_style, content_length,
      palette_id,
      color_primary, color_secondary, color_accent,
      color_background, color_surface, color_text, color_text_muted,
      is_default
    ) VALUES (
      test_user_id, 'hero', 'elegant', 'long',
      'sunset_orange',
      'hsl(24, 95%, 53%)', 'hsl(33, 92%, 58%)', 'hsl(43, 88%, 63%)',
      'hsl(0, 0%, 100%)', 'hsl(24, 56%, 97%)', 'hsl(24, 20%, 15%)', 'hsl(24, 20%, 40%)',
      false
    );
    
    RAISE NOTICE 'Préférences de test insérées avec succès pour user_id: %', test_user_id;
  ELSE
    RAISE NOTICE 'Aucun utilisateur trouvé. Créez un compte utilisateur d''abord.';
  END IF;
END $$;

-- Créer un commentaire pour la documentation
COMMENT ON TABLE landing_page_preferences IS 'Contient les préférences de génération de landing pages. Des données de test sont disponibles pour faciliter le développement.';
