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
  vendorSource: 'shopify' | 'extract' | 'generate';
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
    vendorSource: 'shopify',
  });

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
