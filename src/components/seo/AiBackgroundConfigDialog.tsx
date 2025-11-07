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

interface AiBackgroundConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: AiBackgroundConfig) => void;
  productImages?: Map<string, Array<{ id: string; src: string; alt_text?: string | null }>>;
  selectedProducts: string[];
  products: Array<{ id: string; title: string; image_url: string | null }>;
}

export interface AiBackgroundConfig {
  prompt: string;
  format: string;
  similarity: string;
  imageType: "primary" | "secondary";
  selectedGalleryImages: Map<string, string>;
}

export function AiBackgroundConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productImages = new Map(),
  selectedProducts,
  products
}: AiBackgroundConfigDialogProps) {
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: '',
    format: 'square',
    similarity: 'medium',
    imageType: 'primary',
    selectedGalleryImages: new Map()
  });

  const handleConfirm = () => {
    if (!config.prompt.trim()) {
      return;
    }
    onConfirm(config);
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
            Personnalisez les paramètres de génération pour {selectedProducts.length} produit(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tableau de sélection des options */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Paramètres de génération</Label>
            
            {/* Format d'image */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="format" className="text-sm font-medium">Format d'image</Label>
                <Select value={config.format} onValueChange={(value) => setConfig({ ...config, format: value })}>
                  <SelectTrigger id="format" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Carré (1:1)</SelectItem>
                    <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                    <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Type d'image */}
            <Card className="p-4 space-y-3">
              <Label className="text-sm font-medium">Type d'image</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card 
                  className={`p-3 cursor-pointer transition-all ${
                    config.imageType === "primary" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, imageType: "primary" })}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      config.imageType === "primary" 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    }`}>
                      {config.imageType === "primary" && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm">Image Principale</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Produit <strong>centré</strong> et bien visible
                      </p>
                    </div>
                  </div>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer transition-all ${
                    config.imageType === "secondary" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, imageType: "secondary" })}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      config.imageType === "secondary" 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    }`}>
                      {config.imageType === "secondary" && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm">Image Secondaire</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Photo d'ambiance lifestyle
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            {/* Ressemblance */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="similarity" className="text-sm font-medium">Ressemblance à l'original</Label>
                <Select value={config.similarity} onValueChange={(value) => setConfig({ ...config, similarity: value })}>
                  <SelectTrigger id="similarity" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very-close">🎯 Très proche (90%)</SelectItem>
                    <SelectItem value="close">✓ Proche (70%)</SelectItem>
                    <SelectItem value="medium">⚖️ Équilibré (50%)</SelectItem>
                    <SelectItem value="creative">🎨 Créatif (30%)</SelectItem>
                    <SelectItem value="very-creative">✨ Très créatif (10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Sélection d'images de galerie */}
          {selectedProducts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sélection de la photo à retravailler</Label>
              {selectedProducts.map((productId) => {
                const product = products.find(p => p.id === productId);
                const images = productImages.get(productId) || [];
                
                if (!product) return null;
                
                return (
                  <Card key={productId} className="p-3 sm:p-4">
                    <h4 className="font-semibold mb-3 text-xs sm:text-sm line-clamp-1">{product.title}</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Image principale */}
                      <div
                        className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                          (!config.selectedGalleryImages.get(productId) || config.selectedGalleryImages.get(productId) === product.image_url)
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => {
                          const newMap = new Map(config.selectedGalleryImages);
                          newMap.set(productId, product.image_url!);
                          setConfig({ ...config, selectedGalleryImages: newMap });
                        }}
                      >
                        <div className="aspect-square bg-muted rounded overflow-hidden">
                          <img
                            src={product.image_url || ''}
                            alt="Image principale"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                          Principal
                        </div>
                      </div>
                      
                      {/* Images de galerie */}
                      {images.slice(0, 2).map((img, idx) => (
                        <div
                          key={img.id}
                          className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                            config.selectedGalleryImages.get(productId) === img.src
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-muted hover:border-primary/50'
                          }`}
                          onClick={() => {
                            const newMap = new Map(config.selectedGalleryImages);
                            newMap.set(productId, img.src);
                            setConfig({ ...config, selectedGalleryImages: newMap });
                          }}
                        >
                          <div className="aspect-square bg-muted rounded overflow-hidden">
                            <img
                              src={img.src}
                              alt={img.alt_text || `Galerie ${idx + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="absolute top-1 right-1 bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Style Selection */}
          <div className="space-y-2">
            <Label htmlFor="preset-select">Style prédéfini</Label>
            <Select value={config.prompt} onValueChange={handlePresetSelect}>
              <SelectTrigger id="preset-select">
                <SelectValue placeholder="Choisir un style..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Place this product in a professional studio setting with soft lighting and neutral gray backdrop">
                  🎬 Studio professionnel
                </SelectItem>
                <SelectItem value="Place this product in a luxurious natural environment with elegant plants and soft natural lighting">
                  🌿 Nature luxueuse
                </SelectItem>
                <SelectItem value="Place this product in a modern minimalist setting with clean lines and geometric shapes">
                  ⚪ Minimaliste moderne
                </SelectItem>
                <SelectItem value="Place this product in a warm lifestyle scene with cozy home elements and soft ambient lighting">
                  🏠 Lifestyle chaleureux
                </SelectItem>
                <SelectItem value="Place this product in a contemporary urban setting with industrial elements and modern aesthetics">
                  🏙️ Urbain contemporain
                </SelectItem>
                <SelectItem value="Place this product in an elegant classical setting with refined decorative elements and soft warm lighting">
                  ✨ Élégance classique
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">Ou créez votre propre prompt (en anglais)</Label>
            <Textarea
              id="custom-prompt"
              placeholder="Ex: Place this product on a wooden table with natural sunlight..."
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              rows={4}
              className="resize-none text-xs sm:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Conseil : Décrivez l'environnement souhaité, l'éclairage et l'ambiance
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!config.prompt.trim()}
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="h-4 w-4" />
            Générer les arrière-plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
