-- Étape 1: Compléter les design styles avec instructions détaillées dans option_value

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{rules}',
  jsonb_build_array(
    'Utiliser des ombres profondes (shadow-2xl) et des dégradés subtils',
    'Typographie élégante avec grandes tailles de police pour les titres',
    'Espacements généreux (padding et margins larges)',
    'Bordures fines et coins légèrement arrondis (rounded-lg)',
    'Effets hover sophistiqués avec transitions douces',
    'Couleurs primaires riches et saturées',
    'Background avec texture subtile ou dégradé léger'
  )
)
WHERE category = 'design_style' AND option_key = 'luxury';

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{rules}',
  jsonb_build_array(
    'Utiliser des coins très arrondis (rounded-2xl, rounded-3xl)',
    'Couleurs vives et contrastées',
    'Ombres colorées légères avec la couleur primaire',
    'Animations et transitions dynamiques',
    'Typographie fun et accessible',
    'Espacements ludiques et asymétriques',
    'Effets hover enjoués (scale, bounce)',
    'Dégradés vibrants pour les boutons et sections clés'
  )
)
WHERE category = 'design_style' AND option_key = 'playful';

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{rules}',
  jsonb_build_array(
    'Design professionnel et sobre',
    'Couleurs neutres avec accents corporates',
    'Typographie sans-serif classique',
    'Grille structurée et alignements stricts',
    'Ombres discrètes (shadow-sm, shadow-md)',
    'Coins peu arrondis (rounded-md)',
    'Hiérarchie visuelle claire et organisée',
    'Espacements réguliers et prévisibles'
  )
)
WHERE category = 'design_style' AND option_key = 'corporate';

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{rules}',
  jsonb_build_array(
    'Maximum de blanc et espace négatif',
    'PAS de dégradés, PAS d''ombres',
    'Bordures minimalistes (1px, couleur neutre)',
    'Typographie simple et lisible',
    'Coins carrés ou très peu arrondis (rounded-sm)',
    'Couleurs limitées (2-3 maximum)',
    'Hiérarchie par taille et poids de police uniquement',
    'Pas d''effets décoratifs'
  )
)
WHERE category = 'design_style' AND option_key = 'minimalist';

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{rules}',
  jsonb_build_array(
    'Dégradés légers et subtils',
    'Ombres moyennes (shadow-lg)',
    'Coins moyennement arrondis (rounded-xl)',
    'Typographie moderne sans-serif',
    'Effets glassmorphism légers (backdrop-blur)',
    'Couleurs tendances et harmonieuses',
    'Animations fluides et modernes',
    'Mix de flat design et profondeur subtile'
  )
)
WHERE category = 'design_style' AND option_key = 'modern';

-- Étape 2: Ajouter textMuted à tous les color schemes dans option_value->colors
UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(240, 5%, 64%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'slate' 
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(215, 16%, 60%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'blue'
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(142, 12%, 55%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'green'
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(24, 15%, 58%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'amber'
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(0, 12%, 60%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'rose'
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(280, 15%, 62%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key = 'purple'
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');

-- Fallback générique pour toute autre palette sans textMuted
UPDATE landing_page_config_options
SET option_value = jsonb_set(
  option_value,
  '{colors,textMuted}',
  '"hsl(0, 0%, 60%)"'::jsonb
)
WHERE category = 'color_scheme' 
  AND option_key NOT IN ('slate', 'blue', 'green', 'amber', 'rose', 'purple')
  AND (option_value->'colors'->>'textMuted' IS NULL OR option_value->'colors'->>'textMuted' = '');