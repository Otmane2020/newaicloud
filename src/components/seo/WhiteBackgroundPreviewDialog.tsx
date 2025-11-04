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
  onApply: (productIds: string[]) => Promise<void>;
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
      await onApply(Array.from(selectedIds));
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Prévisualisation des images avec fond blanc IA</DialogTitle>
          <DialogDescription>
            {isSingleImage 
              ? "Comparez l'image originale avec la version générée par l'IA."
              : "Comparez les images originales avec les versions générées par l'IA. Sélectionnez celles que vous souhaitez appliquer."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!isSingleImage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(preview.productId)}
                        onChange={() => handleToggleSelect(preview.productId)}
                        disabled={preview.status !== 'success'}
                        className="w-4 h-4"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{preview.productTitle}</h4>
                      {preview.status === 'generating' && (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Génération en cours...
                        </Badge>
                      )}
                      {preview.status === 'success' && (
                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700">
                          <Check className="w-3 h-3" />
                          Généré
                        </Badge>
                      )}
                      {preview.status === 'error' && (
                        <Badge variant="outline" className="gap-1 bg-red-50 text-red-700">
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
                      className="gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Régénérer
                    </Button>
                  )}
                </div>

                {/* Images Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Original */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Image originale</p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Fond blanc IA
                    </p>
                    <div className="aspect-square bg-white rounded-lg overflow-hidden border">
                      {preview.status === 'generating' && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                        <div className="w-full h-full flex items-center justify-center text-center p-4">
                          <div>
                            <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{preview.error}</p>
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

        <DialogFooter className="flex items-center justify-between">
          {!isSingleImage && (
            <div className="flex items-center gap-2">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                >
                  {selectedIds.size === successfulPreviews.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} sélectionné(s) sur {successfulPreviews.length}
              </span>
            </div>
          )}
          {isSingleImage && <div />}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Application...
                </>
              ) : (
                `Appliquer ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
