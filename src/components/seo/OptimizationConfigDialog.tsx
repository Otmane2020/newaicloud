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
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface OptimizationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: OptimizationConfig) => void;
  productCount: number;
}

export interface OptimizationConfig {
  style: 'modern' | 'elegant' | 'professional' | 'creative';
  layout: 'compact' | 'detailed' | 'story';
  colorScheme: 'vibrant' | 'pastel' | 'monochrome' | 'warm';
  contentLength: 'short' | 'medium' | 'long';
}

export function OptimizationConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productCount
}: OptimizationConfigDialogProps) {
  const [config, setConfig] = useState<OptimizationConfig>({
    style: 'modern',
    layout: 'detailed',
    colorScheme: 'vibrant',
    contentLength: 'medium'
  });

  const handleConfirm = () => {
    onConfirm(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configuration de l'optimisation
          </DialogTitle>
          <DialogDescription>
            Personnalisez le style et la structure du contenu HTML pour {productCount} produit(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
