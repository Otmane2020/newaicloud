import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptimizationResult {
  productId: string;
  productTitle: string;
  status: 'success' | 'error' | 'skipped';
  categoryGenerated?: boolean;
  gtinGenerated?: boolean;
  error?: string;
}

interface OptimizeAllDialogProps {
  open: boolean;
  onClose: () => void;
  results: OptimizationResult[];
  progress: number;
  isProcessing: boolean;
  currentProduct?: string;
}

export function OptimizeAllDialog({
  open,
  onClose,
  results,
  progress,
  isProcessing,
  currentProduct,
}: OptimizeAllDialogProps) {
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                Optimisation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                Optimisation terminée
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {isProcessing ? 'Traitement en cours...' : 'Traitement terminé'}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {currentProduct && (
              <p className="text-sm text-muted-foreground">
                Produit actuel: {currentProduct}
              </p>
            )}
          </div>

          {/* Stats Summary */}
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Succès</span>
                </div>
                <p className="text-2xl font-bold text-success">{successCount}</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Erreurs</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Ignorés</span>
                </div>
                <p className="text-2xl font-bold text-warning">{skippedCount}</p>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Détails de l'optimisation</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.productId}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{result.productTitle}</p>
                        {result.error && (
                          <p className="text-xs text-destructive mt-1">{result.error}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {result.categoryGenerated && (
                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                              Catégorie ✓
                            </Badge>
                          )}
                          {result.gtinGenerated && (
                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                              GTIN ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        {result.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        {result.status === 'skipped' && (
                          <AlertCircle className="w-5 h-5 text-warning" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!isProcessing && (
              <Button onClick={onClose} size="lg">
                Fermer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
