import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check, ShoppingBag } from "lucide-react";

export type TemplateCategory = "all" | "lifestyle" | "promo" | "minimal" | "bold" | "inspirational" | "seasonal";
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
  accentColor: string;
  aiPromptStyle: string;
  textPosition: "top" | "bottom" | "center" | "overlay";
  fontStyle: "modern" | "elegant" | "bold" | "playful";
}

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  // LIFESTYLE - Inspirational, magazine-style
  {
    id: "lifestyle-cozy",
    name: "Ambiance Cosy",
    category: "lifestyle",
    size: "square",
    preview: "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50",
    accentColor: "#B45309",
    aiPromptStyle: "cozy living room, warm lighting, lifestyle photography, interior magazine, editorial style",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "lifestyle-nordic",
    name: "Design Scandinave",
    category: "lifestyle",
    size: "square",
    preview: "bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100",
    accentColor: "#1F2937",
    aiPromptStyle: "scandinavian design, minimalist interior, hygge atmosphere, natural light, clean aesthetic",
    textPosition: "center",
    fontStyle: "modern"
  },
  {
    id: "lifestyle-boheme",
    name: "Style Bohème",
    category: "lifestyle",
    size: "square",
    preview: "bg-gradient-to-br from-amber-100 via-yellow-50 to-emerald-50",
    accentColor: "#92400E",
    aiPromptStyle: "bohemian decor, natural textures, plants, warm tones, artistic lifestyle",
    textPosition: "overlay",
    fontStyle: "playful"
  },
  {
    id: "lifestyle-industrial",
    name: "Loft Industriel",
    category: "lifestyle",
    size: "square",
    preview: "bg-gradient-to-br from-zinc-200 via-stone-300 to-neutral-400",
    accentColor: "#44403C",
    aiPromptStyle: "industrial loft, exposed brick, metal accents, urban chic, architectural",
    textPosition: "bottom",
    fontStyle: "bold"
  },
  {
    id: "lifestyle-coastal",
    name: "Bord de Mer",
    category: "lifestyle",
    size: "story",
    preview: "bg-gradient-to-b from-sky-100 via-blue-50 to-white",
    accentColor: "#0369A1",
    aiPromptStyle: "coastal living, beach house, light airy, ocean vibes, mediterranean",
    textPosition: "bottom",
    fontStyle: "elegant"
  },

  // PROMO - Sales and promotions
  {
    id: "promo-flash",
    name: "Vente Flash",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-600",
    badge: "FLASH",
    badgeColor: "bg-yellow-400 text-black",
    accentColor: "#FBBF24",
    aiPromptStyle: "urgent sale, dynamic, bold colors, attention grabbing, limited time",
    textPosition: "center",
    fontStyle: "bold"
  },
  {
    id: "promo-blackfriday",
    name: "Black Friday",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-black via-zinc-900 to-neutral-800",
    overlayStyle: "radial-gradient(circle at 30% 70%, rgba(255,215,0,0.15) 0%, transparent 50%)",
    badge: "BLACK FRIDAY",
    badgeColor: "bg-amber-400 text-black",
    accentColor: "#F59E0B",
    aiPromptStyle: "black friday, premium dark, gold accents, exclusive deals, luxury sale",
    textPosition: "center",
    fontStyle: "bold"
  },
  {
    id: "promo-soldes",
    name: "Soldes",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500",
    badge: "-50%",
    badgeColor: "bg-white text-emerald-700",
    accentColor: "#FFFFFF",
    aiPromptStyle: "seasonal sale, fresh, vibrant, savings, summer vibes",
    textPosition: "top",
    fontStyle: "bold"
  },
  {
    id: "promo-nouveaute",
    name: "Nouveauté",
    category: "promo",
    size: "square",
    preview: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600",
    badge: "NOUVEAU",
    badgeColor: "bg-white text-purple-700",
    accentColor: "#FFFFFF",
    aiPromptStyle: "new arrival, exciting, modern, trendy, must have",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "promo-exclusive",
    name: "Offre Exclusive",
    category: "promo",
    size: "story",
    preview: "bg-gradient-to-b from-amber-500 via-orange-500 to-red-500",
    badge: "EXCLUSIF",
    badgeColor: "bg-black text-amber-400",
    accentColor: "#000000",
    aiPromptStyle: "exclusive offer, VIP, premium, limited edition, special deal",
    textPosition: "center",
    fontStyle: "elegant"
  },

  // MINIMAL - Clean and elegant
  {
    id: "minimal-white",
    name: "Blanc Pur",
    category: "minimal",
    size: "square",
    preview: "bg-white",
    accentColor: "#000000",
    aiPromptStyle: "pure white background, clean, minimalist, product focus, studio lighting",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "minimal-cream",
    name: "Crème Élégant",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
    accentColor: "#78350F",
    aiPromptStyle: "cream background, warm tones, soft shadows, refined, sophisticated",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "minimal-sage",
    name: "Vert Sauge",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50",
    accentColor: "#065F46",
    aiPromptStyle: "sage green, natural, organic, earthy tones, sustainable aesthetic",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "minimal-noir",
    name: "Noir Mat",
    category: "minimal",
    size: "square",
    preview: "bg-gradient-to-br from-neutral-900 via-zinc-900 to-black",
    accentColor: "#FFFFFF",
    aiPromptStyle: "matte black, dramatic, high contrast, luxury, sophisticated dark",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "minimal-terracotta",
    name: "Terracotta",
    category: "minimal",
    size: "story",
    preview: "bg-gradient-to-b from-orange-100 via-amber-100 to-rose-100",
    accentColor: "#9A3412",
    aiPromptStyle: "terracotta tones, mediterranean, warm earth, artisanal feel",
    textPosition: "bottom",
    fontStyle: "elegant"
  },

  // BOLD - Eye-catching and vibrant
  {
    id: "bold-neon",
    name: "Néon Urbain",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-600",
    overlayStyle: "linear-gradient(135deg, rgba(0,255,255,0.2) 0%, transparent 50%)",
    accentColor: "#00FFFF",
    aiPromptStyle: "neon lights, urban, cyberpunk, electric, nightlife vibes",
    textPosition: "center",
    fontStyle: "bold"
  },
  {
    id: "bold-sunset",
    name: "Coucher de Soleil",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600",
    accentColor: "#FFFFFF",
    aiPromptStyle: "sunset colors, warm to cool gradient, romantic, golden hour",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "bold-electric",
    name: "Électrique",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600",
    badge: "HOT",
    badgeColor: "bg-cyan-400 text-black",
    accentColor: "#22D3EE",
    aiPromptStyle: "electric blue, energetic, tech vibes, modern, dynamic",
    textPosition: "top",
    fontStyle: "bold"
  },
  {
    id: "bold-tropical",
    name: "Tropical",
    category: "bold",
    size: "square",
    preview: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500",
    accentColor: "#FFFFFF",
    aiPromptStyle: "tropical paradise, lush green, exotic, vibrant nature, fresh",
    textPosition: "overlay",
    fontStyle: "playful"
  },
  {
    id: "bold-pop",
    name: "Pop Art",
    category: "bold",
    size: "story",
    preview: "bg-gradient-to-b from-yellow-400 via-orange-500 to-red-500",
    accentColor: "#000000",
    aiPromptStyle: "pop art style, bold colors, retro, fun, artistic",
    textPosition: "center",
    fontStyle: "playful"
  },

  // INSPIRATIONAL - Magazine & Editorial style
  {
    id: "inspi-magazine",
    name: "Style Magazine",
    category: "inspirational",
    size: "square",
    preview: "bg-gradient-to-br from-stone-100 via-neutral-50 to-zinc-100",
    accentColor: "#1C1917",
    aiPromptStyle: "editorial photography, magazine cover, high fashion, professional lighting",
    textPosition: "overlay",
    fontStyle: "elegant"
  },
  {
    id: "inspi-pinterest",
    name: "Pinterest Mood",
    category: "inspirational",
    size: "story",
    preview: "bg-gradient-to-b from-rose-50 via-pink-50 to-fuchsia-50",
    accentColor: "#BE185D",
    aiPromptStyle: "pinterest aesthetic, dreamy, soft focus, aspirational, moodboard",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "inspi-luxury",
    name: "Luxe Parisien",
    category: "inspirational",
    size: "square",
    preview: "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100",
    overlayStyle: "radial-gradient(circle at 80% 20%, rgba(212,175,55,0.2) 0%, transparent 40%)",
    badge: "PREMIUM",
    badgeColor: "bg-black text-amber-400",
    accentColor: "#D4AF37",
    aiPromptStyle: "parisian luxury, gold accents, opulent, refined elegance, haute couture",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "inspi-art",
    name: "Galerie d'Art",
    category: "inspirational",
    size: "square",
    preview: "bg-white",
    accentColor: "#000000",
    aiPromptStyle: "art gallery, museum quality, exhibition style, sophisticated, cultural",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "inspi-architect",
    name: "Architecture",
    category: "inspirational",
    size: "landscape",
    preview: "bg-gradient-to-r from-slate-200 via-gray-100 to-slate-200",
    accentColor: "#334155",
    aiPromptStyle: "architectural photography, geometric, modern design, clean lines, spatial",
    textPosition: "bottom",
    fontStyle: "modern"
  },

  // SEASONAL
  {
    id: "season-spring",
    name: "Printemps",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100",
    badge: "SPRING",
    badgeColor: "bg-emerald-500 text-white",
    accentColor: "#059669",
    aiPromptStyle: "spring bloom, fresh flowers, renewal, pastel colors, nature awakening",
    textPosition: "bottom",
    fontStyle: "playful"
  },
  {
    id: "season-summer",
    name: "Été",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-yellow-200 via-orange-200 to-red-200",
    badge: "SUMMER",
    badgeColor: "bg-orange-500 text-white",
    accentColor: "#EA580C",
    aiPromptStyle: "summer vibes, sunny, beach, vacation mood, bright and warm",
    textPosition: "center",
    fontStyle: "playful"
  },
  {
    id: "season-autumn",
    name: "Automne",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-amber-200 via-orange-300 to-red-300",
    badge: "AUTUMN",
    badgeColor: "bg-amber-700 text-white",
    accentColor: "#92400E",
    aiPromptStyle: "autumn colors, falling leaves, cozy, warm tones, harvest season",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "season-winter",
    name: "Hiver",
    category: "seasonal",
    size: "square",
    preview: "bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-100",
    badge: "WINTER",
    badgeColor: "bg-blue-600 text-white",
    accentColor: "#1D4ED8",
    aiPromptStyle: "winter wonderland, snowy, cozy indoor, festive, cold elegance",
    textPosition: "bottom",
    fontStyle: "modern"
  },
  {
    id: "season-noel",
    name: "Noël",
    category: "seasonal",
    size: "story",
    preview: "bg-gradient-to-b from-red-700 via-red-600 to-green-800",
    badge: "NOËL",
    badgeColor: "bg-amber-400 text-red-900",
    accentColor: "#FCD34D",
    aiPromptStyle: "christmas, festive, red and gold, holiday spirit, gift giving",
    textPosition: "center",
    fontStyle: "elegant"
  },

  // LANDSCAPE formats
  {
    id: "landscape-banner",
    name: "Bannière Web",
    category: "promo",
    size: "landscape",
    preview: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600",
    badge: "PROMO",
    badgeColor: "bg-white text-purple-600",
    accentColor: "#FFFFFF",
    aiPromptStyle: "web banner, wide format, promotional, call to action",
    textPosition: "center",
    fontStyle: "bold"
  },
  {
    id: "landscape-lifestyle",
    name: "Bannière Lifestyle",
    category: "lifestyle",
    size: "landscape",
    preview: "bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50",
    accentColor: "#9A3412",
    aiPromptStyle: "lifestyle banner, wide living space, panoramic interior, magazine spread",
    textPosition: "bottom",
    fontStyle: "elegant"
  },
  {
    id: "landscape-minimal",
    name: "Bannière Épurée",
    category: "minimal",
    size: "landscape",
    preview: "bg-gradient-to-r from-gray-50 via-white to-gray-50",
    accentColor: "#000000",
    aiPromptStyle: "clean banner, white space, minimalist wide, product showcase",
    textPosition: "center",
    fontStyle: "modern"
  }
];

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "lifestyle", label: "🏠 Lifestyle" },
  { value: "inspirational", label: "✨ Inspiration" },
  { value: "promo", label: "🔥 Promo" },
  { value: "minimal", label: "◻️ Minimal" },
  { value: "bold", label: "💜 Bold" },
  { value: "seasonal", label: "🌸 Saison" },
];

const SIZES: { value: TemplateSize | "all"; label: string; icon: string }[] = [
  { value: "all", label: "Tous", icon: "⊞" },
  { value: "square", label: "Carré", icon: "□" },
  { value: "story", label: "Story", icon: "▯" },
  { value: "landscape", label: "Paysage", icon: "▭" },
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
  whiteBgImage?: string | null;
}

export function CreativeTemplateGrid({ 
  selected, 
  onSelect, 
  category, 
  onCategoryChange,
  sizeFilter,
  onSizeChange,
  product,
  whiteBgImage
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

  const getGridClass = (size: TemplateSize) => {
    switch (size) {
      case "story": return "col-span-1";
      case "landscape": return "col-span-2";
      default: return "col-span-1";
    }
  };

  const discount = product?.compare_at_price && product?.price 
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="flex gap-1.5 pb-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(cat.value)}
                className="shrink-0 text-xs h-8"
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="flex gap-1 sm:border-l sm:pl-3">
          {SIZES.map((size) => (
            <Button
              key={size.value}
              variant={sizeFilter === size.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onSizeChange(size.value)}
              className="text-xs px-2 h-8"
              title={size.label}
            >
              <span className="mr-1">{size.icon}</span>
              <span className="hidden sm:inline">{size.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 auto-rows-auto">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative rounded-xl overflow-hidden transition-all duration-200 group",
              getGridClass(template.size),
              selected === template.id 
                ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background scale-[1.02]" 
                : "ring-1 ring-border hover:ring-primary/50 hover:shadow-lg"
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

              {/* Badge */}
              {template.badge && (
                <div className="absolute top-2 left-2 z-10">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full",
                    template.badgeColor
                  )}>
                    {discount && template.badge.includes("%") ? `-${discount}%` : template.badge}
                  </span>
                </div>
              )}

              {/* Product Image Preview */}
              {(whiteBgImage || product?.image) ? (
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  <img 
                    src={whiteBgImage || product?.image || ''}
                    alt=""
                    className="max-w-[65%] max-h-[65%] object-contain drop-shadow-xl"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-black/10" />
                </div>
              )}

              {/* Template Name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                <p className="text-[10px] font-medium text-white truncate">
                  {template.name}
                </p>
              </div>

              {/* Selection Check */}
              {selected === template.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun template trouvé pour ces filtres
        </div>
      )}
    </div>
  );
}