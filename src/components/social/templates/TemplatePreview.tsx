import { SocialTemplate } from './socialTemplates';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  template: SocialTemplate;
  productImage?: string;
  productTitle?: string;
  productPrice?: string;
  comparePrice?: string;
  logoUrl?: string;
  brandName?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function TemplatePreview({
  template,
  productImage,
  productTitle = 'Nom du produit',
  productPrice = '499€',
  comparePrice = '629€',
  logoUrl,
  brandName = 'Ma Boutique',
  selected,
  onClick,
  size = 'medium'
}: TemplatePreviewProps) {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-48 h-48',
    large: 'w-64 h-64'
  };

  const renderTemplate = () => {
    switch (template.layout) {
      case 'spotlight':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-3 relative"
            style={{ backgroundColor: template.colors.background }}
          >
            {/* Logo */}
            {template.elements.showLogo && (
              <div className="absolute top-2 left-2 text-[8px] font-medium opacity-70">
                {brandName}
              </div>
            )}
            
            {/* Product Image */}
            <div className="w-16 h-16 bg-muted/30 rounded flex items-center justify-center mb-2 overflow-hidden">
              {productImage ? (
                <img src={productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-muted rounded" />
              )}
            </div>
            
            {/* Title */}
            <div 
              className="text-[10px] font-serif font-bold text-center mb-1"
              style={{ color: template.colors.text }}
            >
              {productTitle.slice(0, 15)}...
            </div>
            
            {/* Price */}
            {template.elements.showPrice && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] line-through opacity-50">{comparePrice}</span>
                <span 
                  className="text-[12px] font-bold"
                  style={{ color: template.colors.accent }}
                >
                  {productPrice}
                </span>
              </div>
            )}
            
            {/* Color Swatches */}
            {template.elements.showColorSwatches && (
              <div className="flex gap-1 mt-2">
                {['#f5f5dc', '#c4a77d', '#5c5c5c', '#8b9dc3', '#9acd32'].map((color, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 rounded-full border border-white/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'before_after':
        return (
          <div 
            className="w-full h-full flex relative overflow-hidden"
            style={{ background: template.colors.background }}
          >
            {/* Before side */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center p-2 border-r border-white/20">
              <div className="text-[8px] text-red-400 mb-1">AVANT</div>
              <div className="w-12 h-12 bg-red-900/30 rounded flex items-center justify-center">
                <span className="text-[8px] text-red-300">❌</span>
              </div>
            </div>
            
            {/* After side */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center p-2">
              <div className="text-[8px] text-green-400 mb-1">APRÈS</div>
              <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center overflow-hidden">
                {productImage ? (
                  <img src={productImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] text-green-300">✓</span>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-lg">
              →
            </div>
          </div>
        );

      case 'feature':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-3 text-white relative"
            style={{ background: template.colors.background }}
          >
            <div className="text-lg mb-1">🚀</div>
            <div className="text-[10px] font-bold text-center mb-1">
              Feature Highlight
            </div>
            <div className="text-[7px] text-center opacity-80">
              Optimisez en 1 clic
            </div>
            {template.elements.showCta && (
              <div 
                className="mt-2 px-2 py-0.5 rounded text-[6px] font-bold"
                style={{ backgroundColor: template.colors.accent, color: '#000' }}
              >
                Essayer →
              </div>
            )}
          </div>
        );

      case 'testimonial':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-3"
            style={{ backgroundColor: template.colors.background }}
          >
            {/* Quote icon */}
            <div className="text-2xl opacity-20 mb-1">"</div>
            
            {/* Quote text */}
            <div 
              className="text-[8px] text-center italic mb-2 px-2"
              style={{ color: template.colors.text }}
            >
              J'ai doublé mon trafic en 2 semaines
            </div>
            
            {/* Avatar & Name */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-muted" />
              <span className="text-[7px] opacity-70">— Julie, Shopify</span>
            </div>
          </div>
        );

      case 'promo':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-3 relative"
            style={{ backgroundColor: template.colors.background }}
          >
            {/* Badge */}
            <div 
              className="absolute top-2 right-2 px-1 py-0.5 text-[6px] font-bold rounded"
              style={{ backgroundColor: template.colors.accent }}
            >
              🔥 PROMO
            </div>
            
            {/* Main text */}
            <div className="text-white text-[14px] font-black mb-1">
              -30%
            </div>
            
            <div className="text-white/80 text-[8px] text-center">
              Sur tous les plans
            </div>
            
            {/* CTA */}
            <div 
              className="mt-2 px-2 py-1 rounded text-[7px] font-bold text-black"
              style={{ backgroundColor: template.colors.accent }}
            >
              J'EN PROFITE
            </div>
          </div>
        );

      case 'carousel':
        return (
          <div 
            className="w-full h-full flex flex-col p-2"
            style={{ backgroundColor: template.colors.background }}
          >
            {/* Slide indicator */}
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-1 h-1 rounded-full",
                    i === 0 ? "bg-current" : "bg-current/30"
                  )}
                  style={{ color: template.colors.accent }}
                />
              ))}
            </div>
            
            {/* Slide content */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div 
                className="text-[9px] font-bold text-center mb-1"
                style={{ color: template.colors.text }}
              >
                3 Astuces SEO
              </div>
              <div className="w-16 h-16 bg-white/50 rounded flex items-center justify-center">
                <span className="text-[8px]">Slide 1/5</span>
              </div>
            </div>
            
            {/* Navigation hint */}
            <div className="text-[6px] text-center opacity-50">
              Swipe →
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Template</span>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2",
        selected 
          ? "border-primary ring-2 ring-primary/30 scale-105" 
          : "border-border hover:border-primary/50 hover:scale-102"
      )}
      onClick={onClick}
    >
      {renderTemplate()}
    </div>
  );
}
