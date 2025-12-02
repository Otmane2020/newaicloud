import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

export type TemplateCategory = 
  | "all" 
  | "trending" 
  | "promo" 
  | "black-friday" 
  | "minimal" 
  | "bold" 
  | "feature" 
  | "testimonial"
  | "story";

export interface CreativeTemplate {
  id: string;
  name: string;
  category: TemplateCategory[];
  preview: string;
  overlayStyle?: string;
  badge?: string;
  badgeColor?: string;
}

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  // Black Friday Templates
  {
    id: "bf-neon",
    name: "Black Friday Neon",
    category: ["all", "trending", "black-friday", "promo"],
    preview: "bg-gradient-to-br from-black via-gray-900 to-black",
    badge: "BLACK FRIDAY",
    badgeColor: "bg-yellow-400 text-black",
  },
  {
    id: "bf-red",
    name: "Black Friday Red",
    category: ["all", "black-friday", "promo", "bold"],
    preview: "bg-gradient-to-br from-red-900 via-black to-red-950",
    badge: "-70%",
    badgeColor: "bg-red-600 text-white",
  },
  {
    id: "bf-gold",
    name: "Black Friday Gold",
    category: ["all", "black-friday", "promo"],
    preview: "bg-gradient-to-br from-yellow-900 via-black to-yellow-950",
    badge: "SALE",
    badgeColor: "bg-yellow-500 text-black",
  },
  {
    id: "bf-electric",
    name: "Electric Sale",
    category: ["all", "trending", "black-friday"],
    preview: "bg-gradient-to-br from-purple-900 via-black to-blue-900",
    badge: "50% OFF",
    badgeColor: "bg-cyan-400 text-black",
  },
  // Promo Templates
  {
    id: "promo-red",
    name: "Red Hot Promo",
    category: ["all", "promo", "bold"],
    preview: "bg-gradient-to-br from-red-500 via-rose-600 to-red-700",
    badge: "🔥 PROMO",
    badgeColor: "bg-yellow-400 text-red-700",
  },
  {
    id: "promo-flash",
    name: "Flash Sale",
    category: ["all", "trending", "promo"],
    preview: "bg-gradient-to-br from-orange-500 via-red-500 to-pink-600",
    badge: "FLASH",
    badgeColor: "bg-white text-orange-600",
  },
  {
    id: "promo-summer",
    name: "Summer Sale",
    category: ["all", "promo"],
    preview: "bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600",
    badge: "SUMMER",
    badgeColor: "bg-yellow-300 text-blue-700",
  },
  {
    id: "promo-limited",
    name: "Limited Edition",
    category: ["all", "promo", "bold"],
    preview: "bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800",
    badge: "LIMITED",
    badgeColor: "bg-white text-emerald-700",
  },
  // Minimal Templates
  {
    id: "minimal-white",
    name: "Clean White",
    category: ["all", "minimal"],
    preview: "bg-white border border-gray-200",
  },
  {
    id: "minimal-beige",
    name: "Soft Beige",
    category: ["all", "minimal", "trending"],
    preview: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50",
  },
  {
    id: "minimal-gray",
    name: "Modern Gray",
    category: ["all", "minimal"],
    preview: "bg-gradient-to-br from-gray-100 via-slate-100 to-gray-200",
  },
  {
    id: "minimal-cream",
    name: "Elegant Cream",
    category: ["all", "minimal"],
    preview: "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50",
  },
  // Bold/Feature Templates
  {
    id: "bold-gradient",
    name: "Bold Gradient",
    category: ["all", "bold", "feature"],
    preview: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    badge: "NEW",
    badgeColor: "bg-white text-purple-700",
  },
  {
    id: "bold-sunset",
    name: "Sunset Vibes",
    category: ["all", "bold", "trending"],
    preview: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600",
  },
  {
    id: "bold-ocean",
    name: "Ocean Deep",
    category: ["all", "bold"],
    preview: "bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600",
  },
  {
    id: "bold-forest",
    name: "Forest Green",
    category: ["all", "bold", "feature"],
    preview: "bg-gradient-to-br from-green-700 via-emerald-600 to-teal-700",
    badge: "ECO",
    badgeColor: "bg-lime-400 text-green-900",
  },
  // Gold/Luxury Templates
  {
    id: "gold-premium",
    name: "Gold Premium",
    category: ["all", "trending", "feature"],
    preview: "bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500",
    badge: "PREMIUM",
    badgeColor: "bg-amber-900 text-yellow-200",
  },
  {
    id: "gold-elegant",
    name: "Elegant Gold",
    category: ["all", "feature"],
    preview: "bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300",
  },
  // Tech Templates
  {
    id: "tech-dark",
    name: "Tech Dark",
    category: ["all", "bold", "feature"],
    preview: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800",
    badge: "TECH",
    badgeColor: "bg-cyan-400 text-slate-900",
  },
  {
    id: "tech-neon",
    name: "Neon Glow",
    category: ["all", "trending", "bold"],
    preview: "bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-900",
    badge: "HOT",
    badgeColor: "bg-fuchsia-400 text-purple-900",
  },
  // Story Templates
  {
    id: "story-gradient",
    name: "Story Gradient",
    category: ["all", "story", "trending"],
    preview: "bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-600",
  },
  {
    id: "story-sunset",
    name: "Story Sunset",
    category: ["all", "story"],
    preview: "bg-gradient-to-b from-orange-400 via-rose-500 to-purple-600",
  },
  {
    id: "story-ocean",
    name: "Story Ocean",
    category: ["all", "story"],
    preview: "bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600",
  },
  {
    id: "story-dark",
    name: "Story Dark",
    category: ["all", "story", "bold"],
    preview: "bg-gradient-to-b from-gray-800 via-gray-900 to-black",
  },
  // Testimonial/Feature Templates
  {
    id: "testimonial-soft",
    name: "Soft Review",
    category: ["all", "testimonial", "minimal"],
    preview: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
    badge: "⭐⭐⭐⭐⭐",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "testimonial-dark",
    name: "Dark Review",
    category: ["all", "testimonial"],
    preview: "bg-gradient-to-br from-slate-800 via-gray-800 to-zinc-900",
    badge: "5/5",
    badgeColor: "bg-yellow-400 text-gray-900",
  },
];

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "trending", label: "Tendance" },
  { id: "promo", label: "Promo" },
  { id: "black-friday", label: "Black Friday" },
  { id: "minimal", label: "Minimal" },
  { id: "bold", label: "Bold" },
  { id: "feature", label: "Feature" },
  { id: "story", label: "Story" },
  { id: "testimonial", label: "Testimonial" },
];

interface CreativeTemplateGridProps {
  selected: string;
  onSelect: (templateId: string) => void;
  category: TemplateCategory;
  onCategoryChange: (category: TemplateCategory) => void;
}

export function CreativeTemplateGrid({ 
  selected, 
  onSelect, 
  category, 
  onCategoryChange 
}: CreativeTemplateGridProps) {
  const filteredTemplates = CREATIVE_TEMPLATES.filter(
    t => category === "all" || t.category.includes(category)
  );

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg">
          <Sparkles className="h-3.5 w-3.5 text-primary mr-1" />
          {CATEGORIES.slice(0, 2).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                category === cat.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {CATEGORIES.slice(2).map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
              category === cat.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template Grid - Masonry Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredTemplates.map((template, index) => {
          const isSelected = selected === template.id;
          // Vary heights for masonry effect
          const isStory = template.category.includes("story");
          const isTall = index % 5 === 0 || index % 7 === 0;
          
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={cn(
                "group relative rounded-xl overflow-hidden transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected && "ring-2 ring-primary shadow-lg",
                isStory ? "row-span-2" : isTall ? "row-span-2" : ""
              )}
            >
              {/* Preview Background */}
              <div
                className={cn(
                  "w-full transition-all",
                  template.preview,
                  isStory ? "aspect-[9/16]" : isTall ? "aspect-[3/4]" : "aspect-square"
                )}
              >
                {/* Badge */}
                {template.badge && (
                  <div className="absolute top-2 left-2">
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded shadow-sm",
                      template.badgeColor || "bg-white text-gray-900"
                    )}>
                      {template.badge}
                    </span>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  "bg-black/40 opacity-0 group-hover:opacity-100"
                )}>
                  <span className="text-white text-xs font-medium px-3 py-1.5 bg-black/50 rounded-full backdrop-blur-sm">
                    {template.name}
                  </span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
