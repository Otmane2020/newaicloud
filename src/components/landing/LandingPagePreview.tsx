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
      <div className="w-full h-full flex items-center justify-center rounded-xl border bg-muted/10 backdrop-blur-sm">
        <div className="text-center space-y-2 p-8">
          <p className="text-xl font-semibold text-muted-foreground animate-pulse">Prévisualisation en attente…</p>
          <p className="text-sm text-muted-foreground">Sélectionnez vos préférences pour générer l'aperçu</p>
        </div>
      </div>
    );
  }

  const isLuxury = designStyle === "luxury";
  const isModern = designStyle === "modern";
  const isMinimal = designStyle === "minimal";

  const isShort = contentLength === "short";
  const isMedium = contentLength === "medium";
  const isLong = contentLength === "long";

  // ICONES
  const highlightIcons = {
    free_shipping: <Truck className="h-5 w-5" />,
    money_back: <Shield className="h-5 w-5" />,
    eco_friendly: <RefreshCcw className="h-5 w-5" />,
    handmade: <Heart className="h-5 w-5" />,
    limited_edition: <Star className="h-5 w-5" />,
  };

  const highlightLabels = {
    free_shipping: "Livraison Gratuite",
    money_back: "Garantie Satisfait",
    eco_friendly: "Éco-Responsable",
    handmade: "Fait Main",
    limited_edition: "Édition Limitée",
  };

  const previewStyle = {
    backgroundColor: colors.background,
    color: colors.text,
  } as React.CSSProperties;

  /**************************************
   *      LAYOUT PREMIUM HERO NEW
   **************************************/
  if (layout === "hero_split") {
    return (
      <div className="w-full h-full overflow-auto rounded-xl border shadow-xl" style={previewStyle}>
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/********** IMAGE SIDE — Nouveau style glossy ***********/}
          <div className="relative bg-gradient-to-br from-black/10 to-black/20 backdrop-blur-xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-3/4 h-3/4 rounded-3xl transform hover:-translate-y-1 transition-all duration-500 shadow-2xl"
                style={{ backgroundColor: colors.surface, opacity: 0.5 }}
              />
              <div className="absolute text-7xl opacity-25 scale-110 transition-all">🛋️</div>
            </div>
          </div>

          {/********** CONTENT SIDE — Style Apple Premium ***********/}
          <div className="p-10 flex flex-col justify-center space-y-6">
            {/* BADGE */}
            {isLuxury && (
              <Badge
                className="w-fit px-4 py-1 text-sm tracking-wide"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                ✨ Collection Prestige
              </Badge>
            )}

            {/* TITRE */}
            <h1
              className={`
                font-bold leading-tight 
                ${isLuxury ? "text-5xl md:text-6xl font-serif tracking-tight" : ""}
                ${isModern ? "text-4xl md:text-5xl tracking-tight" : ""}
                ${isMinimal ? "text-3xl md:text-4xl font-light" : ""}
              `}
            >
              {isLuxury ? "Canapé Premium Prestige" : isModern ? "Canapé Design Moderne" : "Canapé Élégant"}
            </h1>

            {/* DESCRIPTION */}
            <p
              className={`
                ${isLong ? "text-base md:text-lg" : "text-sm md:text-base"}
                opacity-80 leading-relaxed
              `}
            >
              {isShort && "Design élégant et finitions haut de gamme."}
              {isMedium && "Un canapé pensé pour sublimer votre salon, mêlant confort extrême et design contemporain."}
              {isLong &&
                "Chaque courbe et chaque matière ont été soigneusement sélectionnées pour offrir une expérience unique. Profitez d'un confort exceptionnel allié à un design haut de gamme conçu pour durer."}
            </p>

            {/* PRIX */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold" style={{ color: colors.primary }}>
                1 299€
              </span>
              {!isMinimal && <span className="text-xl line-through opacity-50">1 599€</span>}
            </div>

            {/* HIGHLIGHTS */}
            {highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {highlights.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm bg-white/20 backdrop-blur-md border border-white/10"
                    style={{ color: colors.primary }}
                  >
                    {highlightIcons[h]}
                    <span className="text-sm">{highlightLabels[h]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA BUTTONS */}
            <div className="flex gap-4 pt-4">
              <Button
                className="flex-1 py-6 text-lg rounded-xl shadow-xl hover:scale-[1.02] transition-all"
                style={{ backgroundColor: colors.primary, color: "white" }}
              >
                <ShoppingCart className="mr-2" /> Acheter Maintenant
              </Button>
              {!isMinimal && (
                <Button
                  variant="outline"
                  className="py-6 rounded-xl border-2 hover:bg-white/40"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  <Heart />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**************************************
   *   SECOND LAYOUT — FULL CENTERED PREMIUM
   **************************************/
  return (
    <div className="w-full h-full overflow-auto rounded-xl border p-8 md:p-14 shadow-lg bg-gradient-to-br from-white to-gray-100">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        {isLuxury && (
          <Badge
            className="px-4 py-1 text-sm tracking-wide"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            ✨ Edition Luxe
          </Badge>
        )}

        {/* TITRE */}
        <h1
          className={`
            font-bold leading-tight 
            ${isLuxury ? "text-6xl font-serif" : ""}
            ${isModern ? "text-5xl" : ""}
            ${isMinimal ? "text-4xl font-light" : ""}
          `}
        >
          {isLuxury ? "Canapé Prestige Luxe" : isModern ? "Canapé Moderne Classique" : "Canapé Design Élégant"}
        </h1>

        {/* IMAGE PREVIEW */}
        <div
          className="w-full rounded-3xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-500"
          style={{ backgroundColor: colors.surface }}
        >
          <div className="relative h-64 flex items-center justify-center">
            <div className="absolute w-2/3 h-2/3 bg-white/20 rounded-2xl backdrop-blur-xl shadow-inner" />
            <div className="text-8xl opacity-20">🛋️</div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className={`mx-auto max-w-2xl ${isLong ? "text-lg" : "text-base"} opacity-70 leading-relaxed`}>
          {isShort && "Élégance. Confort. Simplicité."}
          {isMedium && "Un canapé parfait pour sublimer votre intérieur."}
          {isLong && "Un design haut de gamme, des matériaux premium et une expérience de confort incomparable."}
        </p>

        {/* PRIX */}
        <div className="flex justify-center gap-4 text-center">
          <span className="text-5xl font-bold" style={{ color: colors.primary }}>
            1 299€
          </span>
          {!isMinimal && <span className="text-2xl line-through opacity-40">1 599€</span>}
        </div>

        {/* CTA */}
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            className="px-10 py-6 text-lg rounded-xl shadow-xl hover:scale-[1.02] transition-all"
            style={{ backgroundColor: colors.primary, color: "white" }}
          >
            Acheter
          </Button>
          {!isMinimal && (
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-6 rounded-xl border-2 hover:bg-white/40"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              Favoris
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
