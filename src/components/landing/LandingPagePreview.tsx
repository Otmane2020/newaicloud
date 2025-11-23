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
  // Ne rien afficher si les valeurs ne sont pas encore initialisées
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
          {/* Image Section */}
          <div className="relative" style={{ backgroundColor: colors.surface }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-lg" style={{ backgroundColor: colors.primary, opacity: 0.1 }} />
              <div className="absolute text-6xl opacity-20">🛋️</div>
            </div>
          </div>
          
          {/* Content Section */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            {isLuxury && <Badge className="w-fit mb-4" style={{ backgroundColor: colors.accent }}>Collection Exclusive</Badge>}
            
            <h1 className={`font-bold mb-4 ${isMinimal ? 'text-3xl' : 'text-4xl md:text-5xl'}`}>
              Canapé Design Moderne
            </h1>
            
            <p className="mb-6" style={{ color: colors.textMuted }}>
              {isShort && "Élégance et confort réunis dans un design contemporain."}
              {isMedium && "Découvrez notre canapé design qui allie élégance moderne et confort optimal. Parfait pour votre salon, il s'intègre harmonieusement dans tous les intérieurs."}
              {!isShort && !isMedium && "Découvrez notre canapé design exceptionnel qui allie élégance moderne et confort optimal. Chaque détail a été pensé pour créer un meuble qui transformera votre espace de vie. Parfait pour votre salon, il s'intègre harmonieusement dans tous les styles d'intérieurs."}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold" style={{ color: colors.primary }}>1 299€</span>
              {!isMinimal && <span className="text-xl line-through" style={{ color: colors.textMuted }}>1 599€</span>}
            </div>

            {highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {highlights.map(h => (
                  <div key={h} className="flex items-center gap-2 text-sm">
                    <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                    <span>{highlightLabels[h]}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                className={`flex-1 ${isLuxury ? 'text-lg py-6' : ''}`}
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Ajouter au panier
              </Button>
              {!isMinimal && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className={isLuxury ? 'w-14 h-14' : ''}
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

  // Layout: hero_centered
  return (
    <div className="w-full h-full overflow-auto rounded-lg border" style={previewStyle}>
      <div className="max-w-4xl mx-auto p-8 md:p-12 text-center">
        {isLuxury && (
          <Badge className="mb-4" style={{ backgroundColor: colors.accent }}>
            Collection Exclusive
          </Badge>
        )}
        
        <h1 className={`font-bold mb-6 ${isMinimal ? 'text-3xl md:text-4xl' : 'text-4xl md:text-6xl'}`}>
          Canapé Design Moderne
        </h1>
        
        <div className="w-full aspect-video rounded-lg mb-8 relative overflow-hidden" style={{ backgroundColor: colors.surface }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2/3 h-2/3 rounded-lg" style={{ backgroundColor: colors.primary, opacity: 0.1 }} />
            <div className="absolute text-8xl opacity-20">🛋️</div>
          </div>
        </div>

        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: colors.textMuted }}>
          {isShort && "Élégance et confort réunis dans un design contemporain."}
          {isMedium && "Découvrez notre canapé design qui allie élégance moderne et confort optimal. Parfait pour votre salon, il s'intègre harmonieusement dans tous les intérieurs."}
          {!isShort && !isMedium && "Découvrez notre canapé design exceptionnel qui allie élégance moderne et confort optimal. Chaque détail a été pensé pour créer un meuble qui transformera votre espace de vie."}
        </p>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-4xl font-bold" style={{ color: colors.primary }}>1 299€</span>
          {!isMinimal && <span className="text-2xl line-through" style={{ color: colors.textMuted }}>1 599€</span>}
        </div>

        {highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {highlights.map(h => (
              <div key={h} className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: colors.surface }}>
                <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                <span className="text-sm font-medium">{highlightLabels[h]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button 
            size="lg"
            className={isLuxury ? 'text-lg px-8 py-6' : ''}
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Ajouter au panier
          </Button>
          {!isMinimal && (
            <Button 
              variant="outline"
              size="lg"
              className={isLuxury ? 'px-6 py-6' : ''}
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
