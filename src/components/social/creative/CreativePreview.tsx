import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type TemplateStyle = 'gold' | 'red-promo' | 'minimal' | 'tech' | 'black-friday' | 'story';

interface CreativePreviewProps {
  product: {
    id: string;
    title: string;
    image: string | null;
    price: string | null;
    compare_at_price: string | null;
  } | null;
  template: TemplateStyle;
  caption: string;
  generated?: {
    title?: string;
    generatedImageUrl?: string;
  } | null;
}

const templateStyles: Record<TemplateStyle, { 
  bg: string; 
  text: string; 
  accent: string;
  priceColor: string;
  overlay?: string;
}> = {
  minimal: {
    bg: 'bg-white',
    text: 'text-gray-900',
    accent: 'text-gray-600',
    priceColor: 'text-primary'
  },
  gold: {
    bg: 'bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-300',
    text: 'text-amber-950',
    accent: 'text-amber-800',
    priceColor: 'text-amber-700'
  },
  'red-promo': {
    bg: 'bg-gradient-to-br from-red-500 to-rose-600',
    text: 'text-white',
    accent: 'text-red-100',
    priceColor: 'text-yellow-300'
  },
  tech: {
    bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
    text: 'text-white',
    accent: 'text-purple-200',
    priceColor: 'text-cyan-400'
  },
  'black-friday': {
    bg: 'bg-gradient-to-br from-gray-900 via-black to-gray-900',
    text: 'text-white',
    accent: 'text-gray-400',
    priceColor: 'text-yellow-400'
  },
  story: {
    bg: 'bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-600',
    text: 'text-white',
    accent: 'text-pink-100',
    priceColor: 'text-yellow-300'
  }
};

export function CreativePreview({ product, template, caption, generated }: CreativePreviewProps) {
  const style = templateStyles[template];
  const isStory = template === 'story';
  const displayTitle = generated?.title || product?.title;

  if (!product) {
    return (
      <div className={cn(
        "rounded-lg flex items-center justify-center",
        isStory ? "aspect-[9/16]" : "aspect-square",
        "bg-muted border-2 border-dashed border-muted-foreground/30"
      )}>
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sélectionnez un produit</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg",
      isStory ? "aspect-[9/16]" : "aspect-square",
      style.bg
    )}>
      {/* Background Pattern for premium feel */}
      {(template === 'gold' || template === 'black-friday') && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
        </div>
      )}

      {/* Content Container */}
      <div className="absolute inset-0 p-4 flex flex-col">
        {/* Top Section - Brand/Title */}
        <div className="text-center mb-2">
          {template === 'red-promo' && (
            <div className="inline-block bg-yellow-400 text-red-600 px-3 py-1 rounded-full text-xs font-bold mb-2 animate-pulse">
              🔥 PROMO
            </div>
          )}
          {template === 'black-friday' && (
            <div className="inline-block bg-yellow-400 text-black px-4 py-1 rounded text-sm font-black mb-2">
              BLACK FRIDAY
            </div>
          )}
        </div>

        {/* Product Image */}
        <div className="flex-1 flex items-center justify-center p-2">
          {(generated?.generatedImageUrl || product.image) ? (
            <img 
              src={generated?.generatedImageUrl || product.image!}
              alt={displayTitle || ''}
              className={cn(
                "max-h-full max-w-full object-contain",
                template === 'minimal' && "drop-shadow-lg",
                template === 'tech' && "drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]",
                template === 'gold' && "drop-shadow-[0_10px_20px_rgba(180,150,50,0.3)]"
              )}
            />
          ) : (
            <div className={cn(
              "w-32 h-32 rounded-lg flex items-center justify-center",
              template === 'minimal' ? "bg-gray-100" : "bg-white/10"
            )}>
              <ImageIcon className={cn("h-12 w-12", style.accent)} />
            </div>
          )}
        </div>

        {/* Bottom Section - Title & Price */}
        <div className="text-center space-y-1.5">
          <h3 className={cn(
            "font-bold leading-tight",
            style.text,
            isStory ? "text-lg" : "text-base"
          )}>
            {displayTitle}
          </h3>

          {/* Price Display */}
          {product.price && (
            <div className="flex items-center justify-center gap-2">
              {product.compare_at_price && (
                <span className={cn(
                  "line-through text-sm opacity-60",
                  style.accent
                )}>
                  {product.compare_at_price}€
                </span>
              )}
              <span className={cn(
                "font-bold",
                style.priceColor,
                isStory ? "text-2xl" : "text-xl"
              )}>
                {product.price}€
              </span>
              {product.compare_at_price && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  template === 'red-promo' ? "bg-yellow-400 text-red-600" : "bg-green-500 text-white"
                )}>
                  -{Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100)}%
                </span>
              )}
            </div>
          )}

          {/* Caption Preview */}
          {caption && (
            <p className={cn(
              "text-xs line-clamp-2 mt-2",
              style.accent
            )}>
              {caption}
            </p>
          )}
        </div>
      </div>

      {/* Corner decorations */}
      {template === 'gold' && (
        <>
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-600/40" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-600/40" />
        </>
      )}
    </div>
  );
}
