// Social Media Post Templates Configuration

export interface SocialTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'post' | 'reel' | 'carousel';
  style: 'minimal' | 'premium' | 'tech' | 'gradient' | 'apple' | 'canva';
  layout: 'spotlight' | 'before_after' | 'feature' | 'testimonial' | 'promo' | 'carousel';
  colors: {
    background: string;
    text: string;
    accent: string;
    overlay?: string;
  };
  typography: {
    titleSize: string;
    subtitleSize: string;
    bodySize: string;
    fontFamily: string;
  };
  elements: {
    showLogo: boolean;
    showPrice: boolean;
    showCta: boolean;
    showColorSwatches: boolean;
    overlay: 'none' | 'gradient' | 'solid' | 'blur';
  };
}

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  // Template 1 - Product Spotlight (Premium style like Loungitude)
  {
    id: 'product_spotlight',
    name: 'Produit Spotlight',
    nameEn: 'Product Spotlight',
    description: 'Style moderne & premium avec image produit, titre, prix et CTA',
    descriptionEn: 'Modern & premium style with product image, title, price and CTA',
    category: 'post',
    style: 'premium',
    layout: 'spotlight',
    colors: {
      background: 'hsl(30, 20%, 95%)', // Cream
      text: 'hsl(0, 0%, 10%)',
      accent: 'hsl(15, 80%, 55%)', // Orange-red for price
      overlay: 'rgba(255,255,255,0.3)'
    },
    typography: {
      titleSize: '2.5rem',
      subtitleSize: '1.125rem',
      bodySize: '1rem',
      fontFamily: 'serif'
    },
    elements: {
      showLogo: true,
      showPrice: true,
      showCta: true,
      showColorSwatches: true,
      overlay: 'none'
    }
  },
  // Template 2 - Before/After SEO
  {
    id: 'before_after',
    name: 'Avant / Après SEO',
    nameEn: 'Before / After SEO',
    description: 'Comparaison avant/après avec style tech NewAI',
    descriptionEn: 'Before/after comparison with NewAI tech style',
    category: 'post',
    style: 'tech',
    layout: 'before_after',
    colors: {
      background: 'hsl(220, 50%, 15%)', // Dark blue
      text: 'hsl(0, 0%, 100%)',
      accent: 'hsl(220, 100%, 60%)', // Bright blue
      overlay: 'rgba(99, 102, 241, 0.2)'
    },
    typography: {
      titleSize: '2rem',
      subtitleSize: '1rem',
      bodySize: '0.875rem',
      fontFamily: 'sans-serif'
    },
    elements: {
      showLogo: true,
      showPrice: false,
      showCta: true,
      showColorSwatches: false,
      overlay: 'gradient'
    }
  },
  // Template 3 - Feature Highlight
  {
    id: 'feature_highlight',
    name: 'Feature Highlight',
    nameEn: 'Feature Highlight',
    description: 'Mise en avant d\'une fonctionnalité avec gradient tech',
    descriptionEn: 'Feature spotlight with tech gradient',
    category: 'post',
    style: 'gradient',
    layout: 'feature',
    colors: {
      background: 'linear-gradient(135deg, hsl(250, 80%, 60%), hsl(280, 80%, 50%))',
      text: 'hsl(0, 0%, 100%)',
      accent: 'hsl(45, 100%, 60%)', // Gold
      overlay: 'rgba(0,0,0,0.3)'
    },
    typography: {
      titleSize: '2.25rem',
      subtitleSize: '1.25rem',
      bodySize: '1rem',
      fontFamily: 'sans-serif'
    },
    elements: {
      showLogo: true,
      showPrice: false,
      showCta: true,
      showColorSwatches: false,
      overlay: 'gradient'
    }
  },
  // Template 4 - Testimonial
  {
    id: 'testimonial',
    name: 'Avis Client',
    nameEn: 'Customer Review',
    description: 'Citation client avec avatar et fond clair',
    descriptionEn: 'Customer quote with avatar and light background',
    category: 'post',
    style: 'minimal',
    layout: 'testimonial',
    colors: {
      background: 'hsl(0, 0%, 98%)',
      text: 'hsl(0, 0%, 20%)',
      accent: 'hsl(220, 80%, 55%)',
      overlay: 'none'
    },
    typography: {
      titleSize: '1.5rem',
      subtitleSize: '1rem',
      bodySize: '0.875rem',
      fontFamily: 'serif'
    },
    elements: {
      showLogo: true,
      showPrice: false,
      showCta: true,
      showColorSwatches: false,
      overlay: 'none'
    }
  },
  // Template 5 - Promo / Black Friday
  {
    id: 'promo',
    name: 'Promo du Jour',
    nameEn: 'Daily Promo',
    description: 'Couleurs contrastées, prix barré, CTA urgent',
    descriptionEn: 'High contrast colors, crossed price, urgent CTA',
    category: 'post',
    style: 'canva',
    layout: 'promo',
    colors: {
      background: 'hsl(0, 0%, 5%)', // Near black
      text: 'hsl(0, 0%, 100%)',
      accent: 'hsl(0, 100%, 50%)', // Red
      overlay: 'rgba(255, 0, 0, 0.1)'
    },
    typography: {
      titleSize: '3rem',
      subtitleSize: '1.5rem',
      bodySize: '1rem',
      fontFamily: 'sans-serif'
    },
    elements: {
      showLogo: true,
      showPrice: true,
      showCta: true,
      showColorSwatches: false,
      overlay: 'solid'
    }
  },
  // Template 6 - Carousel Éducatif
  {
    id: 'carousel_educatif',
    name: 'Carrousel Éducatif',
    nameEn: 'Educational Carousel',
    description: 'Multi-slides avec conseils et astuces',
    descriptionEn: 'Multi-slides with tips and advice',
    category: 'carousel',
    style: 'apple',
    layout: 'carousel',
    colors: {
      background: 'hsl(40, 30%, 92%)', // Warm beige
      text: 'hsl(30, 20%, 20%)',
      accent: 'hsl(30, 60%, 45%)', // Brown
      overlay: 'none'
    },
    typography: {
      titleSize: '1.75rem',
      subtitleSize: '1rem',
      bodySize: '0.875rem',
      fontFamily: 'sans-serif'
    },
    elements: {
      showLogo: true,
      showPrice: false,
      showCta: true,
      showColorSwatches: false,
      overlay: 'none'
    }
  }
];

// Get random template based on context
export function getRandomTemplate(options?: {
  category?: 'post' | 'reel' | 'carousel';
  excludeIds?: string[];
}): SocialTemplate {
  let filtered = [...SOCIAL_TEMPLATES];
  
  if (options?.category) {
    filtered = filtered.filter(t => t.category === options.category);
  }
  
  if (options?.excludeIds?.length) {
    filtered = filtered.filter(t => !options.excludeIds!.includes(t.id));
  }
  
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || SOCIAL_TEMPLATES[0];
}

// Get smart template based on content type and season
export function getSmartTemplate(context: {
  contentType: 'product' | 'collection' | 'article';
  hasPromotion?: boolean;
  season?: 'blackfriday' | 'christmas' | 'summer' | 'normal';
}): SocialTemplate {
  const { contentType, hasPromotion, season } = context;
  
  // Black Friday or Christmas → Promo template
  if (season === 'blackfriday' || season === 'christmas' || hasPromotion) {
    return SOCIAL_TEMPLATES.find(t => t.id === 'promo')!;
  }
  
  // Product → Product Spotlight
  if (contentType === 'product') {
    return SOCIAL_TEMPLATES.find(t => t.id === 'product_spotlight')!;
  }
  
  // Article → Feature Highlight or Carousel
  if (contentType === 'article') {
    return Math.random() > 0.5 
      ? SOCIAL_TEMPLATES.find(t => t.id === 'feature_highlight')!
      : SOCIAL_TEMPLATES.find(t => t.id === 'carousel_educatif')!;
  }
  
  // Collection → Before/After or Spotlight
  return getRandomTemplate({ category: 'post' });
}
