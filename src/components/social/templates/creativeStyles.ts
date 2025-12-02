// Creative AI Styles for Social Media Image Generation
// Each style defines how Gemini will generate the final image

export interface CreativeStyle {
  id: string;
  name: string;
  category: 'lifestyle' | 'luxury' | 'minimal' | 'neon' | 'seasonal' | 'editorial' | 'dynamic';
  size: 'square' | 'story' | 'landscape';
  previewGradient: string; // For template card preview
  previewIcon: string; // Emoji/icon for preview
  aiPromptStyle: string; // Critical: The AI generation style description
  moodKeywords: string[];
  accentColor: string;
}

// 30+ Creative AI Styles for diverse social media content
export const CREATIVE_STYLES: CreativeStyle[] = [
  // ============= LUXURY CATEGORY =============
  {
    id: 'luxury_showroom',
    name: 'Showroom Luxe',
    category: 'luxury',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    previewIcon: '✨',
    accentColor: '#FFD700',
    moodKeywords: ['premium', 'élégant', 'raffiné', 'haut de gamme'],
    aiPromptStyle: `LUXURY SHOWROOM STYLE:
- Dark elegant showroom background with marble floor
- Dramatic spotlight from above creating volumetric light beams
- Golden rays and sparkle particles radiating from product
- Glossy floor with perfect mirror reflection of product
- Decorative elements: golden pillars, ambient wall sconces, subtle clock details
- Product elevated on illuminated pedestal
- Rich dark purple/navy atmosphere with gold accents
- Professional 8K render quality, photorealistic lighting`
  },
  {
    id: 'luxury_gold_burst',
    name: 'Éclat Doré',
    category: 'luxury',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 50%, #0d0d1a 100%)',
    previewIcon: '🌟',
    accentColor: '#F4C430',
    moodKeywords: ['explosif', 'luxueux', 'éclatant', 'prestigieux'],
    aiPromptStyle: `GOLD BURST LUXURY STYLE:
- Dramatic explosion of golden light rays behind product
- Dark luxurious background with subtle texture
- Floating golden particles and sparkles
- Product as hero with strong rim lighting
- Metallic gold accents throughout
- Light beams creating starburst effect
- Premium jewelry-ad quality aesthetic
- High contrast with deep shadows and bright highlights`
  },
  {
    id: 'luxury_velvet',
    name: 'Velours Royal',
    category: 'luxury',
    size: 'story',
    previewGradient: 'linear-gradient(180deg, #4a0e2b 0%, #2d0a1a 50%, #1a0510 100%)',
    previewIcon: '👑',
    accentColor: '#C9A227',
    moodKeywords: ['royal', 'somptueux', 'noble', 'majestueux'],
    aiPromptStyle: `ROYAL VELVET LUXURY STYLE:
- Deep burgundy/wine red velvet background
- Soft diffused lighting with golden rim light
- Product on plush velvet surface
- Subtle crown or royal motifs in background
- Warm candlelight ambient glow
- Rich textures: velvet, silk, satin feel
- Opulent, regal atmosphere
- Intimate luxury boutique aesthetic`
  },

  // ============= LIFESTYLE CATEGORY =============
  {
    id: 'lifestyle_living',
    name: 'Salon Moderne',
    category: 'lifestyle',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #f5f0e8 0%, #e8dcc8 50%, #d4c4a8 100%)',
    previewIcon: '🛋️',
    accentColor: '#8B7355',
    moodKeywords: ['chaleureux', 'accueillant', 'confortable', 'moderne'],
    aiPromptStyle: `MODERN LIVING ROOM LIFESTYLE:
- Bright, airy Scandinavian-style living room
- Natural daylight streaming through large windows
- Product styled naturally in the room context
- Cozy textures: wool throws, soft cushions, plants
- Warm wood tones and neutral color palette
- Lifestyle magazine quality photography
- Aspirational "I want to live here" feeling
- Soft shadows, natural color grading`
  },
  {
    id: 'lifestyle_bedroom',
    name: 'Chambre Cosy',
    category: 'lifestyle',
    size: 'story',
    previewGradient: 'linear-gradient(180deg, #faf8f5 0%, #f0ebe3 50%, #e5ddd3 100%)',
    previewIcon: '🛏️',
    accentColor: '#A0826D',
    moodKeywords: ['cosy', 'douillet', 'paisible', 'serein'],
    aiPromptStyle: `COZY BEDROOM LIFESTYLE:
- Serene bedroom setting with soft morning light
- Crisp white linens, plush pillows, soft textures
- Product integrated naturally into the scene
- Warm ambient lighting (golden hour feel)
- Plants, books, candles as lifestyle props
- Calming, peaceful atmosphere
- High-end interior design magazine aesthetic
- Dreamy, soft focus on background elements`
  },
  {
    id: 'lifestyle_outdoor',
    name: 'Terrasse Été',
    category: 'lifestyle',
    size: 'landscape',
    previewGradient: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 50%, #F0E68C 100%)',
    previewIcon: '☀️',
    accentColor: '#FF6B35',
    moodKeywords: ['ensoleillé', 'frais', 'naturel', 'détente'],
    aiPromptStyle: `SUMMER TERRACE LIFESTYLE:
- Beautiful outdoor terrace or garden setting
- Golden hour sunlight with lens flares
- Lush greenery, potted plants, natural wood
- Product showcased in outdoor living context
- Mediterranean or tropical vacation feel
- Refreshing, bright, optimistic mood
- Travel magazine quality photography
- Warm sunset tones and natural shadows`
  },

  // ============= MINIMAL CATEGORY =============
  {
    id: 'minimal_white',
    name: 'Studio Blanc',
    category: 'minimal',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
    previewIcon: '⬜',
    accentColor: '#000000',
    moodKeywords: ['épuré', 'zen', 'pur', 'sophistiqué'],
    aiPromptStyle: `MINIMALIST WHITE STUDIO:
- Pure white infinite background
- Soft, even studio lighting from all sides
- Perfect product shadows on white surface
- Clean, distraction-free composition
- Apple-style product photography aesthetic
- Subtle gradient shadow beneath product
- Ultra-clean, professional e-commerce feel
- Focus entirely on product beauty`
  },
  {
    id: 'minimal_concrete',
    name: 'Béton Brut',
    category: 'minimal',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #6b6b6b 0%, #8a8a8a 50%, #a8a8a8 100%)',
    previewIcon: '🏗️',
    accentColor: '#2D3436',
    moodKeywords: ['industriel', 'brut', 'authentique', 'design'],
    aiPromptStyle: `RAW CONCRETE MINIMAL:
- Industrial concrete/cement background texture
- Hard directional lighting creating strong shadows
- Product on raw concrete or steel surface
- Brutalist architecture inspired setting
- Neutral gray palette with subtle warm tones
- Designer furniture catalog aesthetic
- Artistic, gallery-like presentation
- Bold contrast between product and background`
  },
  {
    id: 'minimal_paper',
    name: 'Papier Kraft',
    category: 'minimal',
    size: 'story',
    previewGradient: 'linear-gradient(180deg, #c9b896 0%, #d4c4a8 50%, #e0d5c0 100%)',
    previewIcon: '📦',
    accentColor: '#5D4E37',
    moodKeywords: ['artisanal', 'écologique', 'naturel', 'authentique'],
    aiPromptStyle: `KRAFT PAPER MINIMAL:
- Warm kraft paper or recycled cardboard background
- Soft natural daylight, window light feel
- Product on natural materials (wood, linen, paper)
- Eco-friendly, sustainable aesthetic
- Dried flowers, twine, natural elements as accents
- Artisan marketplace quality
- Warm, organic, handcrafted atmosphere
- Instagram flatlay inspired composition`
  },

  // ============= NEON/TECH CATEGORY =============
  {
    id: 'neon_cyberpunk',
    name: 'Cyberpunk',
    category: 'neon',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000033 100%)',
    previewIcon: '🌃',
    accentColor: '#FF00FF',
    moodKeywords: ['futuriste', 'électrique', 'audacieux', 'tech'],
    aiPromptStyle: `CYBERPUNK NEON STYLE:
- Dark futuristic cityscape background
- Vivid neon lights: pink, cyan, purple glows
- Product with dramatic neon rim lighting
- Reflective wet surfaces, rain effects
- Holographic/glitch elements
- Blade Runner/Cyberpunk 2077 aesthetic
- High contrast with deep blacks
- Electric, energetic, futuristic mood`
  },
  {
    id: 'neon_retrowave',
    name: 'Rétro Wave',
    category: 'neon',
    size: 'landscape',
    previewGradient: 'linear-gradient(180deg, #1a0033 0%, #330066 30%, #ff0066 70%, #ffcc00 100%)',
    previewIcon: '🌅',
    accentColor: '#FF6EC7',
    moodKeywords: ['rétro', 'synthwave', 'années 80', 'nostalgique'],
    aiPromptStyle: `RETROWAVE 80s STYLE:
- Synthwave sunset gradient (purple to pink to orange)
- Neon grid floor stretching to horizon
- Palm trees or geometric mountains silhouette
- Product floating on reflective chrome platform
- VHS scan lines, chromatic aberration effects
- Retro 80s Miami Vice aesthetic
- Sunset gradient sky with multiple suns
- Vaporwave/outrun visual style`
  },
  {
    id: 'neon_gamer',
    name: 'Gaming RGB',
    category: 'neon',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #16213e 100%)',
    previewIcon: '🎮',
    accentColor: '#00FF00',
    moodKeywords: ['gaming', 'RGB', 'tech', 'performance'],
    aiPromptStyle: `GAMING RGB TECH STYLE:
- Dark tech setup background
- RGB lighting: shifting rainbow colors
- Product with multi-colored LED glow effects
- Futuristic hexagonal patterns
- Gaming/esports aesthetic
- High-tech materials: carbon fiber, aluminum
- Energy lines and circuit board elements
- Power-up, level-up energy feeling`
  },

  // ============= SEASONAL CATEGORY =============
  {
    id: 'seasonal_christmas',
    name: 'Noël Féerique',
    category: 'seasonal',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #0f5132 0%, #1a472a 50%, #8B0000 100%)',
    previewIcon: '🎄',
    accentColor: '#FFD700',
    moodKeywords: ['festif', 'magique', 'chaleureux', 'féérique'],
    aiPromptStyle: `MAGICAL CHRISTMAS STYLE:
- Cozy Christmas setting with twinkling lights
- Deep red and forest green color palette
- Bokeh fairy lights in background
- Product surrounded by gift boxes, ornaments
- Warm fireplace glow ambiance
- Snow falling or frost effects
- Golden ribbon and bow accents
- Magical, cozy holiday atmosphere`
  },
  {
    id: 'seasonal_blackfriday',
    name: 'Black Friday',
    category: 'seasonal',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #FFD700 100%)',
    previewIcon: '🏷️',
    accentColor: '#FFD700',
    moodKeywords: ['urgent', 'exclusif', 'limité', 'deal'],
    aiPromptStyle: `BLACK FRIDAY PROMO STYLE:
- Bold black background with explosive gold accents
- Product bursting through with energy rays
- Lightning bolts, explosion effects
- Giant percentage/discount numbers
- Urgent, limited-time visual cues
- Shopping bag or sale tag elements
- High energy, action-packed composition
- "Don't miss this" urgency feeling`
  },
  {
    id: 'seasonal_summer',
    name: 'Soldes Été',
    category: 'seasonal',
    size: 'story',
    previewGradient: 'linear-gradient(180deg, #FF6B35 0%, #FF8C42 30%, #FFF275 70%, #87CEEB 100%)',
    previewIcon: '🌊',
    accentColor: '#00CED1',
    moodKeywords: ['frais', 'vacances', 'plage', 'soleil'],
    aiPromptStyle: `SUMMER SALE STYLE:
- Bright beach/pool summer vibes
- Vibrant coral, turquoise, yellow palette
- Tropical leaves, palm shadows
- Product in vacation/beach context
- Refreshing water splashes or ice effects
- Sunglasses, sunscreen props
- Bright, happy, vacation mood
- Festival/pool party energy`
  },
  {
    id: 'seasonal_valentine',
    name: 'Saint Valentin',
    category: 'seasonal',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #dc143c 100%)',
    previewIcon: '💕',
    accentColor: '#FF1493',
    moodKeywords: ['romantique', 'amour', 'passion', 'couple'],
    aiPromptStyle: `VALENTINE'S ROMANTIC STYLE:
- Soft pink and red romantic palette
- Rose petals floating or scattered
- Heart-shaped bokeh lights
- Product presented as perfect gift
- Silk, satin, soft textures
- Candlelight romantic ambiance
- Luxury gift box presentation
- Love letter, flowers as props`
  },

  // ============= EDITORIAL CATEGORY =============
  {
    id: 'editorial_magazine',
    name: 'Magazine Déco',
    category: 'editorial',
    size: 'landscape',
    previewGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #95a5a6 100%)',
    previewIcon: '📰',
    accentColor: '#E74C3C',
    moodKeywords: ['éditorial', 'magazine', 'professionnel', 'design'],
    aiPromptStyle: `EDITORIAL MAGAZINE STYLE:
- Professional interior design magazine layout
- Sophisticated, curated room setting
- Strong diagonal composition
- Designer furniture context
- Architectural elements visible
- Natural daylight with defined shadows
- High-fashion interior photography
- Vogue/Elle Décoration quality aesthetic`
  },
  {
    id: 'editorial_catalog',
    name: 'Catalogue Premium',
    category: 'editorial',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #f5f5dc 0%, #dcd0c0 50%, #c2b280 100%)',
    previewIcon: '📖',
    accentColor: '#8B4513',
    moodKeywords: ['élégant', 'classique', 'intemporel', 'chic'],
    aiPromptStyle: `PREMIUM CATALOG STYLE:
- Clean, elegant catalog photography
- Neutral backdrop with subtle texture
- Perfect studio lighting, no harsh shadows
- Product hero shot with 45° angle
- Warm, inviting color temperature
- Luxury brand catalog aesthetic
- Timeless, classic composition
- Roche Bobois/BoConcept quality`
  },
  {
    id: 'editorial_architect',
    name: 'Architecte d\'Intérieur',
    category: 'editorial',
    size: 'story',
    previewGradient: 'linear-gradient(180deg, #1a1a1a 0%, #333333 50%, #666666 100%)',
    previewIcon: '🏛️',
    accentColor: '#C0C0C0',
    moodKeywords: ['architecte', 'haut de gamme', 'design', 'exclusif'],
    aiPromptStyle: `INTERIOR ARCHITECT STYLE:
- High-end architectural interior
- Dramatic perspective, strong lines
- Monochromatic with accent color pops
- Product in designed space context
- Luxury materials: marble, brass, leather
- Moody, sophisticated lighting
- Architectural Digest quality
- Gallery or showroom ambiance`
  },

  // ============= DYNAMIC CATEGORY =============
  {
    id: 'dynamic_action',
    name: 'Action Shot',
    category: 'dynamic',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #ff4500 0%, #ff6b35 50%, #ffa500 100%)',
    previewIcon: '💥',
    accentColor: '#FF4500',
    moodKeywords: ['dynamique', 'énergie', 'mouvement', 'impact'],
    aiPromptStyle: `DYNAMIC ACTION STYLE:
- Explosive energy and movement
- Dramatic angle, dutch tilt perspective
- Motion blur on background elements
- Product as center of energy burst
- Debris, particles flying outward
- Speed lines, impact effects
- Sports/action movie poster aesthetic
- High adrenaline, powerful feeling`
  },
  {
    id: 'dynamic_3d',
    name: '3D Flottant',
    category: 'dynamic',
    size: 'square',
    previewGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    previewIcon: '🔮',
    accentColor: '#9B59B6',
    moodKeywords: ['3D', 'lévitation', 'moderne', 'créatif'],
    aiPromptStyle: `FLOATING 3D STYLE:
- Product floating/levitating in space
- Soft gradient background (purple to pink)
- Gentle shadow below product
- Geometric shapes floating around
- Clean 3D render aesthetic
- Soft ambient occlusion lighting
- Tech product launch style
- Apple/Samsung product reveal quality`
  },
  {
    id: 'dynamic_split',
    name: 'Before/After',
    category: 'dynamic',
    size: 'landscape',
    previewGradient: 'linear-gradient(90deg, #bdc3c7 0%, #bdc3c7 50%, #2c3e50 50%, #2c3e50 100%)',
    previewIcon: '↔️',
    accentColor: '#27AE60',
    moodKeywords: ['transformation', 'comparaison', 'impact', 'résultat'],
    aiPromptStyle: `BEFORE/AFTER SPLIT STYLE:
- Split screen comparison layout
- Left: dull/gray/unoptimized version
- Right: vibrant/enhanced/optimized version
- Clear diagonal or vertical divider
- Dramatic difference visualization
- Product shown in both states
- Infographic quality presentation
- Clear visual impact demonstration`
  }
];

// Get styles by category
export function getStylesByCategory(category: CreativeStyle['category']): CreativeStyle[] {
  return CREATIVE_STYLES.filter(s => s.category === category);
}

// Get styles by size
export function getStylesBySize(size: CreativeStyle['size']): CreativeStyle[] {
  return CREATIVE_STYLES.filter(s => s.size === size);
}

// Get all categories
export function getCategories(): { id: CreativeStyle['category']; name: string; icon: string }[] {
  return [
    { id: 'luxury', name: 'Luxe & Premium', icon: '✨' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🏠' },
    { id: 'minimal', name: 'Minimaliste', icon: '⬜' },
    { id: 'neon', name: 'Néon & Tech', icon: '🌃' },
    { id: 'seasonal', name: 'Saisonnier', icon: '🎄' },
    { id: 'editorial', name: 'Éditorial', icon: '📰' },
    { id: 'dynamic', name: 'Dynamique', icon: '💥' }
  ];
}

// Get all sizes
export function getSizes(): { id: CreativeStyle['size']; name: string; ratio: string }[] {
  return [
    { id: 'square', name: 'Carré', ratio: '1:1' },
    { id: 'story', name: 'Story', ratio: '9:16' },
    { id: 'landscape', name: 'Paysage', ratio: '16:9' }
  ];
}
