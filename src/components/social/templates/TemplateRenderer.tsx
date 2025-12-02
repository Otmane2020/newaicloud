import { SocialTemplate } from './socialTemplates';
import { cn } from '@/lib/utils';

interface TemplateRendererProps {
  template: SocialTemplate;
  data: {
    productImage?: string;
    productTitle: string;
    productDescription?: string;
    productPrice?: string;
    comparePrice?: string;
    logoUrl?: string;
    brandName?: string;
    caption?: string;
    ctaText?: string;
    ctaLink?: string;
    testimonialAuthor?: string;
    testimonialText?: string;
    promoText?: string;
    promoDiscount?: string;
  };
  size?: 'preview' | 'full';
}

export function TemplateRenderer({ template, data, size = 'full' }: TemplateRendererProps) {
  const containerClass = size === 'full' 
    ? 'w-[1080px] h-[1080px]' 
    : 'w-full aspect-square max-w-md';

  const renderSpotlight = () => (
    <div 
      className={cn(containerClass, "relative flex flex-col items-center justify-center p-8")}
      style={{ backgroundColor: template.colors.background }}
    >
      {/* Logo */}
      {template.elements.showLogo && data.logoUrl && (
        <div className="absolute top-6 left-6">
          <img src={data.logoUrl} alt={data.brandName} className="h-8 object-contain" />
        </div>
      )}
      {template.elements.showLogo && !data.logoUrl && data.brandName && (
        <div 
          className="absolute top-6 left-6 text-lg font-semibold"
          style={{ color: template.colors.text }}
        >
          {data.brandName}
        </div>
      )}

      {/* Product Name (Top) */}
      <h1 
        className="font-serif font-bold text-center mb-2 tracking-wide"
        style={{ 
          color: template.colors.text,
          fontSize: template.typography.titleSize 
        }}
      >
        {data.productTitle}
      </h1>

      {/* Subtitle */}
      {data.productDescription && (
        <p 
          className="text-center mb-4"
          style={{ 
            color: template.colors.text,
            fontSize: template.typography.subtitleSize,
            opacity: 0.8
          }}
        >
          {data.productDescription}
        </p>
      )}

      {/* Price */}
      {template.elements.showPrice && data.productPrice && (
        <div className="flex items-center gap-3 mb-6">
          {data.comparePrice && (
            <span 
              className="line-through"
              style={{ 
                color: template.colors.text,
                opacity: 0.5,
                fontSize: template.typography.subtitleSize
              }}
            >
              {data.comparePrice}
            </span>
          )}
          <span 
            className="font-bold"
            style={{ 
              color: template.colors.accent,
              fontSize: '2.5rem'
            }}
          >
            {data.productPrice}
          </span>
        </div>
      )}

      {/* Product Image */}
      {data.productImage && (
        <div className="relative w-3/4 aspect-square mb-6">
          <img 
            src={data.productImage} 
            alt={data.productTitle}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Color Swatches */}
      {template.elements.showColorSwatches && (
        <div className="flex gap-3 mb-6">
          {['#f5f5dc', '#c4a77d', '#5c5c5c', '#8b9dc3', '#9acd32', '#a0522d'].map((color, i) => (
            <div 
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white/50 shadow-md"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* CTA */}
      {template.elements.showCta && data.ctaText && (
        <button 
          className="px-8 py-3 rounded-full font-semibold text-lg transition-transform hover:scale-105"
          style={{ 
            backgroundColor: template.colors.accent,
            color: '#fff'
          }}
        >
          {data.ctaText}
        </button>
      )}
    </div>
  );

  const renderBeforeAfter = () => (
    <div 
      className={cn(containerClass, "relative flex overflow-hidden")}
      style={{ background: template.colors.background }}
    >
      {/* Before */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center p-6 border-r border-white/10">
        <span className="text-red-400 font-bold text-2xl mb-4">AVANT</span>
        <div className="w-4/5 aspect-square bg-red-900/20 rounded-lg flex items-center justify-center border-2 border-red-500/30">
          <div className="text-center p-4">
            <span className="text-6xl">❌</span>
            <p className="text-white/60 mt-4 text-sm">Non optimisé</p>
          </div>
        </div>
      </div>

      {/* After */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center p-6">
        <span className="text-green-400 font-bold text-2xl mb-4">APRÈS</span>
        <div className="w-4/5 aspect-square bg-green-900/20 rounded-lg flex items-center justify-center border-2 border-green-500/30 overflow-hidden">
          {data.productImage ? (
            <img src={data.productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <span className="text-6xl">✅</span>
              <p className="text-white/60 mt-4 text-sm">Optimisé par NewAI</p>
            </div>
          )}
        </div>
      </div>

      {/* Center Arrow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-4 shadow-lg">
        <span className="text-3xl">➡️</span>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-white text-xl mb-4">{data.productTitle || 'Votre boutique mérite mieux'}</p>
        {template.elements.showCta && (
          <button 
            className="px-6 py-2 rounded-full font-bold"
            style={{ backgroundColor: template.colors.accent }}
          >
            {data.ctaText || 'Essayer gratuitement'}
          </button>
        )}
      </div>
    </div>
  );

  const renderFeature = () => (
    <div 
      className={cn(containerClass, "relative flex flex-col items-center justify-center p-12 text-white")}
      style={{ background: template.colors.background }}
    >
      {/* Icon */}
      <div className="text-8xl mb-8">🚀</div>

      {/* Title */}
      <h1 
        className="font-bold text-center mb-4"
        style={{ fontSize: template.typography.titleSize }}
      >
        {data.productTitle}
      </h1>

      {/* Description */}
      <p 
        className="text-center opacity-90 mb-8 max-w-lg"
        style={{ fontSize: template.typography.subtitleSize }}
      >
        {data.productDescription || '100 produits optimisés en 30 secondes.'}
      </p>

      {/* CTA */}
      {template.elements.showCta && (
        <button 
          className="px-10 py-4 rounded-full font-bold text-xl"
          style={{ 
            backgroundColor: template.colors.accent,
            color: '#000'
          }}
        >
          {data.ctaText || 'Disponible maintenant 👍'}
        </button>
      )}

      {/* Logo */}
      {template.elements.showLogo && (
        <div className="absolute bottom-8 text-white/60 font-semibold">
          {data.brandName || 'NewAI'}
        </div>
      )}
    </div>
  );

  const renderTestimonial = () => (
    <div 
      className={cn(containerClass, "relative flex flex-col items-center justify-center p-12")}
      style={{ backgroundColor: template.colors.background }}
    >
      {/* Quote marks */}
      <div 
        className="text-9xl opacity-10 absolute top-12 left-12"
        style={{ color: template.colors.accent }}
      >
        "
      </div>

      {/* Quote */}
      <blockquote 
        className="text-center font-serif italic max-w-2xl mb-8"
        style={{ 
          color: template.colors.text,
          fontSize: '2rem'
        }}
      >
        {data.testimonialText || "J'ai doublé mon trafic SEO en 2 semaines avec NewAI."}
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4">
        <div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
        />
        <div>
          <p 
            className="font-semibold"
            style={{ color: template.colors.text }}
          >
            — {data.testimonialAuthor || 'Julie'}
          </p>
          <p 
            className="text-sm opacity-60"
            style={{ color: template.colors.text }}
          >
            Boutique Shopify
          </p>
        </div>
      </div>

      {/* Logo */}
      {template.elements.showLogo && (
        <div 
          className="absolute bottom-8"
          style={{ color: template.colors.accent }}
        >
          {data.brandName || 'NewAI'}
        </div>
      )}
    </div>
  );

  const renderPromo = () => (
    <div 
      className={cn(containerClass, "relative flex flex-col items-center justify-center p-8")}
      style={{ backgroundColor: template.colors.background }}
    >
      {/* Badge */}
      <div 
        className="absolute top-8 right-8 px-4 py-2 rounded-full font-bold text-lg animate-pulse"
        style={{ backgroundColor: template.colors.accent }}
      >
        🔥 {data.promoText || 'BLACK FRIDAY'}
      </div>

      {/* Main discount */}
      <div 
        className="text-white font-black mb-4"
        style={{ fontSize: '8rem' }}
      >
        {data.promoDiscount || '-30%'}
      </div>

      {/* Subtitle */}
      <p className="text-white/80 text-2xl text-center mb-2">
        {data.productDescription || 'Sur tous les plans NewAI'}
      </p>
      <p className="text-white/60 text-lg mb-8">
        Aujourd'hui seulement !
      </p>

      {/* Product image if available */}
      {data.productImage && (
        <div className="w-64 h-64 mb-8">
          <img src={data.productImage} alt="" className="w-full h-full object-contain" />
        </div>
      )}

      {/* CTA */}
      <button 
        className="px-12 py-4 rounded-full font-black text-2xl text-black"
        style={{ backgroundColor: template.colors.accent }}
      >
        {data.ctaText || "J'EN PROFITE →"}
      </button>
    </div>
  );

  const renderCarousel = () => (
    <div 
      className={cn(containerClass, "relative flex flex-col p-8")}
      style={{ backgroundColor: template.colors.background }}
    >
      {/* Slide indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              i === 0 ? "w-8" : ""
            )}
            style={{ 
              backgroundColor: i === 0 ? template.colors.accent : `${template.colors.accent}40`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 
          className="font-bold text-center mb-8"
          style={{ 
            color: template.colors.text,
            fontSize: template.typography.titleSize
          }}
        >
          {data.productTitle || '3 Astuces SEO pour Shopify'}
        </h1>

        {data.productImage && (
          <div className="w-3/4 aspect-video rounded-lg overflow-hidden shadow-xl mb-8">
            <img src={data.productImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <p 
          className="text-center max-w-md"
          style={{ 
            color: template.colors.text,
            opacity: 0.8,
            fontSize: template.typography.subtitleSize
          }}
        >
          {data.productDescription || 'Swipe pour découvrir →'}
        </p>
      </div>

      {/* CTA on last slide */}
      {template.elements.showCta && (
        <div className="text-center">
          <button 
            className="px-8 py-3 rounded-full font-semibold"
            style={{ 
              backgroundColor: template.colors.accent,
              color: '#fff'
            }}
          >
            {data.ctaText || 'Essayer NewAI'}
          </button>
        </div>
      )}
    </div>
  );

  switch (template.layout) {
    case 'spotlight':
      return renderSpotlight();
    case 'before_after':
      return renderBeforeAfter();
    case 'feature':
      return renderFeature();
    case 'testimonial':
      return renderTestimonial();
    case 'promo':
      return renderPromo();
    case 'carousel':
      return renderCarousel();
    default:
      return renderSpotlight();
  }
}
