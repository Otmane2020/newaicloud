import { useState, useEffect } from "react";
import { Facebook, Instagram, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { SocialTemplate } from "./templates/socialTemplates";
import { extractColorsFromImage, ExtractedColors, generateElegantOverlay } from "@/utils/colorExtractor";

interface SocialPostPreviewProps {
  template?: SocialTemplate | null;
  productImage?: string;
  productTitle?: string;
  productPrice?: string;
  comparePrice?: string;
  caption?: string;
  storeName?: string;
  logoUrl?: string;
  channels?: string[];
  platform?: 'facebook' | 'instagram';
  // NEW: Intelligent text fields
  tagline?: string;
  subtitle?: string;
  benefits?: string[];
  ctaText?: string;
  urgencyBadge?: string;
}

export function SocialPostPreview({
  template,
  productImage,
  productTitle = 'Nom du produit',
  productPrice,
  comparePrice,
  caption = '',
  storeName = 'Ma Boutique',
  logoUrl,
  channels = ['facebook', 'instagram'],
  platform = 'instagram',
  tagline,
  subtitle,
  benefits = [],
  ctaText,
  urgencyBadge
}: SocialPostPreviewProps) {
  const showFacebook = channels.includes('facebook');
  const showInstagram = channels.includes('instagram');
  
  // Extracted colors state for classic template
  const [extractedColors, setExtractedColors] = useState<ExtractedColors | null>(null);

  // Extract colors when image changes (for classic template)
  useEffect(() => {
    if (template?.elements.colorExtraction && productImage) {
      extractColorsFromImage(productImage).then(setExtractedColors);
    }
  }, [productImage, template?.elements.colorExtraction]);

  const renderClassicTemplate = () => {
    const colors = extractedColors || {
      dominant: 'hsl(30, 20%, 85%)',
      complementary: 'hsl(210, 20%, 15%)',
      accent: 'hsl(25, 70%, 50%)',
      isDark: false,
      textColor: 'hsl(0, 0%, 100%)'
    };

    const overlayGradient = generateElegantOverlay(colors);

    return (
      <div className="aspect-square relative overflow-hidden bg-muted">
        {/* Original Product Image - UNTOUCHED */}
        {productImage ? (
          <img 
            src={productImage} 
            alt={productTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Aucune image
          </div>
        )}
        
        {/* Elegant Bottom Overlay with Extracted Colors */}
        <div 
          className="absolute inset-0"
          style={{ background: overlayGradient }}
        />
        
        {/* Geometric Accent Shapes */}
        <div 
          className="absolute top-4 right-4 w-16 h-16 rounded-full opacity-30"
          style={{ backgroundColor: colors.accent }}
        />
        <div 
          className="absolute top-8 right-8 w-8 h-8 rounded-full opacity-20"
          style={{ backgroundColor: colors.complementary }}
        />
        
        {/* Logo / Store Name */}
        {template?.elements.showLogo && (
          <div className="absolute top-4 left-4">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain drop-shadow-lg" />
            ) : (
              <div 
                className="px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: colors.isDark ? '#fff' : '#1a1a1a'
                }}
              >
                {storeName}
              </div>
            )}
          </div>
        )}

        {/* Urgency Badge (if promo) */}
        {urgencyBadge && (
          <div 
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ 
              backgroundColor: 'hsl(0, 100%, 50%)',
              color: '#fff'
            }}
          >
            {urgencyBadge}
          </div>
        )}
        
        {/* Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Tagline - Marketing Hook */}
          {tagline && (
            <p 
              className="text-sm font-medium opacity-90"
              style={{ color: '#fff' }}
            >
              {tagline}
            </p>
          )}
          
          {/* Product Title */}
          <h3 
            className="font-bold text-lg leading-tight"
            style={{ color: '#fff' }}
          >
            {productTitle}
          </h3>
          
          {/* Subtitle - Key Info */}
          {subtitle && (
            <p 
              className="text-xs opacity-80"
              style={{ color: '#fff' }}
            >
              {subtitle}
            </p>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {benefits.slice(0, 2).map((benefit, i) => (
                <span 
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff'
                  }}
                >
                  ✓ {benefit}
                </span>
              ))}
            </div>
          )}
          
          {/* Price + CTA Row */}
          <div className="flex items-center justify-between mt-2">
            {template?.elements.showPrice && productPrice && (
              <div className="flex items-center gap-2">
                {comparePrice && (
                  <span 
                    className="text-sm line-through opacity-50"
                    style={{ color: '#fff' }}
                  >
                    {comparePrice}
                  </span>
                )}
                <span 
                  className="text-xl font-bold"
                  style={{ color: colors.accent }}
                >
                  {productPrice}
                </span>
              </div>
            )}
            
            {template?.elements.showCta && (
              <button 
                className="px-4 py-2 rounded-full text-xs font-semibold transition-transform hover:scale-105"
                style={{ 
                  backgroundColor: colors.accent,
                  color: colors.isDark ? '#fff' : '#1a1a1a'
                }}
              >
                {ctaText || template?.textContent?.ctaVariants?.[0] || 'Découvrir →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStandardTemplate = () => {
    if (!template) {
      return (
        <div className="aspect-square bg-muted relative">
          {productImage ? (
            <img 
              src={productImage} 
              alt={productTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Aucune image
            </div>
          )}
        </div>
      );
    }

    // Apply template styling
    const bgStyle = template.colors.background.includes('gradient') 
      ? { background: template.colors.background }
      : { backgroundColor: template.colors.background };

    return (
      <div className="aspect-square relative overflow-hidden" style={bgStyle}>
        {/* Background Image */}
        {productImage && (
          <img 
            src={productImage} 
            alt={productTitle}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay based on template */}
        {template.elements.overlay !== 'none' && (
          <div 
            className="absolute inset-0"
            style={{
              background: template.elements.overlay === 'gradient' 
                ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)'
                : template.elements.overlay === 'solid'
                ? 'rgba(0,0,0,0.4)'
                : template.colors.overlay || 'transparent'
            }}
          />
        )}
        
        {/* Logo */}
        {template.elements.showLogo && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain" />
            ) : (
              <div 
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: template.colors.text 
                }}
              >
                {storeName}
              </div>
            )}
          </div>
        )}

        {/* Urgency Badge */}
        {urgencyBadge && (
          <div 
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
            style={{ 
              backgroundColor: template.colors.accent,
              color: '#fff'
            }}
          >
            {urgencyBadge}
          </div>
        )}
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
          {/* Tagline */}
          {tagline && (
            <p 
              className="text-sm font-medium opacity-90"
              style={{ 
                color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text,
                fontFamily: template.typography.fontFamily
              }}
            >
              {tagline}
            </p>
          )}

          {/* Title */}
          <h3 
            className="font-bold leading-tight"
            style={{ 
              color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text,
              fontFamily: template.typography.fontFamily,
              fontSize: template.typography.titleSize
            }}
          >
            {productTitle}
          </h3>

          {/* Subtitle */}
          {subtitle && (
            <p 
              className="text-xs opacity-75"
              style={{ 
                color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text 
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Benefits */}
          {benefits.length > 0 && template.textContent?.showBenefits && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {benefits.slice(0, template.textContent.maxBenefits || 2).map((benefit, i) => (
                <span 
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: template.elements.overlay !== 'none' 
                      ? 'rgba(255,255,255,0.2)' 
                      : `${template.colors.accent}20`,
                    color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text
                  }}
                >
                  ✓ {benefit}
                </span>
              ))}
            </div>
          )}
          
          {/* Price */}
          {template.elements.showPrice && productPrice && (
            <div className="flex items-center gap-2 mt-2">
              {comparePrice && (
                <span 
                  className="text-sm line-through opacity-60"
                  style={{ color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text }}
                >
                  {comparePrice}
                </span>
              )}
              <span 
                className="text-xl font-bold"
                style={{ color: template.colors.accent }}
              >
                {productPrice}
              </span>
            </div>
          )}
          
          {/* CTA */}
          {template.elements.showCta && (
            <button 
              className="mt-3 px-4 py-2 rounded-full text-sm font-semibold transition-transform hover:scale-105"
              style={{ 
                backgroundColor: template.colors.accent,
                color: '#000'
              }}
            >
              {ctaText || template.textContent?.ctaVariants?.[0] || 'Découvrir →'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderImageWithOverlay = () => {
    // Use classic template renderer for colorExtraction templates
    if (template?.elements.colorExtraction || template?.layout === 'classic') {
      return renderClassicTemplate();
    }
    return renderStandardTemplate();
  };

  return (
    <div className="max-w-sm mx-auto">
      {/* Social Post Card */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
            {storeName?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{storeName}</p>
            <p className="text-xs text-muted-foreground">Sponsorisé</p>
          </div>
          <div className="flex gap-1">
            {showFacebook && <Facebook className="h-4 w-4 text-blue-600" />}
            {showInstagram && <Instagram className="h-4 w-4 text-pink-600" />}
          </div>
        </div>

        {/* Image with Template */}
        {renderImageWithOverlay()}

        {/* Actions Bar (Instagram style) */}
        <div className="flex items-center justify-between p-3 border-t">
          <div className="flex items-center gap-4">
            <button className="hover:text-red-500 transition-colors">
              <Heart className="h-6 w-6" />
            </button>
            <button className="hover:text-primary transition-colors">
              <MessageCircle className="h-6 w-6" />
            </button>
            <button className="hover:text-primary transition-colors">
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button className="hover:text-primary transition-colors">
            <Bookmark className="h-6 w-6" />
          </button>
        </div>

        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-sm">
            <span className="font-semibold mr-1">{storeName}</span>
            <span className="whitespace-pre-wrap break-words">
              {caption || 'Votre caption apparaîtra ici...'}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">À l'instant</p>
        </div>
      </div>
    </div>
  );
}

export default SocialPostPreview;
