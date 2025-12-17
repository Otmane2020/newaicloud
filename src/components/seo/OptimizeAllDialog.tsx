import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';

interface OptimizationResult {
  productId: string;
  productTitle: string;
  imageUrl?: string;
  status: 'success' | 'error' | 'skipped' | 'pending' | 'processing';
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
  totalProducts?: number;
  currentIndex?: number;
}

export function OptimizeAllDialog({
  open,
  onClose,
  results,
  progress,
  isProcessing,
  currentProduct,
  totalProducts = 0,
  currentIndex = 0,
}: OptimizeAllDialogProps) {
  const { language } = useTranslation();
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const processedCount = successCount + errorCount + skippedCount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                <span className="truncate">
                  {language === 'fr' ? 'Optimisation en cours...' : 'Optimization in progress...'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                <span>{language === 'fr' ? 'Optimisation terminée' : 'Optimization completed'}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Progress Bar with percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {isProcessing 
                  ? (language === 'fr' ? 'Traitement en cours...' : 'Processing...')
                  : (language === 'fr' ? 'Traitement terminé' : 'Processing complete')}
              </span>
              <span className="text-primary font-bold text-lg">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            
            {/* Current product info with image */}
            {isProcessing && currentProduct && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mt-3">
                {results.find(r => r.productTitle === currentProduct)?.imageUrl && (
                  <img 
                    src={results.find(r => r.productTitle === currentProduct)?.imageUrl} 
                    alt=""
                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Produit en cours' : 'Current product'} ({currentIndex}/{totalProducts})
                  </p>
                  <p className="font-medium text-sm sm:text-base truncate">{currentProduct}</p>
                </div>
                <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Stats Summary - Mobile optimized grid */}
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-success/10 rounded-lg p-3 sm:p-4 border border-success/20 text-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {language === 'fr' ? 'Succès' : 'Success'}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-success">{successCount}</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 sm:p-4 border border-destructive/20 text-center">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {language === 'fr' ? 'Erreurs' : 'Errors'}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-3 sm:p-4 border border-warning/20 text-center">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {language === 'fr' ? 'Ignorés' : 'Skipped'}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-warning">{skippedCount}</p>
              </div>
            </div>
          )}

          {/* Detailed Results - Mobile optimized */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                {language === 'fr' ? "Détails de l'optimisation" : 'Optimization details'}
              </h3>
              <ScrollArea className="h-[200px] sm:h-[300px] rounded-md border p-2 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.productId}
                      className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/50"
                    >
                      {result.imageUrl && (
                        <img 
                          src={result.imageUrl} 
                          alt={result.productTitle}
                          className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm line-clamp-1">{result.productTitle}</p>
                        {result.error && (
                          <p className="text-xs text-destructive mt-0.5 line-clamp-1">{result.error}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.categoryGenerated && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-success/10 text-success border-success/20 px-1 sm:px-2">
                              {language === 'fr' ? 'Catégorie' : 'Category'} ✓
                            </Badge>
                          )}
                          {result.gtinGenerated && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-success/10 text-success border-success/20 px-1 sm:px-2">
                              GTIN ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {result.status === 'success' && (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                        )}
                        {result.status === 'skipped' && (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                        )}
                        {result.status === 'processing' && (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
                        )}
                        {result.status === 'pending' && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions - Sticky on mobile */}
          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background">
            {!isProcessing && (
              <Button onClick={onClose} size="lg" className="w-full sm:w-auto">
                {language === 'fr' ? 'Fermer' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
