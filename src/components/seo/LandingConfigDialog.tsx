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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Check } from "lucide-react";
import { useTranslation } from "@/lib/language";

export interface LandingConfig {
  style: string;
  layout: string;
  colorScheme: string;
  contentLength: string;
  vendorSource: 'shopify' | 'extract' | 'generate';
}

interface LandingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: LandingConfig) => void;
  productTitle?: string;
}

// Predefined visual styles
const VISUAL_STYLES = [
  { id: 'moderne', name: 'Moderne', icon: '✨', color: 'from-blue-500 to-purple-500' },
  { id: 'minimaliste', name: 'Minimaliste', icon: '⚪', color: 'from-gray-400 to-gray-600' },
  { id: 'scandinave', name: 'Scandinave', icon: '🌲', color: 'from-green-400 to-blue-400' },
  { id: 'premium', name: 'Premium', icon: '👑', color: 'from-yellow-500 to-orange-500' },
  { id: 'neutre', name: 'Neutre', icon: '⬜', color: 'from-gray-300 to-gray-400' },
  { id: 'coloré', name: 'Coloré', icon: '🎨', color: 'from-pink-500 to-red-500' }
];

// Layout previews
const LAYOUT_PREVIEWS = [
  {
    id: '1 colonne',
    name: '1 Colonne',
    icon: (
      <div className="flex flex-col gap-1 w-full">
        <div className="h-2 bg-primary/20 rounded w-full" />
        <div className="h-2 bg-primary/20 rounded w-3/4 mx-auto" />
        <div className="h-2 bg-primary/20 rounded w-full" />
      </div>
    ),
    description: 'Centré, idéal mobile'
  },
  {
    id: '2 colonnes',
    name: '2 Colonnes',
    icon: (
      <div className="flex gap-1 w-full">
        <div className="flex-1 h-8 bg-primary/20 rounded" />
        <div className="flex-1 h-8 bg-primary/30 rounded" />
      </div>
    ),
    description: 'Image + Texte'
  },
  {
    id: 'hero à gauche',
    name: 'Hero Gauche',
    icon: (
      <div className="flex gap-1 w-full">
        <div className="w-2/5 h-8 bg-primary/30 rounded" />
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
        </div>
      </div>
    ),
    description: 'Image dominante à gauche'
  },
  {
    id: 'hero à droite',
    name: 'Hero Droite',
    icon: (
      <div className="flex gap-1 w-full">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-primary/20 rounded" />
          <div className="h-2 bg-primary/20 rounded w-3/4" />
        </div>
        <div className="w-2/5 h-8 bg-primary/30 rounded" />
      </div>
    ),
    description: 'Image dominante à droite'
  }
];

// Color palettes
const COLOR_PALETTES = [
  {
    id: 'modern',
    name: 'Moderne',
    colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'],
    description: 'Noir élégant et nuances de gris'
  },
  {
    id: 'blue',
    name: 'Professionnel Bleu',
    colors: ['#003366', '#0066CC', '#3399FF', '#66B3FF', '#99CCFF'],
    description: 'Bleu marine à bleu clair'
  },
  {
    id: 'earth',
    name: 'Terreux',
    colors: ['#5D4037', '#795548', '#A1887F', '#D7CCC8', '#EFEBE9'],
    description: 'Tons marron et beige naturels'
  },
  {
    id: 'luxury',
    name: 'Luxe Or',
    colors: ['#1A1A1A', '#4A4A4A', '#B8860B', '#DAA520', '#FFD700'],
    description: 'Noir avec accents dorés'
  },
  {
    id: 'fresh',
    name: 'Frais Vert',
    colors: ['#1B5E20', '#388E3C', '#66BB6A', '#81C784', '#A5D6A7'],
    description: 'Vert forêt à vert pastel'
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    colors: ['#B71C1C', '#D32F2F', '#F44336', '#EF5350', '#E57373'],
    description: 'Rouge intense et énergique'
  }
];

const STORAGE_KEY = 'landing-config-preferences';

export function LandingConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productTitle,
}: LandingConfigDialogProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LandingConfig>({
    style: "moderne",
    layout: "2 colonnes",
    colorScheme: "#000000",
    contentLength: "moyenne (800 mots)",
    vendorSource: 'shopify',
  });
  
  const [selectedPalette, setSelectedPalette] = useState<string | null>('modern');
  const [useCustomColor, setUseCustomColor] = useState(false);

  // Predefined visual styles
  const VISUAL_STYLES = [
    { id: 'moderne', name: t.landingConfig.visualStyle.modern, icon: '✨', color: 'from-blue-500 to-purple-500' },
    { id: 'minimaliste', name: t.landingConfig.visualStyle.minimalist, icon: '⚪', color: 'from-gray-400 to-gray-600' },
    { id: 'scandinave', name: t.landingConfig.visualStyle.scandinavian, icon: '🌲', color: 'from-green-400 to-blue-400' },
    { id: 'premium', name: t.landingConfig.visualStyle.premium, icon: '👑', color: 'from-yellow-500 to-orange-500' },
    { id: 'neutre', name: t.landingConfig.visualStyle.neutral, icon: '⬜', color: 'from-gray-300 to-gray-400' },
    { id: 'coloré', name: t.landingConfig.visualStyle.colorful, icon: '🎨', color: 'from-pink-500 to-red-500' }
  ];

  // Layout previews
  const LAYOUT_PREVIEWS = [
    {
      id: '1 colonne',
      name: t.landingConfig.layout.oneColumn,
      icon: (
        <div className="flex flex-col gap-1 w-full">
          <div className="h-2 bg-primary/20 rounded w-full" />
          <div className="h-2 bg-primary/20 rounded w-3/4 mx-auto" />
          <div className="h-2 bg-primary/20 rounded w-full" />
        </div>
      ),
      description: t.landingConfig.layout.desc.oneColumn
    },
    {
      id: '2 colonnes',
      name: t.landingConfig.layout.twoColumns,
      icon: (
        <div className="flex gap-1 w-full">
          <div className="flex-1 h-8 bg-primary/20 rounded" />
          <div className="flex-1 h-8 bg-primary/30 rounded" />
        </div>
      ),
      description: t.landingConfig.layout.desc.twoColumns
    },
    {
      id: 'hero à gauche',
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
      description: t.landingConfig.layout.desc.heroLeft
    },
    {
      id: 'hero à droite',
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
      description: t.landingConfig.layout.desc.heroRight
    }
  ];

  // Color palettes
  const COLOR_PALETTES = [
    {
      id: 'modern',
      name: t.landingConfig.colorPalette.modern,
      colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'],
      description: t.landingConfig.colorPalette.descriptions.modern
    },
    {
      id: 'blue',
      name: t.landingConfig.colorPalette.professionalBlue,
      colors: ['#003366', '#0066CC', '#3399FF', '#66B3FF', '#99CCFF'],
      description: t.landingConfig.colorPalette.descriptions.professionalBlue
    },
    {
      id: 'earth',
      name: t.landingConfig.colorPalette.earth,
      colors: ['#5D4037', '#795548', '#A1887F', '#D7CCC8', '#EFEBE9'],
      description: t.landingConfig.colorPalette.descriptions.earth
    },
    {
      id: 'luxury',
      name: t.landingConfig.colorPalette.luxuryGold,
      colors: ['#1A1A1A', '#4A4A4A', '#B8860B', '#DAA520', '#FFD700'],
      description: t.landingConfig.colorPalette.descriptions.luxuryGold
    },
    {
      id: 'fresh',
      name: t.landingConfig.colorPalette.freshGreen,
      colors: ['#1B5E20', '#388E3C', '#66BB6A', '#81C784', '#A5D6A7'],
      description: t.landingConfig.colorPalette.descriptions.freshGreen
    },
    {
      id: 'vibrant',
      name: t.landingConfig.colorPalette.vibrant,
      colors: ['#B71C1C', '#D32F2F', '#F44336', '#EF5350', '#E57373'],
      description: t.landingConfig.colorPalette.descriptions.vibrant
    }
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
      console.error('Failed to load saved preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config,
        selectedPalette,
        useCustomColor
      }));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [config, selectedPalette, useCustomColor]);

  // Fonction utilitaire pour extraire vendor du titre
  const extractVendorFromTitle = (title: string): string => {
    const words = title.split(' ');
    const capitalizedWord = words.find(word => 
      word.length > 2 && 
      word[0] === word[0].toUpperCase() && 
      word.slice(1) === word.slice(1).toLowerCase()
    );
    return capitalizedWord || "Non détecté";
  };

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Configuration de la Landing Page</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {productTitle ? `Pour : ${productTitle.substring(0, 50)}...` : "Choisissez le style et le format"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Style visuel */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🎨 Style visuel</Label>
            <div className="grid grid-cols-3 gap-2">
              {VISUAL_STYLES.map((style, index) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setConfig({ ...config, style: style.id })}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                    config.style === style.id
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`text-3xl mb-1 bg-gradient-to-br ${style.color} bg-clip-text text-transparent transition-transform duration-300`}>
                    {style.icon}
                  </div>
                  <p className="text-xs font-semibold">{style.name}</p>
                  {config.style === style.id && (
                    <Check className="w-3 h-3 text-primary mx-auto mt-1 animate-scale-in" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-3 animate-fade-in">
            <Label className="text-base font-semibold">🧱 Layout de la page</Label>
            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_PREVIEWS.map((layout, index) => (
                <Card
                  key={layout.id}
                  className={`cursor-pointer p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    config.layout === layout.id
                      ? 'ring-2 ring-primary bg-primary/5 scale-[1.02]'
                      : 'hover:border-primary/50'
                  }`}
                  style={{ animationDelay: `${index * 75}ms` }}
                  onClick={() => setConfig({ ...config, layout: layout.id })}
                >
                  <div className="mb-3 flex items-center justify-center h-10 transition-transform duration-300">
                    {layout.icon}
                  </div>
                  <h4 className="font-semibold text-sm text-center mb-1">
                    {layout.name}
                  </h4>
                  <p className="text-xs text-muted-foreground text-center">
                    {layout.description}
                  </p>
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
            <Label className="text-base font-semibold">🎨 Palette de couleurs</Label>
            
            <div className="grid grid-cols-2 gap-3">
              {COLOR_PALETTES.map((palette, index) => (
                <Card 
                  key={palette.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedPalette === palette.id 
                      ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                      : 'hover:shadow-md hover:border-primary/50'
                  }`}
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => {
                    setSelectedPalette(palette.id);
                    setUseCustomColor(false);
                    setConfig({ ...config, colorScheme: palette.colors[0] });
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedPalette === palette.id && (
                        <Check className="w-4 h-4 text-primary animate-scale-in" />
                      )}
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
                    
                    <p className="text-xs text-muted-foreground">
                      {palette.description}
                    </p>
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
                Utiliser une couleur personnalisée
              </Label>
            </div>
            
            {useCustomColor && (
              <div className="mt-2 animate-slide-in-right">
                <input
                  type="color"
                  value={config.colorScheme}
                  onChange={(e) => setConfig({ ...config, colorScheme: e.target.value })}
                  className="w-full h-12 rounded-md border cursor-pointer transition-transform duration-200 hover:scale-105"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Couleur sélectionnée : {config.colorScheme}
                </p>
              </div>
            )}
          </div>

          {/* Longueur du contenu */}
          <div className="space-y-2">
            <Label htmlFor="length">✏️ Longueur du contenu</Label>
            <Select
              value={config.contentLength}
              onValueChange={(value) => setConfig({ ...config, contentLength: value })}
            >
              <SelectTrigger id="length">
                <SelectValue placeholder="Sélectionnez une longueur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courte (400 mots)">Courte (400 mots)</SelectItem>
                <SelectItem value="moyenne (800 mots)">Moyenne (800 mots)</SelectItem>
                <SelectItem value="longue (1500 mots)">Longue (1500 mots)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Vendor/Marque */}
          <div className="space-y-3 pb-2 border-t pt-4">
            <Label className="text-base font-semibold">🏷️ Gestion de la marque (Vendor)</Label>
            <p className="text-xs text-muted-foreground">
              Choisissez comment définir la marque du produit pour la landing page
            </p>
            
            <div className="grid gap-2">
              {/* Option 1 : Shopify */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: 'shopify' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === 'shopify'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    config.vendorSource === 'shopify' ? 'border-primary' : 'border-border'
                  }`}>
                    {config.vendorSource === 'shopify' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Importer de Shopify</p>
                    <p className="text-xs text-muted-foreground">
                      Utiliser le vendor déjà configuré dans Shopify
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2 : Extraire */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: 'extract' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === 'extract'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    config.vendorSource === 'extract' ? 'border-primary' : 'border-border'
                  }`}>
                    {config.vendorSource === 'extract' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Extraire du titre</p>
                    <p className="text-xs text-muted-foreground">
                      Détecter automatiquement la marque depuis le titre du produit
                    </p>
                    {productTitle && (
                      <p className="text-xs text-primary mt-1 font-mono">
                        Ex: "{productTitle}" → {extractVendorFromTitle(productTitle)}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {/* Option 3 : Générer avec IA */}
              <button
                type="button"
                onClick={() => setConfig({ ...config, vendorSource: 'generate' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.vendorSource === 'generate'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    config.vendorSource === 'generate' ? 'border-primary' : 'border-border'
                  }`}>
                    {config.vendorSource === 'generate' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">
                      Générer avec l'IA <Sparkles className="w-3 h-3" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Créer un nom de marque pertinent basé sur le produit
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
