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
import { Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface OptimizationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: OptimizationConfig) => void;
  productCount: number;
  productImages?: Array<{ id: string; image_url: string; alt_text?: string }>;
  mainImageUrl?: string;
}

export interface OptimizationConfig {
  style: 'modern' | 'elegant' | 'professional' | 'creative';
  layout: 'compact' | 'detailed' | 'story';
  colorScheme: 'vibrant' | 'pastel' | 'monochrome' | 'warm';
  contentLength: 'short' | 'medium' | 'long';
  selectedImageUrl?: string;
  customDescription?: string;
}

export function OptimizationConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productCount,
  productImages = [],
  mainImageUrl
}: OptimizationConfigDialogProps) {
  const [config, setConfig] = useState<OptimizationConfig>({
    style: 'modern',
    layout: 'detailed',
    colorScheme: 'vibrant',
    contentLength: 'medium',
    selectedImageUrl: mainImageUrl,
    customDescription: ''
  });

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configuration de l'optimisation
          </DialogTitle>
          <DialogDescription>
            Personnalisez le style et la structure du contenu HTML pour {productCount} produit(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélection d'image de galerie */}
          {productImages.length > 0 && (
            <div className="space-y-2">
              <Label>Photo à analyser</Label>
              <div className="grid grid-cols-3 gap-3">
                {mainImageUrl && (
                  <Card
                    className={`cursor-pointer p-2 transition-all hover:shadow-md ${
                      config.selectedImageUrl === mainImageUrl
                        ? 'ring-2 ring-primary'
                        : 'border'
                    }`}
                    onClick={() => setConfig({ ...config, selectedImageUrl: mainImageUrl })}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={mainImageUrl}
                        alt="Image principale"
                        className="w-full h-full object-cover rounded"
                      />
                      {config.selectedImageUrl === mainImageUrl && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">Principale</p>
                  </Card>
                )}
                {productImages.map((img) => (
                  <Card
                    key={img.id}
                    className={`cursor-pointer p-2 transition-all hover:shadow-md ${
                      config.selectedImageUrl === img.image_url
                        ? 'ring-2 ring-primary'
                        : 'border'
                    }`}
                    onClick={() => setConfig({ ...config, selectedImageUrl: img.image_url })}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={img.image_url}
                        alt={img.alt_text || 'Image galerie'}
                        className="w-full h-full object-cover rounded"
                      />
                      {config.selectedImageUrl === img.image_url && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground truncate">
                      {img.alt_text || 'Galerie'}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Description personnalisée */}
          <div className="space-y-2">
            <Label htmlFor="customDescription">Informations supplémentaires (optionnel)</Label>
            <Textarea
              id="customDescription"
              placeholder="Ex: Matière premium, fabriqué en France, garantie 5 ans, inclut accessoires..."
              value={config.customDescription}
              onChange={(e) => setConfig({ ...config, customDescription: e.target.value })}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ces détails seront intégrés dans la description générée
            </p>
          </div>
          {/* Style */}
          <div className="space-y-2">
            <Label htmlFor="style">Style de description</Label>
            <Select
              value={config.style}
              onValueChange={(value: any) => setConfig({ ...config, style: value })}
            >
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Moderne - Design épuré et minimaliste</SelectItem>
                <SelectItem value="elegant">Élégant - Sophistiqué et raffiné</SelectItem>
                <SelectItem value="professional">Professionnel - Sobre et direct</SelectItem>
                <SelectItem value="creative">Créatif - Audacieux et original</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="layout">Structure du contenu</Label>
            <Select
              value={config.layout}
              onValueChange={(value: any) => setConfig({ ...config, layout: value })}
            >
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact - Présentation concise</SelectItem>
                <SelectItem value="detailed">Détaillé - Sections riches</SelectItem>
                <SelectItem value="story">Histoire - Narration engageante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label htmlFor="colorScheme">Palette de couleurs</Label>
            <Select
              value={config.colorScheme}
              onValueChange={(value: any) => setConfig({ ...config, colorScheme: value })}
            >
              <SelectTrigger id="colorScheme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vibrant">Vibrant - Couleurs vives</SelectItem>
                <SelectItem value="pastel">Pastel - Tons doux</SelectItem>
                <SelectItem value="monochrome">Monochrome - Noir & blanc</SelectItem>
                <SelectItem value="warm">Chaleureux - Tons chauds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Length */}
          <div className="space-y-2">
            <Label htmlFor="contentLength">Longueur du contenu</Label>
            <Select
              value={config.contentLength}
              onValueChange={(value: any) => setConfig({ ...config, contentLength: value })}
            >
              <SelectTrigger id="contentLength">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Court - Essentiel (~500 mots)</SelectItem>
                <SelectItem value="medium">Moyen - Équilibré (~1000 mots)</SelectItem>
                <SelectItem value="long">Long - Détaillé (~2000 mots)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Lancer l'optimisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
