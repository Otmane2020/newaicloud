import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface WhiteBgPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PreviewImage[];
  onApply: (selectedIds: string[]) => void;
  onRegenerate: (productId: string) => void;
}

export function WhiteBgPreviewDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  onRegenerate,
}: WhiteBgPreviewDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-select all successful generations
    const successIds = previews
      .filter(p => p.status === 'success' && p.generatedUrl)
      .map(p => p.productId);
    
    if (successIds.length > 0) {
      setSelectedIds(new Set(successIds));
    }
  }, [previews]);

  const handleToggle = (productId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedIds(newSelection);
  };

  const handleSelectAll = () => {
    const successIds = previews
      .filter(p => p.status === 'success' && p.generatedUrl)
      .map(p => p.productId);
    setSelectedIds(new Set(successIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    onApply(Array.from(selectedIds));
  };

  const successCount = previews.filter(p => p.status === 'success').length;
  const errorCount = previews.filter(p => p.status === 'error').length;
  const generatingCount = previews.filter(p => p.status === 'generating' || p.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévisualisation - Fond Blanc</DialogTitle>
          <DialogDescription>
            Vérifiez les images générées avant de les appliquer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {successCount} réussi(s)
              </span>
              {generatingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {generatingCount} en cours
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  {errorCount} échoué(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                Tout sélectionner
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeselectAll}>
                Tout désélectionner
              </Button>
            </div>
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-1 gap-4">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-4 flex items-start gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {preview.status === 'success' && preview.generatedUrl && (
                      <Checkbox
                        checked={selectedIds.has(preview.productId)}
                        onCheckedChange={() => handleToggle(preview.productId)}
                      />
                    )}
                    <h4 className="font-medium text-sm">{preview.productTitle}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Original */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Original</p>
                      <img
                        src={preview.originalUrl}
                        alt="Original"
                        className="w-full h-40 object-contain border rounded"
                      />
                    </div>

                    {/* Generated */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Fond blanc</p>
                      {preview.status === 'pending' && (
                        <div className="w-full h-40 border rounded flex items-center justify-center bg-muted">
                          <span className="text-sm text-muted-foreground">En attente...</span>
                        </div>
                      )}
                      {preview.status === 'generating' && (
                        <div className="w-full h-40 border rounded flex items-center justify-center bg-muted">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      )}
                      {preview.status === 'success' && preview.generatedUrl && (
                        <img
                          src={preview.generatedUrl}
                          alt="Fond blanc"
                          className="w-full h-40 object-contain border rounded bg-white"
                        />
                      )}
                      {preview.status === 'error' && (
                        <div className="w-full h-40 border border-red-300 rounded flex flex-col items-center justify-center bg-red-50 gap-2">
                          <XCircle className="w-8 h-8 text-red-600" />
                          <p className="text-xs text-red-600 px-2 text-center">
                            {preview.error || 'Erreur de génération'}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegenerate(preview.productId)}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Régénérer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || generatingCount > 0}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Appliquer ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
