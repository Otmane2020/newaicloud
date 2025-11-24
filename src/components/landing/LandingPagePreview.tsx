import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart, Star, Truck, Shield, RefreshCcw } from "lucide-react";

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
  highlights,
}: LandingPagePreviewProps) {
  if (!layout || !designStyle || !contentLength || !colors.primary) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-lg border bg-muted/20">
        <div className="text-center space-y-3 p-8 animate-in fade-in">
          <p className="text-lg font-medium text-muted-foreground">
            Sélectionnez les options pour voir la prévisualisation
          </p>
          <p className="text-sm text-muted-foreground">
            Choisissez un layout, un style, une longueur de contenu et une palette
          </p>
        </div>
      </div>
    );
  }

  // Variants
  const isMinimal = designStyle === "minimal";
  const isModern = designStyle === "modern";
  const isLuxury = designStyle === "luxury";

  const isShort = contentLength === "short";
  const isMedium = contentLength === "medium";
  const isLong = contentLength === "long";

  // Icons & labels
  const icons: Record<string, any> = {
    free_shipping: <Truck className="h-5 w-5" />,
    money_back: <Shield className="h-5 w-5" />,
    eco_friendly: <RefreshCcw className="h-5 w-5" />,
    handmade: <Heart className="h-5 w-5" />,
    limited_edition: <Star className="h-5 w-5" />,
  };

  const labels: Record<string, string> = {
    free_shipping: "Livraison Gratuite",
    money_back: "Garantie Satisfait",
    eco_friendly: "Éco-Responsable",
    handmade: "Fait Main",
    limited_edition: "Édition Limitée",
  };

  // Style
  const previewStyle = {
    backgroundColor: colors.background,
    color: colors.text,
  } as React.CSSProperties;

  /******************************************************
   * HERO SPLIT
   ******************************************************/
  if (layout === "hero_split") {
    return (
      <div className="w-full h-full rounded-lg border overflow-auto" style={previewStyle}>
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* LEFT / IMAGE */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <div
              className="absolute inset-0 opacity-20 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${colors.primary}33 0%, transparent 70%)`,
              }}
            />
            <div className="text-7xl opacity-30">🛋️</div>
          </div>

          {/* RIGHT / CONTENT */}
          <div className="p-8 md:p-12 flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-right-4">
            {isLuxury && (
              <Badge
                className="w-fit mb-2 shadow-sm"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                Collection Exclusive
              </Badge>
            )}

            <h1
              className={`font-bold leading-tight ${
                isLuxury
                  ? "text-4xl md:text-5xl font-serif"
                  : isModern
                    ? "text-3xl md:text-4xl"
                    : "text-3xl font-light tracking-wide"
              }`}
            >
              {isLuxury ? "Canapé Prestige" : isModern ? "Canapé Design Moderne" : "Canapé Essentiel"}
            </h1>

            {/* DESCRIPTION */}
            <p className={`leading-relaxed ${isLong ? "text-base" : "text-sm"}`} style={{ color: colors.textMuted }}>
              {isShort && "Élégance et confort réunis dans un design contemporain."}
              {isMedium && "Découvrez un canapé moderne, confortable et parfaitement intégré à votre intérieur."}
              {isLong &&
                "Découvrez un canapé haut de gamme alliant design, confort et matériaux premium. Une pièce forte qui sublimera votre salon."}
            </p>

            {/* PRICE */}
            <div className="flex items-center gap-4">
              <span className={`font-bold ${isLuxury ? "text-4xl" : "text-3xl"}`} style={{ color: colors.primary }}>
                1 299€
              </span>
              {!isMinimal && (
                <span className="text-xl line-through opacity-70" style={{ color: colors.textMuted }}>
                  1 599€
                </span>
              )}
            </div>

            {/* HIGHLIGHTS */}
            {highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {highlights.map((h) => (
                  <div
                    key={h}
                    className={`flex items-center gap-2 p-2 transition-all ${
                      isLuxury ? "border" : isModern ? "rounded-lg shadow-sm" : ""
                    }`}
                    style={{
                      backgroundColor: isMinimal ? "transparent" : colors.surface,
                      borderColor: isLuxury ? colors.primary : "transparent",
                    }}
                  >
                    <span style={{ color: colors.primary }}>{icons[h]}</span>
                    <span className={`${isLuxury ? "font-serif" : ""} text-sm`}>{labels[h]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* FEATURES (LONG ONLY) */}
            {isLong && (
              <div className="p-4 rounded-lg border-t animate-in fade-in" style={{ backgroundColor: colors.surface }}>
                <h3 className="font-semibold mb-2" style={{ color: colors.secondary }}>
                  Caractéristiques principales
                </h3>
                <ul className="text-sm space-y-1" style={{ color: colors.textMuted }}>
                  <li>✓ Matériaux premium</li>
                  <li>✓ Design ergonomique</li>
                  <li>✓ Livraison et installation offertes</li>
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                className={`flex-1 transition-all hover:scale-105 ${
                  isLuxury ? "text-lg py-6 rounded-none" : isModern ? "shadow-lg" : "rounded-full"
                }`}
                style={{ backgroundColor: colors.primary, color: "white" }}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isLuxury ? "Acquérir" : "Ajouter au panier"}
              </Button>

              {!isMinimal && (
                <Button
                  variant="outline"
                  size="icon"
                  className={`transition-all hover:scale-110 ${isLuxury ? "w-14 h-14 rounded-none" : "rounded-full"}`}
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

  /******************************************************
   * DEFAULT LAYOUT (CENTERED)
   ******************************************************/
  return (
    <div className="w-full h-full rounded-lg border overflow-auto" style={previewStyle}>
      <div className="max-w-4xl mx-auto p-10 text-center space-y-10 animate-in fade-in">
        {isLuxury && (
          <Badge className="px-4 py-1 shadow-sm" style={{ backgroundColor: colors.accent, color: colors.background }}>
            Collection Exclusive
          </Badge>
        )}

        <h1
          className={`font-bold leading-tight ${
            isLuxury ? "text-5xl md:text-6xl font-serif" : isModern ? "text-4xl md:text-5xl" : "text-3xl font-light"
          }`}
        >
          {isLuxury ? "Canapé Prestige" : isModern ? "Canapé Design Moderne" : "Canapé Essentiel"}
        </h1>

        {/* IMAGE AREA */}
        <div
          className={`w-full aspect-video relative overflow-hidden ${
            isLuxury ? "" : "rounded-lg"
          } ${isModern ? "shadow-xl" : ""}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-2/3 h-2/3 rounded-lg" style={{ backgroundColor: colors.primary, opacity: 0.2 }} />
            <div className="absolute text-8xl">🛋️</div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p
          className={`max-w-2xl mx-auto leading-relaxed ${isLong ? "text-lg" : "text-base"}`}
          style={{ color: colors.textMuted }}
        >
          {isShort && "Élégance et confort réunis dans un design contemporain."}
          {isMedium && "Un canapé moderne et confortable, parfaitement adapté à tous les styles d’intérieur."}
          {isLong &&
            "Un canapé haut de gamme conçu avec des matériaux premium, une finition remarquable et un design qui met en valeur votre espace de vie."}
        </p>

        {/* PRICE */}
        <div className="flex items-center justify-center gap-4">
          <span className={`font-bold ${isLuxury ? "text-5xl" : "text-4xl"}`} style={{ color: colors.primary }}>
            1 299€
          </span>

          {!isMinimal && (
            <span className="text-2xl line-through opacity-70" style={{ color: colors.textMuted }}>
              1 599€
            </span>
          )}
        </div>

        {/* HIGHLIGHTS */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4">
            {highlights.map((h) => (
              <div
                key={h}
                className={`flex items-center gap-2 px-4 py-2 ${
                  isLuxury ? "border-2" : isModern ? "rounded-lg shadow-sm" : "rounded-full"
                }`}
                style={{
                  backgroundColor: isMinimal ? "transparent" : colors.surface,
                  borderColor: isLuxury ? colors.primary : "transparent",
                }}
              >
                <span style={{ color: colors.primary }}>{icons[h]}</span>
                <span className={`${isLuxury ? "font-serif" : ""} font-medium`}>{labels[h]}</span>
              </div>
            ))}
          </div>
        )}

        {/* FEATURES (LONG) */}
        {isLong && (
          <div
            className={`max-w-xl mx-auto p-6 text-left ${
              isLuxury ? "border-2" : "rounded-lg"
            } ${isModern ? "shadow-md" : ""}`}
            style={{ backgroundColor: colors.surface }}
          >
            <h3 className="font-semibold mb-3" style={{ color: colors.secondary }}>
              Caractéristiques principales
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: colors.textMuted }}>
              <li>✓ Matériaux premium</li>
              <li>✓ Design ergonomique</li>
              <li>✓ Garantie 5 ans incluse</li>
              <li>✓ Livraison offerte</li>
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            className={`${isLuxury ? "text-lg px-8 py-6 rounded-none" : isModern ? "shadow-lg" : "rounded-full"}`}
            style={{ backgroundColor: colors.primary, color: "white" }}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isLuxury ? "Acquérir" : "Ajouter au panier"}
          </Button>

          {!isMinimal && (
            <Button
              variant="outline"
              size="lg"
              className={`${isLuxury ? "px-6 py-6 rounded-none" : "rounded-full shadow-sm"}`}
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
