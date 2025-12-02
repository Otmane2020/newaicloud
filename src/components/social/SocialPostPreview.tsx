import { Facebook, Instagram, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { SocialTemplate } from "./templates/socialTemplates";

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
  platform = 'instagram'
}: SocialPostPreviewProps) {
  const showFacebook = channels.includes('facebook');
  const showInstagram = channels.includes('instagram');

  const renderImageWithOverlay = () => {
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
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Title */}
          <h3 
            className="font-bold text-lg leading-tight mb-1"
            style={{ 
              color: template.elements.overlay !== 'none' ? '#fff' : template.colors.text,
              fontFamily: template.typography.fontFamily
            }}
          >
            {productTitle}
          </h3>
          
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
              Découvrir →
            </button>
          )}
        </div>
      </div>
    );
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
