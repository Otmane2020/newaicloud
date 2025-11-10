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
import { Sparkles, Check, Smartphone, Palette, Layout, Type, Tag, Star } from "lucide-react";
import { useTranslation } from "@/lib/language";

export interface LandingConfig {
  style: string;
  layout: string;
  colorScheme: string;
  contentLength: string;
  vendorSource: "shopify" | "extract" | "generate";
  mentionBrand?: boolean;
  customHighlights?: string;
  mobileFirst?: boolean; // 🆕 Nouveau paramètre mobile-first
}

interface LandingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: LandingConfig) => void;
  productTitle?: string;
}

// Predefined visual styles avec descriptions améliorées
const VISUAL_STYLES = [
  {
    id: "moderne",
    name: "Moderne",
    icon: "✨",
    color: "from-blue-500 to-purple-500",
    description: "Design contemporain avec lignes épurées et accents dégradés",
  },
  {
    id: "minimaliste",
    name: "Minimaliste",
    icon: "⚪",
    color: "from-gray-400 to-gray-600",
    description: "Simplicité élégante avec espace blanc généreux",
  },
  {
    id: "scandinave",
    name: "Scandinave",
    icon: "🌲",
    color: "from-green-400 to-blue-400",
    description: "Esthétique nordique naturelle avec tons bois et textures organiques",
  },
  {
    id: "premium",
    name: "Premium",
    icon: "👑",
    color: "from-yellow-500 to-orange-500",
    description: "Luxe et sophistication avec typographie élégante",
  },
  {
    id: "neutre",
    name: "Neutre",
    icon: "⬜",
    color: "from-gray-300 to-gray-400",
    description: "Palette équilibrée pour une approche intemporelle",
  },
  {
    id: "coloré",
    name: "Coloré",
    icon: "🎨",
    color: "from-pink-500 to-red-500",
    description: "Design énergique avec couleurs vibrantes et accents audacieux",
  },
];

// Layout previews améliorés avec orientation mobile
const LAYOUT_PREVIEWS = [
  {
    id: "1 colonne",
    name: "1 Colonne",
    icon: (
      <div className="flex flex-col gap-1 w-full">
        <div className="h-3 bg-primary/30 rounded w-full" />
        <div className="h-2 bg-primary/20 rounded w-4/5 mx-auto" />
        <div className="h-8 bg-primary/10 rounded w-full" />
        <div className="h-2 bg-primary/20 rounded w-full" />
      </div>
    ),
    description: "Layout vertical optimisé mobile - Parfait pour le scroll",
    mobileOptimized: true,
  },
  {
    id: "2 colonnes",
    name: "2 Colonnes",
    icon: (
      <div className="flex flex-col sm:flex-row gap-1 w-full">
        <div className="flex-1 h-12 bg-primary/20 rounded sm:h-8" />
        <div className="flex-1 h-8 bg-primary/30 rounded hidden sm:block" />
      </div>
    ),
    description: "Image + texte côte à côte sur desktop - Empilé sur mobile",
    mobileOptimized: true,
  },
  {
    id: "hero à gauche",
    name: "Hero Gauche",
    icon: (
      <div className="flex flex-col sm:flex-row gap-1 w-full">
        <div className="w-full sm:w-2/5 h-10 bg-primary/30 rounded" />
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-3 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
          <div className="h-2 bg-primary/20 rounded w-1/2" />
        </div>
      </div>
    ),
    description: "Image dominante à gauche - Adaptation mobile fluide",
    mobileOptimized: true,
  },
  {
    id: "hero à droite",
    name: "Hero Droite",
    icon: (
      <div className="flex flex-col sm:flex-row gap-1 w-full">
        <div className="flex-1 flex flex-col gap-0.5 order-2 sm:order-1">
          <div className="h-3 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
          <div className="h-2 bg-primary/20 rounded w-1/2" />
        </div>
        <div className="w-full sm:w-2/5 h-10 bg-primary/30 rounded order-1 sm:order-2" />
      </div>
    ),
    description: "Image dominante à droite - Parfait pour le storytelling",
    mobileOptimized: true,
  },
];

// Color palettes optimisées pour mobile
const COLOR_PALETTES = [
  {
    id: "modern",
    name: "Moderne",
    colors: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
    description: "Noir élégant et nuances de gris - Contraste parfait mobile",
    accessibility: "Excellent contraste",
  },
  {
    id: "blue",
    name: "Professionnel Bleu",
    colors: ["#003366", "#0066CC", "#3399FF", "#66B3FF", "#99CCFF"],
    description: "Bleu marine à bleu clair - Fiable et professionnel",
    accessibility: "Bon contraste",
  },
  {
    id: "earth",
    name: "Terreux",
    colors: ["#5D4037", "#795548", "#A1887F", "#D7CCC8", "#EFEBE9"],
    description: "Tons naturels marron et beige - Chaud et accueillant",
    accessibility: "Contraste moyen",
  },
  {
    id: "luxury",
    name: "Luxe Or",
    colors: ["#1A1A1A", "#4A4A4A", "#B8860B", "#DAA520", "#FFD700"],
    description: "Noir avec accents dorés - Premium et sophistiqué",
    accessibility: "Excellent contraste",
  },
  {
    id: "fresh",
    name: "Frais Vert",
    colors: ["#1B5E20", "#388E3C", "#66BB6A", "#81C784", "#A5D6A7"],
    description: "Vert forêt à vert pastel - Naturel et rafraîchissant",
    accessibility: "Bon contraste",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    colors: ["#B71C1C", "#D32F2F", "#F44336", "#EF5350", "#E57373"],
    description: "Rouge intense et énergique - Attire l'attention",
    accessibility: "Excellent contraste",
  },
];

const STORAGE_KEY = "landing-config-preferences";

export function LandingConfigDialog({ open, onOpenChange, onConfirm, productTitle }: LandingConfigDialogProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LandingConfig>({
    style: "moderne",
    layout: "1 colonne", // 🆕 Changé par défaut pour mobile-first
    colorScheme: "#000000",
    contentLength: "moyenne (800 mots)",
    vendorSource: "shopify",
    mentionBrand: true,
    customHighlights: "",
    mobileFirst: true, // 🆕 Activé par défaut
  });

  const [selectedPalette, setSelectedPalette] = useState<string | null>("modern");
  const [useCustomColor, setUseCustomColor] = useState(false);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({ ...prev, ...parsed.config }));
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
    return capitalizedWord || words.find((w) => w.length > 3) || "Marque";
  };

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  // 🆕 Fonction pour obtenir l'icône du layout
  const getLayoutIcon = (layoutId: string) => {
    switch (layoutId) {
      case "1 colonne":
        return <Smartphone className="w-4 h-4" />;
      case "2 colonnes":
        return <Layout className="w-4 h-4" />;
      case "hero à gauche":
        return <div className="text-xs">←</div>;
      case "hero à droite":
        return <div className="text-xs">→</div>;
      default:
        return <Layout className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Configuration de la Landing Page</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {productTitle
                  ? `Personnalisation pour : ${productTitle.substring(0, 60)}...`
                  : "Configurez l'apparence et le contenu de votre landing page"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[65vh] overflow-y-auto px-1">
          {/* 🆕 Section Mobile-First */}
          <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-semibold text-blue-900">📱 Approche Mobile-First</Label>
                <p className="text-xs text-blue-700 mt-1">
                  Optimisé pour mobile d'abord, puis adapté pour desktop - Meilleure expérience utilisateur
                </p>
              </div>
              <Checkbox
                id="mobile-first"
                checked={config.mobileFirst ?? true}
                onCheckedChange={(checked) => setConfig({ ...config, mobileFirst: !!checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            {config.mobileFirst && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Check className="w-3 h-3" />
                  <span>Design optimisé pour écrans 320px+</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                  <Check className="w-3 h-3" />
                  <span>Éléments tactiles de 44px minimum</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                  <Check className="w-3 h-3" />
                  <span>Chargement rapide et performance mobile</span>
                </div>
              </div>
            )}
          </div>

          {/* Style visuel amélioré */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              <Label className="text-base font-semibold">🎨 Style Visuel</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Choisissez l'esthétique générale de votre landing page
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VISUAL_STYLES.map((style, index) => (
                <Card
                  key={style.id}
                  className={`cursor-pointer p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    config.style === style.id
                      ? "ring-2 ring-primary bg-primary/5 scale-105 shadow-md"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, style: style.id })}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-2xl bg-gradient-to-br ${style.color} bg-clip-text text-transparent transition-transform duration-300`}
                    >
                      {style.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{style.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{style.description}</p>
                    </div>
                    {config.style === style.id && <Check className="w-4 h-4 text-primary animate-scale-in shrink-0" />}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Layout amélioré avec indicateurs mobile */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-green-600" />
              <Label className="text-base font-semibold">🧱 Structure du Layout</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Organisation du contenu - Tous optimisés pour mobile</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LAYOUT_PREVIEWS.map((layout, index) => (
                <Card
                  key={layout.id}
                  className={`cursor-pointer p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    config.layout === layout.id
                      ? "ring-2 ring-primary bg-primary/5 scale-[1.02] shadow-md"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, layout: layout.id })}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      {getLayoutIcon(layout.id)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{layout.name}</h4>
                        {layout.mobileOptimized && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            <Smartphone className="w-3 h-3" />
                            Mobile
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{layout.description}</p>
                      <div className="w-full mt-2">{layout.icon}</div>
                    </div>
                    {config.layout === layout.id && (
                      <Check className="w-4 h-4 text-primary animate-scale-in shrink-0 mt-1" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Palette de couleurs améliorée */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-600" />
              <Label className="text-base font-semibold">🎨 Palette de Couleurs</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Sélectionnez la palette qui correspond à votre marque</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COLOR_PALETTES.map((palette, index) => (
                <Card
                  key={palette.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedPalette === palette.id
                      ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                      : "hover:shadow-md hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setSelectedPalette(palette.id);
                    setUseCustomColor(false);
                    setConfig({ ...config, colorScheme: palette.colors[0] });
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {selectedPalette === palette.id && <Check className="w-4 h-4 text-primary animate-scale-in" />}
                      <span className="font-semibold text-sm flex-1">{palette.name}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          palette.accessibility === "Excellent contraste"
                            ? "bg-green-100 text-green-700"
                            : palette.accessibility === "Bon contraste"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {palette.accessibility}
                      </span>
                    </div>

                    <div className="flex gap-1 mb-3 rounded-lg overflow-hidden border">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="flex-1 h-8 transition-all duration-200 hover:scale-110 hover:z-10 relative"
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

            <div className="flex items-center gap-3 mt-4 p-4 border rounded-lg bg-muted/30">
              <Checkbox
                id="custom-color"
                checked={useCustomColor}
                onCheckedChange={(checked) => {
                  setUseCustomColor(!!checked);
                  if (checked) setSelectedPalette(null);
                }}
              />
              <Label htmlFor="custom-color" className="cursor-pointer flex-1">
                <span className="font-medium">Utiliser une couleur personnalisée</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez une couleur spécifique pour votre marque
                </p>
              </Label>
            </div>

            {useCustomColor && (
              <div className="mt-2 p-4 border rounded-lg bg-white animate-slide-in-right">
                <Label className="text-sm font-medium mb-2 block">Couleur personnalisée</Label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={config.colorScheme}
                    onChange={(e) => setConfig({ ...config, colorScheme: e.target.value })}
                    className="w-16 h-16 rounded-lg border cursor-pointer transition-transform duration-200 hover:scale-110"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-mono bg-muted px-3 py-2 rounded-lg">{config.colorScheme}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cette couleur sera utilisée pour les titres, icônes et accents
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Longueur du contenu améliorée */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-indigo-600" />
              <Label className="text-base font-semibold">✏️ Longueur du Contenu</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Adaptez la quantité de contenu généré selon vos besoins
            </p>
            <Select
              value={config.contentLength}
              onValueChange={(value) => setConfig({ ...config, contentLength: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courte (400 mots)">
                  <div className="flex items-center gap-2">
                    <span>Courte (400 mots)</span>
                    <span className="text-xs text-muted-foreground">- Idéal mobile, contenu concis</span>
                  </div>
                </SelectItem>
                <SelectItem value="moyenne (800 mots)">
                  <div className="flex items-center gap-2">
                    <span>Moyenne (800 mots)</span>
                    <span className="text-xs text-muted-foreground">- Équilibré, bon pour le SEO</span>
                  </div>
                </SelectItem>
                <SelectItem value="longue (1500 mots)">
                  <div className="flex items-center gap-2">
                    <span>Longue (1500 mots)</span>
                    <span className="text-xs text-muted-foreground">- Complet, excellent référencement</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Vendor/Marque améliorée */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-600" />
              <Label className="text-base font-semibold">🏷️ Gestion de la Marque</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Comment souhaitez-vous gérer le nom de la marque dans votre contenu ?
            </p>

            <div className="grid gap-3">
              {[
                {
                  id: "shopify",
                  title: "Importer depuis Shopify",
                  description: "Utiliser le vendor défini dans votre boutique Shopify",
                  icon: "🏪",
                },
                {
                  id: "extract",
                  title: "Extraire du titre",
                  description: "Détecter automatiquement la marque depuis le nom du produit",
                  icon: "🔍",
                },
                {
                  id: "generate",
                  title: "Générer avec IA",
                  description: "Créer un nom de marque pertinent avec l'intelligence artificielle",
                  icon: "🤖",
                },
              ].map((option) => (
                <Card
                  key={option.id}
                  className={`cursor-pointer p-4 transition-all duration-300 hover:scale-[1.01] ${
                    config.vendorSource === option.id ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, vendorSource: option.id as any })}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{option.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{option.title}</p>
                        {config.vendorSource === option.id && (
                          <Check className="w-4 h-4 text-primary animate-scale-in" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      {option.id === "extract" && productTitle && (
                        <p className="text-xs text-primary mt-2 font-medium">
                          Exemple: "{productTitle}" → {extractVendorFromTitle(productTitle)}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        config.vendorSource === option.id ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {config.vendorSource === option.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Checkbox pour mentionner la marque */}
            <Card className="p-4 bg-muted/30 border">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="mention-brand"
                  checked={config.mentionBrand ?? true}
                  onCheckedChange={(checked) => setConfig({ ...config, mentionBrand: !!checked })}
                />
                <Label htmlFor="mention-brand" className="cursor-pointer flex-1">
                  <span className="font-medium">Mentionner la marque dans la description</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Intégrer le nom de la marque naturellement dans le contenu généré
                  </p>
                </Label>
              </div>
            </Card>
          </div>

          {/* Champ de saisie libre pour highlights personnalisés amélioré */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <Label className="text-base font-semibold">✨ Points Forts Personnalisés</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Ajoutez des caractéristiques spécifiques à mettre en avant
            </p>
            <div className="space-y-3">
              <textarea
                value={config.customHighlights || ""}
                onChange={(e) => setConfig({ ...config, customHighlights: e.target.value })}
                placeholder="Exemple: 
• Matériau écologique certifié
• Fabrication artisanale française  
• Garantie 5 ans incluse
• Livraison gratuite en 48h"
                className="w-full min-h-[120px] p-4 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                rows={5}
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                  <span className="text-primary text-xs">💡</span>
                </div>
                <p>
                  <strong>Conseil :</strong> Listez vos principaux avantages sous forme de puces. Ces points seront
                  intégrés naturellement dans le contenu généré.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-3 w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="lg"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">Générer la Landing Page</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
