import { Card } from "@/components/ui/card";
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
        <div className="text-center space-y-2 p-8">
          <p className="text-lg font-medium text-muted-foreground">
            Sélectionnez les options pour voir la prévisualisation
          </p>
          <p className="text-sm text-muted-foreground">
            Choisissez un layout, un style, une longueur de contenu et une palette de couleurs
          </p>
        </div>
      </div>
    );
  }

  const isMinimal = designStyle === "minimal";
  const isModern = designStyle === "modern";
  const isLuxury = designStyle === "luxury";

  const isShort = contentLength === "short";
  const isMedium = contentLength === "medium";
  const isLong = contentLength === "long";

  // Icons & labels centralisés
  const highlightIcons: Record<string, any> = {
    free_shipping: <Truck className="h-5 w-5" />,
    money_back: <Shield className="h-5 w-5" />,
    eco_friendly: <RefreshCcw className="h-5 w-5" />,
    handmade: <Heart className="h-5 w-5" />,
    limited_edition: <Star className="h-5 w-5" />,
  };

  const highlightLabels: Record<string, string> = {
    free_shipping: "Livraison Gratuite",
    money_back: "Garantie Satisfait",
    eco_friendly: "Éco-Responsable",
    handmade: "Fait Main",
    limited_edition: "Édition Limitée",
  };

  // Styles dynamiques
  const previewStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    "--preview-primary": colors.primary,
    "--preview-secondary": colors.secondary,
    "--preview-accent": colors.accent,
    "--preview-surface": colors.surface,
    "--preview-muted": colors.textMuted,
  } as React.CSSProperties;

  /*********************************************
   * HERO SPLIT LAYOUT
   *********************************************/
  if (layout === "hero_split") {
    return (
      <div className="w-full h-full rounded-lg border overflow-auto" style={previewStyle}>
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* IMAGE / COULEUR */}
          <div className="relative flex items-center justify-center" style={{ backgroundColor: colors.surface }}>
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
              }}
            />
            <div className="text-7xl opacity-20">🛋️</div>
          </div>

          {/* CONTENT */}
          <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">
            {isLuxury && (
              <Badge
                className="w-fit px-4 py-1 text-sm"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                Collection Exclusive
              </Badge>
            )}

            {/* TITLE */}
            <h1
              className={`font-bold leading-tight ${
                isLuxury
                  ? "text-4xl md:text-5xl font-serif"
                  : isModern
                    ? "text-3xl md:text-4xl tracking-tight"
                    : "text-3xl font-light tracking-wide"
              }`}
            >
              {isLuxury ? "Canapé Prestige" : isModern ? "Canapé Design Moderne" : "Canapé Essentiel"}
            </h1>

            {/* DESCRIPTION */}
            <p className={`${isLong ? "text-base" : "text-sm"} leading-relaxed`} style={{ color: colors.textMuted }}>
              {isShort && "Élégance et confort réunis dans un design contemporain."}
              {isMedium &&
                "Découvrez notre canapé design qui allie élégance moderne et confort optimal. Parfait pour votre salon et tous types d’intérieurs."}
              {isLong &&
                "Découvrez notre canapé design exceptionnel qui allie confort, élégance et durabilité. Chaque détail est pensé pour offrir une expérience haut de gamme et transformer votre espace de vie."}
            </p>

            {/* PRICE */}
            <div className="flex items-center gap-4">
              <span className={`font-bold ${isLuxury ? "text-4xl" : "text-3xl"}`} style={{ color: colors.primary }}>
                1 299€
              </span>
              {!isMinimal && (
                <span className="text-xl line-through" style={{ color: colors.textMuted }}>
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
                    className={`flex items-center gap-2 text-sm p-2 transition-all ${
                      isLuxury ? "border" : isModern ? "rounded-lg shadow-sm" : ""
                    }`}
                    style={{
                      backgroundColor: isMinimal ? "transparent" : colors.surface,
                      borderColor: isLuxury ? colors.primary : "transparent",
                    }}
                  >
                    <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                    <span className={`${isLuxury ? "font-serif" : ""}`}>{highlightLabels[h]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* LONG SECTION */}
            {isLong && (
              <div
                className="p-4 rounded-lg border-t"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.textMuted + "33",
                }}
              >
                <h3 className="font-semibold mb-2" style={{ color: colors.secondary }}>
                  Caractéristiques principales
                </h3>
                <ul className="text-sm space-y-1" style={{ color: colors.textMuted }}>
                  <li>✓ Matériaux premium de haute qualité</li>
                  <li>✓ Structure robuste et durable</li>
                  <li>✓ Design ergonomique et confortable</li>
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                className={`flex-1 transition-all ${
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
                  className={`${isLuxury ? "w-14 h-14 rounded-none" : "rounded-full shadow-sm"}`}
                  style={{
                    borderColor: colors.primary,
                    color: colors.primary,
                  }}
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

  /*********************************************
   * DEFAULT CENTER LAYOUT
   *********************************************/
  return (
    <div className="w-full h-full rounded-lg border overflow-auto" style={previewStyle}>
      <div className="max-w-4xl mx-auto p-8 md:p-12 text-center space-y-10">
        {/* BADGE */}
        {isLuxury && (
          <Badge className="px-4 py-1 text-sm" style={{ backgroundColor: colors.accent, color: colors.background }}>
            Collection Exclusive
          </Badge>
        )}

        {/* TITLE */}
        <h1
          className={`font-bold leading-tight ${
            isLuxury ? "text-5xl md:text-6xl font-serif" : isModern ? "text-4xl md:text-5xl" : "text-3xl font-light"
          }`}
        >
          {isLuxury ? "Canapé Prestige" : isModern ? "Canapé Design Moderne" : "Canapé Essentiel"}
        </h1>

        {/* IMAGE */}
        <div
          className={`w-full aspect-video relative overflow-hidden ${
            isLuxury ? "" : "rounded-lg"
          } ${isModern ? "shadow-xl" : ""}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2/3 h-2/3 rounded-lg opacity-10" style={{ backgroundColor: colors.primary }} />
            <div className="absolute text-8xl opacity-20">🛋️</div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p
          className={`mx-auto max-w-2xl leading-relaxed ${isLong ? "text-lg md:text-xl" : "text-base md:text-lg"}`}
          style={{ color: colors.textMuted }}
        >
          {isShort && "Élégance et confort réunis dans un design contemporain."}
          {isMedium &&
            "Découvrez notre canapé design moderne, confortable et parfaitement adapté à tous les styles d’intérieur."}
          {isLong &&
            "Découvrez un canapé haut de gamme alliant élégance, design et confort. Fabriqué avec des matériaux premium, il transformera votre espace de vie grâce à ses finitions impeccables et son esthétique contemporaine."}
        </p>

        {/* PRICE */}
        <div className="flex items-center justify-center gap-4">
          <span className={`font-bold ${isLuxury ? "text-5xl" : "text-4xl"}`} style={{ color: colors.primary }}>
            1 299€
          </span>

          {!isMinimal && (
            <span className="text-2xl line-through" style={{ color: colors.textMuted }}>
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
                <span style={{ color: colors.primary }}>{highlightIcons[h]}</span>
                <span className={`${isLuxury ? "font-serif" : ""} font-medium`}>{highlightLabels[h]}</span>
              </div>
            ))}
          </div>
        )}

        {/* LONG FEATURES */}
        {isLong && (
          <div
            className={`max-w-xl mx-auto p-6 text-left ${
              isLuxury ? "border-2" : "rounded-lg"
            } ${isModern ? "shadow-md" : ""}`}
            style={{
              backgroundColor: isMinimal ? "transparent" : colors.surface,
              borderColor: isLuxury ? colors.secondary : "transparent",
            }}
          >
            <h3
              className={`font-semibold mb-3 ${isLuxury ? "font-serif text-xl" : "text-lg"}`}
              style={{ color: colors.secondary }}
            >
              Caractéristiques principales
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: colors.textMuted }}>
              <li>✓ Matériaux premium de qualité supérieure</li>
              <li>✓ Design ergonomique pour un confort optimal</li>
              <li>✓ Garantie 5 ans incluse</li>
              <li>✓ Livraison et installation offertes</li>
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
