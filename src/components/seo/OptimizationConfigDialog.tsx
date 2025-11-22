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
import { useTranslation } from "@/lib/language";

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
  const { t } = useTranslation();
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
            {t.dialogs.optimizationConfig.title}
          </DialogTitle>
          <DialogDescription>
            {t.dialogs.optimizationConfig.description} {productCount} {t.dialogs.optimizationConfig.products}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélection d'image de galerie */}
          {productImages.length > 0 && (
            <div className="space-y-2">
              <Label>{t.dialogs.optimizationConfig.photoToAnalyze}</Label>
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
                    <p className="text-xs text-center mt-1 text-muted-foreground">{t.dialogs.optimizationConfig.mainImage}</p>
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
                      {img.alt_text || t.dialogs.optimizationConfig.gallery}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Description personnalisée */}
          <div className="space-y-2">
            <Label htmlFor="customDescription">{t.dialogs.optimizationConfig.additionalInfo}</Label>
            <Textarea
              id="customDescription"
              placeholder={t.dialogs.optimizationConfig.additionalInfoPlaceholder}
              value={config.customDescription}
              onChange={(e) => setConfig({ ...config, customDescription: e.target.value })}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t.dialogs.optimizationConfig.additionalInfoHelp}
            </p>
          </div>
          {/* Style */}
          <div className="space-y-2">
            <Label htmlFor="style">{t.dialogs.optimizationConfig.descriptionStyle}</Label>
            <Select
              value={config.style}
              onValueChange={(value: any) => setConfig({ ...config, style: value })}
            >
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">{t.dialogs.optimizationConfig.styles.modern}</SelectItem>
                <SelectItem value="elegant">{t.dialogs.optimizationConfig.styles.elegant}</SelectItem>
                <SelectItem value="professional">{t.dialogs.optimizationConfig.styles.professional}</SelectItem>
                <SelectItem value="creative">{t.dialogs.optimizationConfig.styles.creative}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="layout">{t.dialogs.optimizationConfig.contentStructure}</Label>
            <Select
              value={config.layout}
              onValueChange={(value: any) => setConfig({ ...config, layout: value })}
            >
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{t.dialogs.optimizationConfig.layouts.compact}</SelectItem>
                <SelectItem value="detailed">{t.dialogs.optimizationConfig.layouts.detailed}</SelectItem>
                <SelectItem value="story">{t.dialogs.optimizationConfig.layouts.story}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label htmlFor="colorScheme">{t.dialogs.optimizationConfig.colorPalette}</Label>
            <Select
              value={config.colorScheme}
              onValueChange={(value: any) => setConfig({ ...config, colorScheme: value })}
            >
              <SelectTrigger id="colorScheme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vibrant">{t.dialogs.optimizationConfig.colors.vibrant}</SelectItem>
                <SelectItem value="pastel">{t.dialogs.optimizationConfig.colors.pastel}</SelectItem>
                <SelectItem value="monochrome">{t.dialogs.optimizationConfig.colors.monochrome}</SelectItem>
                <SelectItem value="warm">{t.dialogs.optimizationConfig.colors.warm}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Length */}
          <div className="space-y-2">
            <Label htmlFor="contentLength">{t.dialogs.optimizationConfig.contentLength}</Label>
            <Select
              value={config.contentLength}
              onValueChange={(value: any) => setConfig({ ...config, contentLength: value })}
            >
              <SelectTrigger id="contentLength">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">{t.dialogs.optimizationConfig.lengths.short}</SelectItem>
                <SelectItem value="medium">{t.dialogs.optimizationConfig.lengths.medium}</SelectItem>
                <SelectItem value="long">{t.dialogs.optimizationConfig.lengths.long}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.dialogs.optimizationConfig.cancel}
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t.dialogs.optimizationConfig.launchOptimization}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
