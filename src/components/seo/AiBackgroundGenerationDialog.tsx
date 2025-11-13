import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Sparkles, Check } from "lucide-react";
import { useState } from "react";

interface ProductImage {
  id: string;
  src: string;
  alt_text?: string | null;
  variant_id?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
}

interface AiBackgroundGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: GenerationConfig) => void;
  selectedProducts: string[];
  products: Product[];
  productImages?: Map<string, ProductImage[]>;
  variantImages?: Map<string, ProductImage[]>;
}

export interface GenerationConfig {
  prompt: string;
  style: "professional" | "lifestyle" | "minimalist" | "creative";
  format: "square" | "portrait" | "landscape";
  targetType: "main" | "variants";
  selectedImages: Map<string, string>; // productId -> imageUrl or variantId
}

const PRESET_PROMPTS = [
  {
    value: "professional_studio",
    label: "🎬 Studio Professionnel",
    prompt: "Professional e-commerce product photography with clean studio lighting, neutral gray backdrop, and soft shadows",
  },
  {
    value: "luxury_nature",
    label: "🌿 Nature Luxueuse",
    prompt: "Luxurious natural environment with elegant plants, natural wood elements, and soft ambient lighting",
  },
  {
    value: "modern_minimal",
    label: "⚪ Minimaliste Moderne",
    prompt: "Modern minimalist setting with clean geometric shapes, neutral tones, and contemporary aesthetics",
  },
  {
    value: "warm_lifestyle",
    label: "🏠 Lifestyle Chaleureux",
    prompt: "Warm lifestyle scene with cozy home elements, soft textiles, and inviting ambient lighting",
  },
  {
    value: "urban_industrial",
    label: "🏙️ Urbain Contemporain",
    prompt: "Contemporary urban setting with industrial elements, modern materials, and sleek aesthetics",
  },
  {
    value: "elegant_classic",
    label: "✨ Élégance Classique",
    prompt: "Elegant classical setting with refined decorative elements, soft warm lighting, and timeless style",
  },
];

function getVariantLabel(image: ProductImage): string {
  const options = [image.option1, image.option2, image.option3].filter(Boolean);
  return options.length > 0 ? options.join(" - ") : "Variante";
}

export function AiBackgroundGenerationDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedProducts,
  products,
  productImages = new Map(),
  variantImages = new Map(),
}: AiBackgroundGenerationDialogProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    prompt: "",
    style: "professional",
    format: "square",
    targetType: "main",
    selectedImages: new Map(),
  });

  const hasVariants = selectedProducts.some(
    (productId) => (variantImages.get(productId)?.length || 0) > 0
  );

  const handleConfirm = () => {
    if (!config.prompt.trim()) {
      return;
    }
    if (config.targetType === "variants" && config.selectedImages.size === 0) {
      return;
    }
    onConfirm(config);
    onOpenChange(false);
  };

  const handlePresetSelect = (presetValue: string) => {
    const preset = PRESET_PROMPTS.find((p) => p.value === presetValue);
    if (preset) {
      setConfig({ ...config, prompt: preset.prompt });
    }
  };

  const toggleImageSelection = (productId: string, imageId: string) => {
    const newMap = new Map(config.selectedImages);
    if (newMap.get(productId) === imageId) {
      newMap.delete(productId);
    } else {
      newMap.set(productId, imageId);
    }
    setConfig({ ...config, selectedImages: newMap });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Palette className="h-5 w-5 text-primary" />
            Génération d'arrière-plan IA
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Configuration pour {selectedProducts.length} produit(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Style & Format Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <Label htmlFor="style" className="text-sm font-semibold">
                Style de génération
              </Label>
              <Select
                value={config.style}
                onValueChange={(value: any) => setConfig({ ...config, style: value })}
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">🎬 Professionnel</SelectItem>
                  <SelectItem value="lifestyle">🌿 Lifestyle</SelectItem>
                  <SelectItem value="minimalist">⚪ Minimaliste</SelectItem>
                  <SelectItem value="creative">🎨 Créatif</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-3">
              <Label htmlFor="format" className="text-sm font-semibold">
                Format d'image
              </Label>
              <Select
                value={config.format}
                onValueChange={(value: any) => setConfig({ ...config, format: value })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1:1)</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                  <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>

          {/* Target Selection */}
          <Card className="p-4 space-y-3">
            <Label className="text-sm font-semibold">Cible de génération</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card
                className={`p-3 cursor-pointer transition-all ${
                  config.targetType === "main"
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setConfig({ ...config, targetType: "main", selectedImages: new Map() })}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      config.targetType === "main" ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}
                  >
                    {config.targetType === "main" && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-xs sm:text-sm">Image Principale</h4>
                    <p className="text-xs text-muted-foreground">Génération sur l'image principale du produit</p>
                  </div>
                </div>
              </Card>

              {hasVariants && (
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    config.targetType === "variants"
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, targetType: "variants", selectedImages: new Map() })}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        config.targetType === "variants" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {config.targetType === "variants" && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm">Variantes Spécifiques</h4>
                      <p className="text-xs text-muted-foreground">Sélection d'images de variantes</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </Card>

          {/* Variant Selection Grid */}
          {config.targetType === "variants" && selectedProducts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sélection des variantes</Label>
              {selectedProducts.map((productId) => {
                const product = products.find((p) => p.id === productId);
                const variants = variantImages.get(productId) || [];

                if (!product || variants.length === 0) return null;

                return (
                  <Card key={productId} className="p-3 sm:p-4">
                    <h4 className="font-semibold mb-3 text-xs sm:text-sm line-clamp-1">{product.title}</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {variants.map((variant, idx) => {
                        const isSelected = config.selectedImages.get(productId) === variant.id;
                        return (
                          <div
                            key={variant.id}
                            className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-primary ring-2 ring-primary"
                                : "border-muted hover:border-primary/50"
                            }`}
                            onClick={() => toggleImageSelection(productId, variant.id)}
                          >
                            <div className="aspect-square bg-muted rounded overflow-hidden">
                              <img
                                src={variant.src}
                                alt={variant.alt_text || getVariantLabel(variant)}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            <Badge
                              variant="secondary"
                              className="absolute bottom-1 left-1 text-[9px] px-1 py-0 h-4"
                            >
                              {getVariantLabel(variant)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="preset-select" className="text-sm font-semibold">
              Style prédéfini
            </Label>
            <Select value="" onValueChange={handlePresetSelect}>
              <SelectTrigger id="preset-select">
                <SelectValue placeholder="Choisir un style prédéfini..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_PROMPTS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt" className="text-sm font-semibold">
              Prompt personnalisé (en anglais)
            </Label>
            <Textarea
              id="custom-prompt"
              placeholder="Ex: Professional studio setting with soft lighting and neutral backdrop..."
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              rows={4}
              className="resize-none text-xs sm:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Décrivez l'environnement, l'éclairage et l'ambiance souhaités
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !config.prompt.trim() ||
              (config.targetType === "variants" && config.selectedImages.size === 0)
            }
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="h-4 w-4" />
            {config.targetType === "variants" && config.selectedImages.size > 0
              ? `Générer (${config.selectedImages.size} variante${config.selectedImages.size > 1 ? "s" : ""})`
              : "Générer les arrière-plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
