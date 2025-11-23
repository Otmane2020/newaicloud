import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Check } from "lucide-react";
import { useTranslation } from "@/lib/language";

export interface ColorScheme {
  paletteId: string;
  primary: string;      // Main accent color (CTAs, highlights)
  secondary: string;    // Secondary accent (headings)
  background: string;   // Main background (always light)
  surface: string;      // Card/section backgrounds
  text: string;         // Main text (guaranteed contrast)
  textMuted: string;    // Secondary text
}

export interface LandingConfig {
  layout: string;
  colorScheme: ColorScheme;
  contentLength: string;
  vendorSource: "shopify" | "extract" | "generate";
  customHighlights?: string;
  designStyle: 'minimalist' | 'modern' | 'premium';
  theme: 'light' | 'dark';
}

interface LandingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: LandingConfig) => void;
  productTitle?: string;
}


// Layout previews
const LAYOUT_PREVIEWS = [
  {
    id: "1 colonne",
    name: "1 Colonne",
    icon: (
      <div className="flex flex-col gap-1 w-full">
        <div className="h-2 bg-primary/20 rounded w-full" />
        <div className="h-2 bg-primary/20 rounded w-3/4 mx-auto" />
        <div className="h-2 bg-primary/20 rounded w-full" />
      </div>
    ),
    description: "Centré, idéal mobile",
  },
  {
    id: "2 colonnes",
    name: "2 Colonnes",
    icon: (
      <div className="flex gap-1 w-full">
        <div className="flex-1 h-8 bg-primary/20 rounded" />
        <div className="flex-1 h-8 bg-primary/30 rounded" />
      </div>
    ),
    description: "Image + Texte",
  },
  {
    id: "hero à gauche",
    name: "Hero Gauche",
    icon: (
      <div className="flex gap-1 w-full">
        <div className="w-2/5 h-8 bg-primary/30 rounded" />
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
        </div>
      </div>
    ),
    description: "Image dominante à gauche",
  },
  {
    id: "hero à droite",
    name: "Hero Droite",
    icon: (
      <div className="flex gap-1 w-full">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
        </div>
        <div className="w-2/5 h-8 bg-primary/30 rounded" />
      </div>
    ),
    description: "Image dominante à droite",
  },
];

// Color palettes
const COLOR_PALETTES = [
  {
    id: "modern",
    name: "Moderne",
    colors: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
    description: "Noir élégant et nuances de gris",
  },
  {
    id: "blue",
    name: "Professionnel Bleu",
    colors: ["#003366", "#0066CC", "#3399FF", "#66B3FF", "#99CCFF"],
    description: "Bleu marine à bleu clair",
  },
  {
    id: "earth",
    name: "Terreux",
    colors: ["#5D4037", "#795548", "#A1887F", "#D7CCC8", "#EFEBE9"],
    description: "Tons marron et beige naturels",
  },
  {
    id: "luxury",
    name: "Luxe Or",
    colors: ["#1A1A1A", "#4A4A4A", "#B8860B", "#DAA520", "#FFD700"],
    description: "Noir avec accents dorés",
  },
  {
    id: "fresh",
    name: "Frais Vert",
    colors: ["#1B5E20", "#388E3C", "#66BB6A", "#81C784", "#A5D6A7"],
    description: "Vert forêt à vert pastel",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    colors: ["#B71C1C", "#D32F2F", "#F44336", "#EF5350", "#E57373"],
    description: "Rouge intense et énergique",
  },
];

const STORAGE_KEY = "landing-config-preferences";

export function LandingConfigDialog({ open, onOpenChange, onConfirm, productTitle }: LandingConfigDialogProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LandingConfig>({
    layout: "2 colonnes",
    colorScheme: {
      paletteId: "modern",
      primary: "#000000",
      secondary: "#333333",
      background: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#000000",
      textMuted: "#666666",
    },
    contentLength: "short",
    vendorSource: "shopify",
    customHighlights: "",
    designStyle: "modern",
    theme: "light",
  });

  const [selectedPalette, setSelectedPalette] = useState<string | null>("modern");
  const [useCustomColor, setUseCustomColor] = useState(false);

  // Layout previews
  const LAYOUT_PREVIEWS = [
    {
      id: "1 colonne",
      name: t.landingConfig.layout.oneColumn,
      icon: (
        <div className="flex flex-col gap-1 w-full">
          <div className="h-2 bg-primary/20 rounded w-full" />
          <div className="h-2 bg-primary/20 rounded w-3/4 mx-auto" />
          <div className="h-2 bg-primary/20 rounded w-full" />
        </div>
      ),
      description: t.landingConfig.layout.desc.oneColumn,
    },
    {
      id: "2 colonnes",
      name: t.landingConfig.layout.twoColumns,
      icon: (
        <div className="flex gap-1 w-full">
          <div className="flex-1 h-8 bg-primary/20 rounded" />
          <div className="flex-1 h-8 bg-primary/30 rounded" />
        </div>
      ),
      description: t.landingConfig.layout.desc.twoColumns,
    },
    {
      id: "hero à gauche",
      name: t.landingConfig.layout.heroLeft,
      icon: (
        <div className="flex gap-1 w-full">
          <div className="w-2/5 h-8 bg-primary/30 rounded" />
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-2 bg-primary/20 rounded" />
            <div className="h-2 bg-primary/20 rounded w-3/4" />
          </div>
        </div>
      ),
      description: t.landingConfig.layout.desc.heroLeft,
    },
    {
      id: "hero à droite",
      name: t.landingConfig.layout.heroRight,
      icon: (
        <div className="flex gap-1 w-full">
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-2 bg-primary/20 rounded" />
            <div className="h-2 bg-primary/20 rounded w-3/4" />
          </div>
          <div className="w-2/5 h-8 bg-primary/30 rounded" />
        </div>
      ),
      description: t.landingConfig.layout.desc.heroRight,
    },
  ];

  // Color palettes
  const COLOR_PALETTES = [
    {
      id: "modern",
      name: t.landingConfig.colorPalette.modern,
      colors: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
      description: t.landingConfig.colorPalette.descriptions.modern,
    },
    {
      id: "blue",
      name: t.landingConfig.colorPalette.professionalBlue,
      colors: ["#003366", "#0066CC", "#3399FF", "#66B3FF", "#99CCFF"],
      description: t.landingConfig.colorPalette.descriptions.professionalBlue,
    },
    {
      id: "earth",
      name: t.landingConfig.colorPalette.earth,
      colors: ["#5D4037", "#795548", "#A1887F", "#D7CCC8", "#EFEBE9"],
      description: t.landingConfig.colorPalette.descriptions.earth,
    },
    {
      id: "luxury",
      name: t.landingConfig.colorPalette.luxuryGold,
      colors: ["#1A1A1A", "#4A4A4A", "#B8860B", "#DAA520", "#FFD700"],
      description: t.landingConfig.colorPalette.descriptions.luxuryGold,
    },
    {
      id: "fresh",
      name: t.landingConfig.colorPalette.freshGreen,
      colors: ["#1B5E20", "#388E3C", "#66BB6A", "#81C784", "#A5D6A7"],
      description: t.landingConfig.colorPalette.descriptions.freshGreen,
    },
    {
      id: "vibrant",
      name: t.landingConfig.colorPalette.vibrant,
      colors: ["#B71C1C", "#D32F2F", "#F44336", "#EF5350", "#E57373"],
      description: t.landingConfig.colorPalette.descriptions.vibrant,
    },
  ];

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed.config);
        setSelectedPalette(parsed.selectedPalette);
        setUseCustomColor(parsed.useCustomColor);
      }
    } catch (error) {
      console.error("Failed to load saved preferences:", error);
    }
  }, []);

  // Save preferences to localStorage whenever config changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          config,
          selectedPalette,
          useCustomColor,
        }),
      );
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }, [config, selectedPalette, useCustomColor]);

  // Fonction utilitaire pour extraire vendor du titre
  const extractVendorFromTitle = (title: string): string => {
    const words = title.split(" ");
    const capitalizedWord = words.find(
      (word) => word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase(),
    );
    return capitalizedWord || t.landingConfig.vendor.extractExample.replace("Ex:", "").trim() || "Brand";
  };

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">{t.landingConfig.title}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {productTitle
                  ? `${t.landingConfig.forProduct} : ${productTitle.substring(0, 50)}...`
                  : t.landingConfig.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto px-1">
          {/* Thème clair/sombre */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🌓 Thème</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setConfig({ ...config, theme: 'light' })}
                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${
                  config.theme === 'light'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-30 rounded-xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">☀️</span>
                    {config.theme === 'light' && (
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base mb-1">Clair</div>
                    <div className="text-xs text-muted-foreground">Fond lumineux et texte sombre</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setConfig({ ...config, theme: 'dark' })}
                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${
                  config.theme === 'dark'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 opacity-30 rounded-xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🌙</span>
                    {config.theme === 'dark' && (
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base mb-1">Sombre</div>
                    <div className="text-xs text-muted-foreground">Fond sombre et texte lumineux</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Modèle de design */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🎯 {t.landingConfig.designStyle.title}</Label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setConfig({ ...config, designStyle: 'minimalist' })}
                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${
                  config.designStyle === 'minimalist'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-10 rounded-xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">⚪</span>
                    {config.designStyle === 'minimalist' && (
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base mb-1">{t.landingConfig.designStyle.minimalist}</div>
                    <div className="text-xs text-muted-foreground font-medium mb-2">{t.landingConfig.designStyle.minimalistShort}</div>
                    <div className="text-xs text-muted-foreground">{t.landingConfig.designStyle.minimalistDesc}</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setConfig({ ...config, designStyle: 'modern' })}
                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${
                  config.designStyle === 'modern'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-10 rounded-xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">✨</span>
                    {config.designStyle === 'modern' && (
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base mb-1">{t.landingConfig.designStyle.modern}</div>
                    <div className="text-xs text-muted-foreground font-medium mb-2">{t.landingConfig.designStyle.modernShort}</div>
                    <div className="text-xs text-muted-foreground">{t.landingConfig.designStyle.modernDesc}</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setConfig({ ...config, designStyle: 'premium' })}
                className={`relative p-6 border-2 rounded-xl transition-all hover:shadow-lg ${
                  config.designStyle === 'premium'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-10 rounded-xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👑</span>
                    {config.designStyle === 'premium' && (
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base mb-1">{t.landingConfig.designStyle.premium}</div>
                    <div className="text-xs text-muted-foreground font-medium mb-2">{t.landingConfig.designStyle.premiumShort}</div>
                    <div className="text-xs text-muted-foreground">{t.landingConfig.designStyle.premiumDesc}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🧱 {t.landingConfig.layout.title}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUT_PREVIEWS.map((layout, index) => (
                <Card
                  key={layout.id}
                  className={`cursor-pointer p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    config.layout === layout.id
                      ? "ring-2 ring-primary bg-primary/5 scale-[1.02]"
                      : "hover:border-primary/50"
                  }`}
                  style={{ animationDelay: `${index * 75}ms` }}
                  onClick={() => setConfig({ ...config, layout: layout.id })}
                >
                  <div className="mb-3 flex items-center justify-center h-10 transition-transform duration-300">
                    {layout.icon}
                  </div>
                  <h4 className="font-semibold text-sm text-center mb-1">{layout.name}</h4>
                  <p className="text-xs text-muted-foreground text-center">{layout.description}</p>
                  {config.layout === layout.id && (
                    <div className="flex justify-center mt-2">
                      <Check className="w-4 h-4 text-primary animate-scale-in" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Palette de couleurs */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🎨 {t.landingConfig.colorPalette.title}</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLOR_PALETTES.map((palette, index) => (
                <Card
                  key={palette.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedPalette === palette.id
                      ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                      : "hover:shadow-md hover:border-primary/50"
                  }`}
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => {
                    setSelectedPalette(palette.id);
                    setUseCustomColor(false);
                    setConfig({ 
                      ...config, 
                      colorScheme: {
                        paletteId: palette.id,
                        primary: palette.colors[0],      // Darkest for CTAs
                        secondary: palette.colors[1],    // Secondary headings
                        background: "#FFFFFF",           // Always white
                        surface: palette.colors[4],      // Lightest for sections
                        text: palette.colors[0],         // Darkest for text
                        textMuted: palette.colors[2],    // Mid-tone for secondary text
                      }
                    });
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedPalette === palette.id && <Check className="w-4 h-4 text-primary animate-scale-in" />}
                      <span className="font-semibold text-sm">{palette.name}</span>
                    </div>

                    <div className="flex gap-1 mb-2">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="flex-1 h-8 rounded-md border shadow-sm transition-transform duration-200 hover:scale-110"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">{palette.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3 p-3 border rounded-lg">
              <Checkbox
                id="custom-color"
                checked={useCustomColor}
                onCheckedChange={(checked) => {
                  setUseCustomColor(!!checked);
                  if (checked) setSelectedPalette(null);
                }}
              />
              <Label htmlFor="custom-color" className="cursor-pointer flex-1">
                {t.landingConfig.colorPalette.useCustom}
              </Label>
            </div>

            {useCustomColor && (
              <div className="mt-2 animate-slide-in-right">
                <input
                  type="color"
                  value={config.colorScheme.primary}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    colorScheme: {
                      paletteId: "custom",
                      primary: e.target.value,
                      secondary: e.target.value,
                      background: "#FFFFFF",
                      surface: "#F5F5F5",
                      text: "#000000",
                      textMuted: "#666666",
                    }
                  })}
                  className="w-full h-12 rounded-md border cursor-pointer transition-transform duration-200 hover:scale-105"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t.landingConfig.colorPalette.selected} : {config.colorScheme.primary}
                </p>
              </div>
            )}
          </div>

          {/* Longueur du contenu */}
          <div className="space-y-2">
            <Label htmlFor="length">✏️ {t.landingConfig.contentLength.title}</Label>
            <Select
              value={config.contentLength}
              onValueChange={(value) => setConfig({ ...config, contentLength: value })}
            >
              <SelectTrigger id="length">
                <SelectValue placeholder={t.landingConfig.contentLength.title} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">
                  {t.landingConfig.contentLength.short} - Concis mais complet
                </SelectItem>
                <SelectItem value="long">
                  {t.landingConfig.contentLength.long} - Détaillé avec exemples
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Vendor/Marque */}
          <div className="space-y-3 pb-2 border-t pt-4">
            <Label className="text-base font-semibold">🏷️ {t.landingConfig.vendor.title}</Label>
            <p className="text-xs text-muted-foreground">{t.landingConfig.vendor.description}</p>

            <div className="grid gap-2">
              {/* Option 1 : Shopify */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: "shopify" })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === "shopify"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.vendorSource === "shopify" ? "border-primary" : "border-border"
                    }`}
                  >
                    {config.vendorSource === "shopify" && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{t.landingConfig.vendor.importShopify}</p>
                    <p className="text-xs text-muted-foreground">{t.landingConfig.vendor.importShopifyDesc}</p>
                  </div>
                </div>
              </button>

              {/* Option 2 : Extraire */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: "extract" })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === "extract"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.vendorSource === "extract" ? "border-primary" : "border-border"
                    }`}
                  >
                    {config.vendorSource === "extract" && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{t.landingConfig.vendor.extractTitle}</p>
                    <p className="text-xs text-muted-foreground">{t.landingConfig.vendor.extractTitleDesc}</p>
                    {productTitle && (
                      <p className="text-xs text-primary mt-1 font-mono">
                        {t.landingConfig.vendor.extractExample} "{productTitle}" →{" "}
                        {extractVendorFromTitle(productTitle)}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Option 3 : Générer avec IA */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: "generate" })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === "generate"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.vendorSource === "generate" ? "border-primary" : "border-border"
                    }`}
                  >
                    {config.vendorSource === "generate" && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">
                      {t.landingConfig.vendor.generateAI} <Sparkles className="w-3 h-3" />
                    </p>
                    <p className="text-xs text-muted-foreground">{t.landingConfig.vendor.generateAIDesc}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Champ de saisie libre pour highlights personnalisés */}
          <div className="space-y-3 pb-2 border-t pt-4 animate-fade-in">
            <Label className="text-base font-semibold">✨ {t.landingConfig.customHighlights.title}</Label>
            <p className="text-xs text-muted-foreground">{t.landingConfig.customHighlights.description}</p>
            <textarea
              value={config.customHighlights || ""}
              onChange={(e) => setConfig({ ...config, customHighlights: e.target.value })}
              placeholder={t.landingConfig.customHighlights.placeholder}
              className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-muted/30"
              rows={4}
            />
            <p className="text-xs text-muted-foreground italic">{t.landingConfig.customHighlights.tip}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t.landingConfig.buttons.cancel}
          </Button>
          <Button onClick={handleConfirm} className="gap-2 w-full sm:w-auto">
            <Sparkles className="w-4 h-4" />
            {t.landingConfig.buttons.generate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
