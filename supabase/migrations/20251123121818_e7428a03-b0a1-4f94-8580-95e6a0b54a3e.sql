-- Harmoniser le format des couleurs dans landing_page_config_options
-- Convertir "221 83% 53%" en "hsl(221, 83%, 53%)"

UPDATE landing_page_config_options
SET option_value = jsonb_build_object(
  'primary', CASE 
    WHEN option_value->>'primary' LIKE 'hsl(%' THEN option_value->>'primary'
    ELSE 'hsl(' || replace(option_value->>'primary', ' ', ', ') || ')'
  END,
  'secondary', CASE 
    WHEN option_value->>'secondary' LIKE 'hsl(%' THEN option_value->>'secondary'
    ELSE 'hsl(' || replace(option_value->>'secondary', ' ', ', ') || ')'
  END,
  'accent', CASE 
    WHEN option_value->>'accent' LIKE 'hsl(%' THEN option_value->>'accent'
    ELSE 'hsl(' || replace(option_value->>'accent', ' ', ', ') || ')'
  END,
  'background', CASE 
    WHEN option_value->>'background' LIKE 'hsl(%' THEN option_value->>'background'
    ELSE 'hsl(' || replace(option_value->>'background', ' ', ', ') || ')'
  END,
  'surface', CASE 
    WHEN option_value->>'surface' LIKE 'hsl(%' THEN option_value->>'surface'
    ELSE 'hsl(' || replace(option_value->>'surface', ' ', ', ') || ')'
  END,
  'text', CASE 
    WHEN option_value->>'text' LIKE 'hsl(%' THEN option_value->>'text'
    ELSE 'hsl(' || replace(option_value->>'text', ' ', ', ') || ')'
  END,
  'textMuted', CASE 
    WHEN option_value->>'textMuted' LIKE 'hsl(%' THEN option_value->>'textMuted'
    ELSE 'hsl(' || replace(option_value->>'textMuted', ' ', ', ') || ')'
  END
)
WHERE category = 'color_scheme'
AND option_value IS NOT NULL;