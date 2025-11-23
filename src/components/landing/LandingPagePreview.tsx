import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Star, Truck, Shield, RefreshCcw } from 'lucide-react';

interface LandingPagePreviewProps {
  layout: string;
  designStyle: string;
  contentLength: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  highlights: string[];
}

export function LandingPagePreview({
  layout,
  designStyle,
  contentLength,
  colors,
  highlights
}: LandingPagePreviewProps) {
  if (!layout || !designStyle || !contentLength || !colors.primary) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-lg border bg-muted/20">
        <div className="text-center space-y-2 p-8">
          <p className="text-lg font-medium text-muted-foreground">
            Sélectionnez les options pour voir la prévisualisation
          </p>
          <p className="text-sm text-muted-foreground">
            Choisissez un layout, un style, une longueur de contenu et une palette de couleurs
          </p>
        </div>
      </div>
    );
  }

  const isMinimal = designStyle === 'minimal';
  const isModern = designStyle === 'modern';
  const isLuxury = designStyle === 'luxury';
  
  const isShort = contentLength === 'short';
  const isMedium = contentLength === 'medium';
  const isLong = contentLength === 'long';
  
  const highlightIcons: Record<string, any> = {
    'free_shipping': <Truck className="h-5 w-5" />,
    'money_back': <Shield className="h-5 w-5" />,
    'eco_friendly': <RefreshCcw className="h-5 w-5" />,
    'handmade': <Heart className="h-5 w-5" />,
    'limited_edition': <Star className="h-5 w-5" />
  };

  const highlightLabels: Record<string, string> = {
    'free_shipping': 'Livraison Gratuite',
    'money_back': 'Garantie Satisfait',
    'eco_friendly': 'Éco-Responsable',
    'handmade': 'Fait Main',
    'limited_edition': 'Édition Limitée'
  };

  const previewStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    '--preview-primary': colors.primary,
    '--preview-secondary': colors.secondary,
    '--preview-accent': colors.accent,
    '--preview-surface': colors.surface,
    '--preview-text-muted': colors.textMuted,
  } as React.CSSProperties;

  if (layout === 'hero_split') {
    return (
      <div className="w-full h-full overflow-auto rounded-lg border" style={previewStyle}>
        <div className="grid md:grid-cols-2 min-h-[600px]">
          <div className="relative" style={{ backgroundColor: colors.surface }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className={`w-3/4 h-3/4 ${isLuxury ? '' : 'rounded-lg'}`}
                style={{ backgroundColor: colors.primary, opacity: 0.1 }} 
              />
              <div className="absolute text-6xl opacity-20">🛋️</div>
            </div>
          </div>
          
          <div className="p-8 md:p-12 flex flex-col justify-center">
            {isLuxury && (
              <Badge className="w-fit mb-4" style={{ backgroundColor: colors.accent, color: colors.background }}>
                Collection Exclusive
              </Badge>
            )}
            
            <h1 className={`font-bold mb-4 ${isLuxury ? 'text-4xl md:text-5xl font-serif' : isModern ? 'text-3xl md:text-4xl' : 'text-3xl font-light tracking-wide'}`}>
              {isLuxury ? 'Canapé Prestige' : isModern ? 'Canapé Design Moderne' : 'Canapé Essentiel'}
            </h1>
            
            <p className={`mb-6 ${isLong ? 'text-base' : 'text-sm'}`} style={{ color: colors.textMuted }}>
              {isShort && "Élégance et confort réunis dans un design contemporain."}
              {isMedium && "Découvrez notre canapé design qui allie élégance moderne et confort optimal. Parfait pour votre salon, il s'intègre harmonieusement dans tous les intérieurs."}
              {isLong && "Découvrez notre canapé design exceptionnel qui allie élégance moderne et confort optimal. Chaque détail a été pensé pour créer un meuble qui transformera votre espace de vie. Parfait pour votre salon, il s'intègre harmonieusement dans tous les styles d'intérieurs contemporains ou classiques."}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <span className={`font-bold ${isLuxury ? 'text-4xl' : 'text-3xl'}`} style={{ color: colors.primary }}>
                1 299€
              </span>
              {!isMinimal && (
                <span className="text-xl line-through" style={{ color: colors.textMuted }}>
                  1 599€
                </span>
              )}
            </div>

            {highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {highlights.map(h => (
                  <div 
                    key={h} 
                    className={`flex items-center gap-2 text-sm p-2 ${isModern ? 'rounded-lg' : ''} ${isLuxury ? 'border' : ''}`}
                    style={{ 
                      backgroundColor: isMinimal ? 'transparent' : colors.surface,
                      borderColor: isLuxury ? colors.primary : 'transparent'
                    }}
                  >
                    <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                    <span className={isLuxury ? 'font-serif' : ''}>{highlightLabels[h]}</span>
                  </div>
                ))}
              </div>
            )}

            {isLong && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <h3 className="font-semibold mb-2" style={{ color: colors.secondary }}>
                  Caractéristiques principales
                </h3>
                <ul className="text-sm space-y-1" style={{ color: colors.textMuted }}>
                  <li>✓ Matériaux premium de qualité supérieure</li>
                  <li>✓ Design ergonomique pour un confort optimal</li>
                  <li>✓ Livraison et installation offertes</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                className={`flex-1 ${isLuxury ? 'text-lg py-6 rounded-none' : isModern ? 'shadow-lg' : 'rounded-full'}`}
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isLuxury ? 'Acquérir' : 'Ajouter au panier'}
              </Button>
              {!isMinimal && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`${isLuxury ? 'w-14 h-14 rounded-none' : isModern ? 'shadow' : 'rounded-full'}`}
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto rounded-lg border" style={previewStyle}>
      <div className="max-w-4xl mx-auto p-8 md:p-12 text-center">
        {isLuxury && (
          <Badge className="mb-4" style={{ backgroundColor: colors.accent, color: colors.background }}>
            Collection Exclusive
          </Badge>
        )}
        
        <h1 className={`font-bold mb-6 ${isLuxury ? 'text-5xl md:text-6xl font-serif' : isModern ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl font-light tracking-wide'}`}>
          {isLuxury ? 'Canapé Prestige' : isModern ? 'Canapé Design Moderne' : 'Canapé Essentiel'}
        </h1>
        
        <div 
          className={`w-full aspect-video mb-8 relative overflow-hidden ${isLuxury ? '' : 'rounded-lg'} ${isModern ? 'shadow-xl' : ''}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={`w-2/3 h-2/3 ${isLuxury ? '' : 'rounded-lg'}`}
              style={{ backgroundColor: colors.primary, opacity: 0.1 }} 
            />
            <div className="absolute text-8xl opacity-20">🛋️</div>
          </div>
        </div>

        <p className={`mb-8 max-w-2xl mx-auto ${isLong ? 'text-lg md:text-xl' : 'text-base md:text-lg'}`} style={{ color: colors.textMuted }}>
          {isShort && "Élégance et confort réunis dans un design contemporain."}
          {isMedium && "Découvrez notre canapé design qui allie élégance moderne et confort optimal. Parfait pour votre salon, il s'intègre harmonieusement dans tous les intérieurs."}
          {isLong && "Découvrez notre canapé design exceptionnel qui allie élégance moderne et confort optimal. Chaque détail a été pensé pour créer un meuble qui transformera votre espace de vie. Un investissement dans votre bien-être quotidien."}
        </p>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`font-bold ${isLuxury ? 'text-5xl' : 'text-4xl'}`} style={{ color: colors.primary }}>
            1 299€
          </span>
          {!isMinimal && (
            <span className="text-2xl line-through" style={{ color: colors.textMuted }}>
              1 599€
            </span>
          )}
        </div>

        {highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {highlights.map(h => (
              <div 
                key={h} 
                className={`flex items-center gap-2 px-4 py-2 ${isLuxury ? 'border-2' : isModern ? 'rounded-lg shadow-md' : 'rounded-full'}`}
                style={{ 
                  backgroundColor: isMinimal ? 'transparent' : colors.surface,
                  borderColor: isLuxury ? colors.primary : 'transparent'
                }}
              >
                <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                <span className={`text-sm font-medium ${isLuxury ? 'font-serif' : ''}`}>
                  {highlightLabels[h]}
                </span>
              </div>
            ))}
          </div>
        )}

        {isLong && (
          <div 
            className={`max-w-xl mx-auto mb-8 p-6 text-left ${isLuxury ? 'border-2' : 'rounded-lg'} ${isModern ? 'shadow-lg' : ''}`}
            style={{ 
              backgroundColor: isMinimal ? 'transparent' : colors.surface,
              borderColor: isLuxury ? colors.secondary : 'transparent'
            }}
          >
            <h3 className={`font-semibold mb-3 ${isLuxury ? 'font-serif text-xl' : 'text-lg'}`} style={{ color: colors.secondary }}>
              Caractéristiques principales
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: colors.textMuted }}>
              <li>✓ Matériaux premium de qualité supérieure</li>
              <li>✓ Design ergonomique pour un confort optimal</li>
              <li>✓ Livraison et installation offertes</li>
              <li>✓ Garantie 5 ans incluse</li>
            </ul>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button 
            size="lg"
            className={`${isLuxury ? 'text-lg px-8 py-6 rounded-none' : isModern ? 'shadow-lg' : 'rounded-full'}`}
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isLuxury ? 'Acquérir' : 'Ajouter au panier'}
          </Button>
          {!isMinimal && (
            <Button 
              variant="outline"
              size="lg"
              className={`${isLuxury ? 'px-6 py-6 rounded-none' : isModern ? 'shadow' : 'rounded-full'}`}
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Heart className="mr-2 h-5 w-5" />
              Favoris
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
