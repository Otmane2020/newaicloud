import { useState } from "react";
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
import { Sparkles } from "lucide-react";

export interface LandingConfig {
  style: string;
  layout: string;
  colorScheme: string;
  contentLength: string;
}

interface LandingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: LandingConfig) => void;
  productTitle?: string;
}

export function LandingConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  productTitle,
}: LandingConfigDialogProps) {
  const [config, setConfig] = useState<LandingConfig>({
    style: "moderne",
    layout: "2 colonnes",
    colorScheme: "#f8f8f8",
    contentLength: "moyenne (800 mots)",
  });

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

        <div className="grid gap-4 py-4">
          {/* Style visuel */}
          <div className="space-y-2">
            <Label htmlFor="style">🎨 Style visuel</Label>
            <Select
              value={config.style}
              onValueChange={(value) => setConfig({ ...config, style: value })}
            >
              <SelectTrigger id="style">
                <SelectValue placeholder="Sélectionnez un style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderne">Moderne</SelectItem>
                <SelectItem value="minimaliste">Minimaliste</SelectItem>
                <SelectItem value="scandinave">Scandinave</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="neutre">Neutre</SelectItem>
                <SelectItem value="coloré">Coloré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="layout">🧱 Layout</Label>
            <Select
              value={config.layout}
              onValueChange={(value) => setConfig({ ...config, layout: value })}
            >
              <SelectTrigger id="layout">
                <SelectValue placeholder="Choisissez un layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 colonne">1 colonne (centré)</SelectItem>
                <SelectItem value="2 colonnes">2 colonnes (image + texte)</SelectItem>
                <SelectItem value="hero à gauche">Hero image à gauche</SelectItem>
                <SelectItem value="hero à droite">Hero image à droite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Couleur principale */}
          <div className="space-y-2">
            <Label htmlFor="color">🎨 Couleur principale</Label>
            <input
              id="color"
              type="color"
              value={config.colorScheme}
              onChange={(e) => setConfig({ ...config, colorScheme: e.target.value })}
              className="w-full h-10 rounded-md border cursor-pointer"
            />
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
