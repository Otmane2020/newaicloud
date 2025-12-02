import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type TemplateStyle = "gold" | "red-promo" | "minimal" | "tech" | "black-friday" | "story";

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

/* THEME VISUAL STYLES */
const templateStyles: Record<
  TemplateStyle,
  {
    bg: string;
    text: string;
    accent: string;
    priceColor: string;
    overlay?: string;
    glow?: string;
  }
> = {
  minimal: {
    bg: "bg-white",
    text: "text-gray-900",
    accent: "text-gray-600",
    priceColor: "text-primary",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-50 via-amber-100 to-amber-300",
    text: "text-amber-900",
    accent: "text-amber-700",
    priceColor: "text-yellow-700",
    glow: "drop-shadow-[0_0_25px_rgba(255,215,0,0.3)]",
  },
  "red-promo": {
    bg: "bg-gradient-to-br from-red-500 via-rose-600 to-red-700",
    text: "text-white",
    accent: "text-red-100",
    priceColor: "text-yellow-300",
    glow: "drop-shadow-[0_0_25px_rgba(255,255,0,0.4)]",
  },
  tech: {
    bg: "bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800",
    text: "text-white",
    accent: "text-indigo-200",
    priceColor: "text-cyan-400",
    glow: "drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]",
  },
  "black-friday": {
    bg: "bg-gradient-to-br from-black via-gray-900 to-black",
    text: "text-white",
    accent: "text-gray-400",
    priceColor: "text-yellow-400",
    glow: "drop-shadow-[0_0_18px_rgba(255,255,0,0.2)]",
  },
  story: {
    bg: "bg-gradient-to-b from-pink-500 via-purple-600 to-indigo-700",
    text: "text-white",
    accent: "text-pink-200",
    priceColor: "text-yellow-300",
    glow: "drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]",
  },
};

export function CreativePreview({ product, template, caption, generated }: CreativePreviewProps) {
  const style = templateStyles[template];
  const isStory = template === "story";
  const displayTitle = generated?.title || product?.title;

  /* ---------------------------
      PLACEHOLDER WHEN NO PRODUCT
    --------------------------- */
  if (!product) {
    return (
      <div
        className={cn(
          "relative rounded-lg flex items-center justify-center border border-dashed",
          isStory ? "aspect-[9/16]" : "aspect-square",
          "border-muted-foreground/30 bg-muted",
        )}
      >
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sélectionnez un produit</p>
        </div>
      </div>
    );
  }

  /* ---------------------------
      IMAGE SOURCE
    --------------------------- */
  const imageSrc = generated?.generatedImageUrl || product.image;

  /* ===========================
      FINAL TEMPLATE RENDER
     =========================== */
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg shadow-xl",
        isStory ? "aspect-[9/16]" : "aspect-square",
        style.bg,
      )}
    >
      {/* PREMIUM OVERLAY PATTERNS */}
      <div
        className={cn(
          "absolute inset-0 opacity-10 pointer-events-none",
          template === "tech" && "bg-[radial-gradient(circle_at_center,_#4f46e5_0%,transparent_70%)]",
          template === "gold" && "bg-[radial-gradient(circle_at_center,_#ffffff_10%,transparent_90%)]",
          template === "black-friday" && "bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_0%,transparent_100%)]",
        )}
      />

      {/* CONTENT */}
      <div className="absolute inset-0 p-4 flex flex-col">
        {/* BADGES (Promo, Black Friday, etc.) */}
        <div className="text-center mb-2">
          {template === "red-promo" && (
            <span className="bg-yellow-300 text-red-700 px-3 py-1 rounded-full text-xs font-extrabold shadow-md animate-pulse">
              🔥 PROMO EXCLUSIVE
            </span>
          )}
          {template === "black-friday" && (
            <span className="bg-yellow-400 text-black px-4 py-1 rounded text-sm font-black shadow-md">
              BLACK FRIDAY SALE
            </span>
          )}
        </div>

        {/* MAIN IMAGE */}
        <div className="flex-1 flex items-center justify-center p-2">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={displayTitle || ""}
              className={cn(
                "max-w-full max-h-full object-contain",
                style.glow,
                template === "minimal" && "drop-shadow-xl",
                template === "gold" && "drop-shadow-[0_10px_20px_rgba(200,150,50,0.3)]",
              )}
            />
          ) : (
            <div
              className={cn(
                "w-32 h-32 rounded-lg flex items-center justify-center",
                template === "minimal" ? "bg-gray-100" : "bg-white/20",
              )}
            >
              <ImageIcon className={cn("h-12 w-12", style.accent)} />
            </div>
          )}
        </div>

        {/* TITLE */}
        <h3 className={cn("font-bold text-center mt-2 leading-tight", style.text, isStory ? "text-xl" : "text-lg")}>
          {displayTitle}
        </h3>

        {/* PRICING */}
        {product.price && (
          <div className="flex items-center justify-center gap-2 mt-1">
            {product.compare_at_price && (
              <span className={cn("line-through text-sm opacity-60", style.accent)}>{product.compare_at_price}€</span>
            )}
            <span className={cn("font-extrabold", style.priceColor, isStory ? "text-3xl" : "text-2xl")}>
              {product.price}€
            </span>

            {product.compare_at_price && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded font-bold shadow",
                  template === "red-promo" ? "bg-yellow-300 text-red-700" : "bg-green-600 text-white",
                )}
              >
                -{Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100)}%
              </span>
            )}
          </div>
        )}

        {/* CAPTION */}
        {caption && <p className={cn("text-xs text-center mt-2 line-clamp-2", style.accent)}>{caption}</p>}
      </div>
    </div>
  );
}
