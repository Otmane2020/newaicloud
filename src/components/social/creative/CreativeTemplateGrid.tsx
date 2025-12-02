import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check, Sparkles, Flame, Zap, Gift, Crown, Star, Heart, ShoppingBag } from "lucide-react";

export type TemplateCategory = "all" | "promo" | "luxury" | "minimal" | "bold" | "neon" | "seasonal";
export type TemplateSize = "square" | "story" | "landscape";

export interface CreativeTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  size: TemplateSize;
  preview: string;
  overlayStyle?: string;
  badge?: string;
  badgeColor?: string;
  badgeIcon?: React.ReactNode;
  accentColor: string;
  aiPromptStyle: string;
}

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  // PROMO Templates
  {
    id: "promo-fire",
    name: "🔥 Hot Deal",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-orange-600 via-red-600 to-rose-700",
    overlayStyle: "radial-gradient(circle at 20% 80%, rgba(255,200,0,0.3) 0%, transparent 50%)",
    badge: "HOT",
    badgeColor: "bg-yellow-500 text-black",
    accentColor: "#FFD700",
    aiPromptStyle: "fiery, energetic, sale vibes, orange red gradients"
  },
  {
    id: "promo-flash",
    name: "⚡ Flash Sale",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-tr from-purple-900 via-violet-800 to-fuchsia-700",
    overlayStyle: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
    badge: "-50%",
    badgeColor: "bg-fuchsia-500 text-white",
    accentColor: "#E879F9",
    aiPromptStyle: "electric flash sale, purple neon, urgent"
  },
  {
    id: "promo-mega",
    name: "🎉 Mega Promo",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-bl from-emerald-500 via-teal-600 to-cyan-700",
    badge: "MEGA",
    badgeColor: "bg-emerald-400 text-black",
    accentColor: "#34D399",
    aiPromptStyle: "celebration, festive, green teal, big savings"
  },
  {
    id: "promo-blackfriday",
    name: "🖤 Black Friday",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-black via-zinc-900 to-neutral-800",
    overlayStyle: "linear-gradient(to right, rgba(255,215,0,0.1), transparent 50%, rgba(255,215,0,0.1))",
    badge: "BLACK FRIDAY",
    badgeColor: "bg-yellow-500 text-black",
    accentColor: "#FFD700",
    aiPromptStyle: "black friday, gold accents, premium dark, exclusive"
  },
  
  // LUXURY Templates
  {
    id: "luxury-gold",
    name: "✨ Gold Premium",
    category: "luxury",
    size: "square",
    preview: "bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400",
    overlayStyle: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 60%)",
    badge: "PREMIUM",
    badgeColor: "bg-black text-amber-400",
    accentColor: "#F59E0B",
    aiPromptStyle: "luxury gold, premium, elegant, sophisticated"
  },
  {
    id: "luxury-noir",
    name: "🌙 Noir Elite",
    category: "luxury",
    size: "square",
    preview: "bg-gradient-to-br from-slate-900 via-zinc-800 to-stone-900",
    overlayStyle: "radial-gradient(circle at 80% 20%, rgba(212,175,55,0.2) 0%, transparent 40%)",
    badge: "ELITE",
    badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/50",
    accentColor: "#D4AF37",
    aiPromptStyle: "dark luxury, noir, gold accents, minimalist"
  },
  {
    id: "luxury-rose",
    name: "🌹 Rose Gold",
    category: "luxury",
    size: "square",
    preview: "bg-gradient-to-br from-rose-200 via-pink-200 to-rose-300",
    badge: "EXCLUSIVE",
    badgeColor: "bg-rose-600 text-white",
    accentColor: "#E11D48",
    aiPromptStyle: "rose gold, feminine luxury, soft pink"
  },

  // MINIMAL Templates
  {
    id: "minimal-clean",
    name: "◻️ Clean White",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-br from-white via-gray-50 to-slate-100",
    accentColor: "#000000",
    aiPromptStyle: "clean white background, minimalist, simple"
  },
  {
    id: "minimal-grey",
    name: "⬜ Soft Grey",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-br from-gray-100 via-slate-200 to-gray-300",
    accentColor: "#374151",
    aiPromptStyle: "soft grey, neutral tones, professional"
  },
  {
    id: "minimal-mono",
    name: "⚫ Monochrome",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-b from-neutral-800 via-neutral-900 to-black",
    accentColor: "#FFFFFF",
    aiPromptStyle: "black and white, monochrome, dramatic"
  },

  // BOLD Templates
  {
    id: "bold-electric",
    name: "💜 Electric Purple",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    badge: "NEW",
    badgeColor: "bg-white text-purple-700",
    accentColor: "#A78BFA",
    aiPromptStyle: "electric purple, vibrant, energetic"
  },
  {
    id: "bold-ocean",
    name: "🌊 Ocean Blue",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500",
    badge: "BEST",
    badgeColor: "bg-white text-blue-600",
    accentColor: "#06B6D4",
    aiPromptStyle: "ocean blue, fresh, aquatic vibes"
  },
  {
    id: "bold-sunset",
    name: "🌅 Sunset",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600",
    badge: "TRENDING",
    badgeColor: "bg-white text-pink-600",
    accentColor: "#F472B6",
    aiPromptStyle: "sunset gradient, warm to cool, vibrant"
  },

  // NEON Templates
  {
    id: "neon-cyber",
    name: "🎮 Cyber Neon",
    category: "neon",
    size: "square",
    preview: "bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950",
    overlayStyle: "linear-gradient(90deg, rgba(236,72,153,0.2) 0%, transparent 50%, rgba(34,211,238,0.2) 100%)",
    badge: "CYBER",
    badgeColor: "bg-pink-500 text-white shadow-lg shadow-pink-500/50",
    accentColor: "#EC4899",
    aiPromptStyle: "cyberpunk, neon pink and cyan, futuristic, glowing"
  },
  {
    id: "neon-matrix",
    name: "💚 Matrix",
    category: "neon",
    size: "square",
    preview: "bg-gradient-to-br from-black via-green-950 to-black",
    badge: "TECH",
    badgeColor: "bg-green-500 text-black shadow-lg shadow-green-500/50",
    accentColor: "#22C55E",
    aiPromptStyle: "matrix style, green neon, digital, tech"
  },
  {
    id: "neon-retro",
    name: "🌴 Retro Wave",
    category: "neon",
    size: "square",
    preview: "bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-800",
    badge: "RETRO",
    badgeColor: "bg-cyan-400 text-black",
    accentColor: "#22D3EE",
    aiPromptStyle: "synthwave, retro 80s, vaporwave"
  },

  // SEASONAL Templates
  {
    id: "seasonal-summer",
    name: "☀️ Summer",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-yellow-300 via-orange-400 to-red-400",
    badge: "SUMMER",
    badgeColor: "bg-white text-orange-600",
    accentColor: "#F97316",
    aiPromptStyle: "summer, sunny, warm colors, tropical"
  },
  {
    id: "seasonal-winter",
    name: "❄️ Winter",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-300",
    badge: "WINTER",
    badgeColor: "bg-blue-600 text-white",
    accentColor: "#3B82F6",
    aiPromptStyle: "winter, snowy, ice blue, cold tones"
  },
  {
    id: "seasonal-spring",
    name: "🌸 Spring",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-green-200 via-emerald-200 to-teal-200",
    badge: "SPRING",
    badgeColor: "bg-emerald-500 text-white",
    accentColor: "#10B981",
    aiPromptStyle: "spring, fresh green, floral, nature"
  },

  // STORY Format Templates
  {
    id: "story-promo",
    name: "📱 Story Promo",
    category: "promo",
    size: "story",
    preview: "bg-gradient-to-b from-rose-500 via-pink-600 to-purple-700",
    badge: "SWIPE UP",
    badgeColor: "bg-white text-pink-600",
    accentColor: "#EC4899",
    aiPromptStyle: "instagram story, vertical, swipe up"
  },
  {
    id: "story-luxury",
    name: "📱 Story Luxe",
    category: "luxury",
    size: "story",
    preview: "bg-gradient-to-b from-amber-100 via-yellow-200 to-amber-300",
    badge: "EXCLUSIVE",
    badgeColor: "bg-black text-amber-400",
    accentColor: "#D97706",
    aiPromptStyle: "luxury story, gold tones, elegant vertical"
  },
  {
    id: "story-neon",
    name: "📱 Story Neon",
    category: "neon",
    size: "story",
    preview: "bg-gradient-to-b from-slate-950 via-fuchsia-950 to-slate-950",
    badge: "NEW",
    badgeColor: "bg-fuchsia-500 text-white",
    accentColor: "#D946EF",
    aiPromptStyle: "neon story, glowing, cyberpunk vertical"
  },

  // LANDSCAPE Templates
  {
    id: "landscape-banner",
    name: "🖼️ Banner Wide",
    category: "promo",
    size: "landscape",
    preview: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600",
    badge: "SALE",
    badgeColor: "bg-white text-purple-600",
    accentColor: "#A855F7",
    aiPromptStyle: "wide banner, horizontal, facebook cover"
  },
  {
    id: "landscape-minimal",
    name: "🖼️ Banner Clean",
    category: "minimal",
    size: "landscape",
    preview: "bg-gradient-to-r from-gray-100 via-white to-gray-100",
    accentColor: "#000000",
    aiPromptStyle: "clean banner, white, minimalist horizontal"
  },
  {
    id: "landscape-luxury",
    name: "🖼️ Banner Gold",
    category: "luxury",
    size: "landscape",
    preview: "bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200",
    badge: "VIP",
    badgeColor: "bg-black text-amber-400",
    accentColor: "#F59E0B",
    aiPromptStyle: "gold banner, premium horizontal, luxury"
  }
];

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "promo", label: "🔥 Promo" },
  { value: "luxury", label: "✨ Luxe" },
  { value: "minimal", label: "◻️ Minimal" },
  { value: "bold", label: "💜 Bold" },
  { value: "neon", label: "🎮 Neon" },
  { value: "seasonal", label: "🌸 Saison" },
];

const SIZES: { value: TemplateSize | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "square", label: "1:1" },
  { value: "story", label: "9:16" },
  { value: "landscape", label: "16:9" },
];

interface CreativeTemplateGridProps {
  selected: string;
  onSelect: (id: string) => void;
  category: TemplateCategory;
  onCategoryChange: (cat: TemplateCategory) => void;
  sizeFilter: TemplateSize | "all";
  onSizeChange: (size: TemplateSize | "all") => void;
  product?: {
    title: string;
    image: string | null;
    price: string | null;
    compare_at_price: string | null;
  } | null;
}

export function CreativeTemplateGrid({ 
  selected, 
  onSelect, 
  category, 
  onCategoryChange,
  sizeFilter,
  onSizeChange,
  product
}: CreativeTemplateGridProps) {
  const filteredTemplates = CREATIVE_TEMPLATES.filter(t => {
    const matchCategory = category === "all" || t.category === category;
    const matchSize = sizeFilter === "all" || t.size === sizeFilter;
    return matchCategory && matchSize;
  });

  const getAspectClass = (size: TemplateSize) => {
    switch (size) {
      case "story": return "aspect-[9/16]";
      case "landscape": return "aspect-video";
      default: return "aspect-square";
    }
  };

  const discount = product?.compare_at_price && product?.price 
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="flex gap-1.5 pb-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(cat.value)}
                className="shrink-0 text-xs"
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="flex gap-1 border-l pl-3">
          {SIZES.map((size) => (
            <Button
              key={size.value}
              variant={sizeFilter === size.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onSizeChange(size.value)}
              className="text-xs px-2"
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative rounded-lg overflow-hidden transition-all group",
              "ring-2 ring-offset-1 ring-offset-background",
              selected === template.id 
                ? "ring-primary scale-[1.02]" 
                : "ring-transparent hover:ring-primary/50"
            )}
          >
            <div 
              className={cn(getAspectClass(template.size), template.preview, "relative")}
            >
              {/* Overlay Pattern */}
              {template.overlayStyle && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: template.overlayStyle }}
                />
              )}

              {/* Decorative Shapes */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {template.category === "neon" && (
                  <>
                    <div className="absolute top-1 left-1 w-8 h-8 border border-pink-500/30 rounded rotate-12" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border border-cyan-500/30 rounded-full" />
                  </>
                )}
                {template.category === "luxury" && (
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full" />
                )}
              </div>

              {/* Badge */}
              {template.badge && (
                <div className="absolute top-1 left-1 z-10">
                  <span className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded",
                    template.badgeColor
                  )}>
                    {discount && template.badge.includes("%") ? `-${discount}%` : template.badge}
                  </span>
                </div>
              )}

              {/* Product Image Preview */}
              {product?.image ? (
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <img 
                    src={product.image}
                    alt=""
                    className="max-w-[70%] max-h-[70%] object-contain drop-shadow-lg"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-white/30" />
                </div>
              )}

              {/* Price Preview */}
              {product?.price && (
                <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                  {product.compare_at_price && (
                    <span className="text-white/50 text-[8px] line-through">
                      {product.compare_at_price}€
                    </span>
                  )}
                  <span 
                    className="text-[9px] font-bold"
                    style={{ color: template.accentColor }}
                  >
                    {product.price}€
                  </span>
                </div>
              )}

              {/* Selection Check */}
              {selected === template.id && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Template Name */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 pt-4">
              <p className="text-[8px] text-white font-medium truncate">
                {template.name}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Aucun template
        </div>
      )}
    </div>
  );
}
