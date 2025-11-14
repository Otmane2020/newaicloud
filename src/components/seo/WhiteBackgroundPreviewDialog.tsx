import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface WhiteBackgroundPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PreviewImage[];
  onApply: (productIds: string[], format: string, imageType: 'primary' | 'secondary') => Promise<void>;
  onRegenerate: (productId: string) => Promise<void>;
}

export function WhiteBackgroundPreviewDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  onRegenerate,
}: WhiteBackgroundPreviewDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [format, setFormat] = useState<string>('square');
  const [imageType, setImageType] = useState<'primary' | 'secondary'>('primary');

  const successfulPreviews = previews.filter(p => p.status === 'success');
  const isGenerating = previews.some(p => p.status === 'generating');
  const isSingleImage = previews.length === 1;

  // Sélectionner automatiquement si une seule image avec succès
  useEffect(() => {
    if (isSingleImage && successfulPreviews.length === 1) {
      setSelectedIds(new Set([successfulPreviews[0].productId]));
    }
  }, [isSingleImage, successfulPreviews]);

  const handleToggleSelect = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === successfulPreviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(successfulPreviews.map(p => p.productId)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    
    setApplying(true);
    try {
      await onApply(Array.from(selectedIds), format, imageType);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full p-0 sm:p-6 flex flex-col">
        <DialogHeader className="space-y-2 px-4 pt-4 sm:px-0 sm:pt-0 shrink-0">
          <DialogTitle className="text-base sm:text-lg">Prévisualisation des images avec fond blanc IA</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isSingleImage 
              ? "Comparez l'image originale avec la version générée par l'IA."
              : "Comparez les images originales avec les versions générées par l'IA. Sélectionnez celles que vous souhaitez appliquer."}
          </DialogDescription>
        </DialogHeader>

        {/* Format Selector */}
        <div className="space-y-3 sm:space-y-4 px-4 sm:px-2 pb-3 sm:pb-4 border-b shrink-0">
          <div className="space-y-2">
            <Label htmlFor="white-bg-format" className="text-xs sm:text-sm">Format d'image</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="white-bg-format" className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Sélectionner un format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square" className="text-xs sm:text-sm">Carré (1:1)</SelectItem>
                <SelectItem value="portrait" className="text-xs sm:text-sm">Portrait (3:4)</SelectItem>
                <SelectItem value="landscape" className="text-xs sm:text-sm">Paysage (4:3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="image-type" className="text-xs sm:text-sm">
              Type d'image après application
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageType('primary')}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-left ${
                  imageType === 'primary'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    imageType === 'primary'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {imageType === 'primary' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-xs sm:text-sm">Image Principale</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Remplace l'image principale du produit
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setImageType('secondary')}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-left ${
                  imageType === 'secondary'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    imageType === 'secondary'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {imageType === 'secondary' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-xs sm:text-sm">Image Secondaire</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Ajoute à la galerie d'images
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-2">
          <div className="space-y-3 sm:space-y-4 md:space-y-6 pr-2 sm:pr-4">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3"
              >
                {/* Header */}
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {!isSingleImage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(preview.productId)}
                        onChange={() => handleToggleSelect(preview.productId)}
                        disabled={preview.status !== 'success'}
                        className="w-4 h-4 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-xs sm:text-sm md:text-base truncate">{preview.productTitle}</h4>
                      {preview.status === 'generating' && (
                        <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs mt-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="hidden sm:inline">Génération en cours...</span>
                          <span className="sm:hidden">En cours...</span>
                        </Badge>
                      )}
                      {preview.status === 'success' && (
                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 text-[10px] sm:text-xs mt-1">
                          <Check className="w-3 h-3" />
                          Généré
                        </Badge>
                      )}
                      {preview.status === 'error' && (
                        <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 text-[10px] sm:text-xs mt-1">
                          <X className="w-3 h-3" />
                          Erreur
                        </Badge>
                      )}
                    </div>
                  </div>

                  {preview.status === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerate(preview.productId)}
                      className="gap-2 text-xs h-8 w-full sm:w-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Régénérer</span>
                      <span className="sm:hidden">Régén.</span>
                    </Button>
                  )}
                </div>

                {/* Images Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Original */}
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Image originale</p>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img
                        src={preview.originalUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Generated */}
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Fond blanc IA
                    </p>
                    <div className="aspect-square bg-white rounded-lg overflow-hidden border">
                      {preview.status === 'generating' && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {preview.status === 'success' && preview.generatedUrl && (
                        <img
                          src={preview.generatedUrl}
                          alt="Fond blanc"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {preview.status === 'error' && (
                        <div className="w-full h-full flex items-center justify-center text-center p-2 sm:p-4">
                          <div>
                            <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-xs sm:text-sm text-muted-foreground">{preview.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 px-4 py-3 sm:px-0 sm:py-0 sm:mt-4 sm:pt-4 border-t bg-background shrink-0 sticky bottom-0 sm:static">
          {!isSingleImage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="text-xs sm:text-sm h-9 w-full sm:w-auto"
                >
                  {selectedIds.size === successfulPreviews.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
                {selectedIds.size} sélectionné(s) sur {successfulPreviews.length}
              </span>
            </div>
          )}
          {isSingleImage && <div className="hidden sm:block" />}

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating}
              className="flex-1 sm:flex-none text-sm h-11 sm:h-10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating}
              className="flex-1 sm:flex-none text-sm h-11 sm:h-10 bg-primary hover:bg-primary/90 font-medium"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Application...</span>
                  <span className="sm:hidden">Application...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Appliquer {selectedIds.size > 0 && `(${selectedIds.size})`}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
