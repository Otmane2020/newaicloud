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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SourceImage {
  id: string;
  url: string;
  variant_id: string | null;
  label: string;
}

interface ProductData {
  id: string;
  title: string;
  image_url: string | null;
  productType: 'simple' | 'variable';
  sourceImages: SourceImage[];
  variants?: Array<{
    id: string;
    title: string;
    option1?: string;
    image_url?: string;
  }>;
}

interface AiBackgroundConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: AiBackgroundConfig) => void;
  productData?: ProductData;
}

export interface AiBackgroundConfig {
  prompt: string;
  similarity: string;
  productData: ProductData;
}

export function AiBackgroundConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productData
}: AiBackgroundConfigDialogProps) {
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: '',
    similarity: 'very-close',
    productData: productData || {
      id: '',
      title: '',
      image_url: null,
      productType: 'simple',
      sourceImages: []
    }
  });

  const handleConfirm = () => {
    if (!config.prompt.trim()) {
      return;
    }
    onConfirm({
      ...config,
      productData: productData || config.productData
    });
    onOpenChange(false);
  };

  const handlePresetSelect = (value: string) => {
    setConfig({ ...config, prompt: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Palette className="h-5 w-5 text-primary" />
            Configuration de l'arrière-plan IA
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {productData && (
              <div className="mt-2">
                <p className="font-medium">{productData.title}</p>
                <p className="text-xs text-muted-foreground">
                  Type: {productData.productType === 'simple' ? 'Produit simple' : 'Produit avec variantes'} • 
                  {productData.sourceImages.length} image(s) détectée(s)
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Aperçu des images source */}
          {productData && productData.sourceImages.length > 0 && (
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">Images source détectées</Label>
              <div className="grid grid-cols-3 gap-2">
                {productData.sourceImages.slice(0, 6).map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {img.label}
                    </div>
                  </div>
                ))}
              </div>
              {productData.sourceImages.length > 6 && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{productData.sourceImages.length - 6} autre(s) image(s)
                </p>
              )}
            </Card>
          )}

          <div className="space-y-4">
            <Label className="text-base font-semibold">Paramètres de génération</Label>

            {/* Fidélité */}
            <Card className="p-4 space-y-3">
              <Label className="text-sm font-medium">Fidélité à l'image originale</Label>
              <div className="space-y-3">
                {[
                  { value: 'very-close', label: 'Très proche', desc: '90-100% fidèle' },
                  { value: 'balanced', label: 'Équilibré', desc: '70-90% fidèle' },
                  { value: 'creative', label: 'Créatif', desc: '50-70% fidèle' },
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`p-3 cursor-pointer transition-all ${
                      config.similarity === option.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setConfig({ ...config, similarity: option.value })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </div>
                      {config.similarity === option.value && (
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Application automatique */}
            {productData && (
              <Card className="p-4 bg-primary/5">
                <Label className="text-sm font-medium mb-2 block">Application automatique</Label>
                {productData.productType === 'simple' ? (
                  <div className="text-sm space-y-1">
                    <p>✓ Image principale remplacée</p>
                    <p className="text-muted-foreground text-xs">
                      L'image optimisée sera appliquée automatiquement
                    </p>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p>✓ {productData.variants?.length || 0} variante(s) détectée(s)</p>
                    <p className="text-muted-foreground text-xs">
                      Une image optimisée sera générée pour chaque variante
                    </p>
                    {productData.variants && productData.variants.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {productData.variants.slice(0, 3).map((variant) => (
                          <div key={variant.id} className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {variant.option1 || variant.title}
                            </Badge>
                          </div>
                        ))}
                        {productData.variants.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{productData.variants.length - 3} autre(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Prompt personnalisé */}
            <Card className="p-4 space-y-3">
              <Label htmlFor="custom-prompt" className="text-sm font-medium">
                Prompt personnalisé (optionnel)
              </Label>
              <div className="space-y-3">
                <Select value={config.prompt} onValueChange={handlePresetSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="e-commerce product photo, white studio background, professional lighting">
                      Photo e-commerce professionnelle
                    </SelectItem>
                    <SelectItem value="lifestyle product photo, natural setting, soft natural lighting">
                      Photo lifestyle naturelle
                    </SelectItem>
                    <SelectItem value="minimalist product photo, clean background, modern aesthetic">
                      Photo minimaliste moderne
                    </SelectItem>
                    <SelectItem value="luxury product photo, premium setting, dramatic lighting">
                      Photo luxe premium
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  id="custom-prompt"
                  value={config.prompt}
                  onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                  placeholder="Décrivez l'arrière-plan souhaité..."
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Décrivez l'ambiance, le style ou le contexte souhaité pour l'arrière-plan
                </p>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!config.prompt.trim()}
            className="w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Générer les arrière-plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
