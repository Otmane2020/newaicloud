import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Package, FileText, CreditCard, AlertCircle, Check, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type ImportPhase = 'products' | 'pages' | 'complete';

interface ImportedItem {
  type: 'product' | 'page';
  title: string;
  image?: string;
  handle?: string;
}

interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: ImportPhase;
  progress: {
    percentage: number;
    currentPage: number;
    totalPages: number;
    productsProcessed: number;
  };
  productsImported: number;
  pagesImported: number;
  importedItems: ImportedItem[];
  limitReached: boolean;
  maxProducts: number;
}

export function ImportProgressDialog({
  open,
  onOpenChange,
  phase,
  progress,
  productsImported,
  pagesImported,
  importedItems,
  limitReached,
  maxProducts,
}: ImportProgressDialogProps) {
  const navigate = useNavigate();
  
  // Animated counters
  const [displayedProducts, setDisplayedProducts] = useState(0);
  const [displayedPages, setDisplayedPages] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  const handleUpgrade = () => {
    navigate("/subscription");
    onOpenChange(false);
  };

  // Calculate smooth overall progress (0-100%)
  const overallProgress = phase === 'products' 
    ? Math.min(progress.percentage * 0.5, 50) // Products: 0-50%
    : phase === 'pages' 
    ? 50 + Math.min((progress.percentage || 50) * 0.5, 50) // Pages: 50-100%
    : 100; // Complete: 100%

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayedProgress < overallProgress) {
        setDisplayedProgress(prev => Math.min(prev + 1, overallProgress));
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [displayedProgress, overallProgress]);

  // Animate product counter
  useEffect(() => {
    if (displayedProducts < productsImported) {
      const timer = setTimeout(() => {
        setDisplayedProducts(prev => Math.min(prev + 1, productsImported));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [displayedProducts, productsImported]);

  // Animate pages counter
  useEffect(() => {
    if (displayedPages < pagesImported) {
      const timer = setTimeout(() => {
        setDisplayedPages(prev => Math.min(prev + 1, pagesImported));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayedPages, pagesImported]);

  const getPhaseTitle = () => {
    if (limitReached) return "⚠️ Quota atteint";
    if (phase === 'products') return "📦 Import des produits en cours...";
    if (phase === 'pages') return "📄 Import des pages...";
    if (phase === 'complete') return "✅ Import terminé !";
    return "Import en cours...";
  };

  const getPhaseDescription = () => {
    if (limitReached) return "Vous avez atteint la limite de votre plan";
    if (phase === 'products') return `Page ${progress.currentPage} sur ${progress.totalPages} • ${progress.productsProcessed} produits traités`;
    if (phase === 'pages') return "Import des pages Shopify en cours...";
    if (phase === 'complete') return "Tous vos produits et pages ont été importés avec succès !";
    return "Import en cours...";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            {phase !== 'complete' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {getPhaseTitle()}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {getPhaseDescription()}
          </DialogDescription>
        </DialogHeader>

        {!limitReached ? (
          <div className="space-y-3 sm:space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Progress bar globale avec animation */}
            <div className="flex-shrink-0 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium">Progression globale</span>
                <span className="font-bold text-lg text-primary tabular-nums">
                  {Math.round(displayedProgress)}%
                </span>
              </div>
              <Progress 
                value={displayedProgress} 
                className="h-3 sm:h-4 transition-all duration-300 ease-out shadow-sm [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:via-primary/90 [&>div]:to-primary/80 [&>div]:animate-pulse" 
              />
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>Page {progress.currentPage} / {progress.totalPages}</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {progress.productsProcessed} produits traités
                </span>
              </div>
            </div>
            
            {/* Compteurs animés */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 sm:gap-4">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <Package className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedProducts}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Produits importés</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <FileText className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedPages}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Pages importées</p>
                </CardContent>
              </Card>
            </div>

            {/* Liste des éléments importés avec animation */}
            {importedItems.length > 0 && (
              <div className="flex-1 min-h-0 animate-fade-in">
                <h4 className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Éléments importés ({importedItems.length})
                </h4>
                <ScrollArea className="h-[200px] sm:h-[300px] border-2 rounded-lg shadow-inner bg-muted/5">
                  <div className="p-2 space-y-2">
                    {importedItems.slice().reverse().map((item, index) => (
                      <div 
                        key={`${item.type}-${item.handle || index}`}
                        className="flex items-center gap-2 sm:gap-3 p-2 bg-background border rounded-lg hover:shadow-md transition-all duration-200 hover:scale-[1.02] animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.type === 'product' && item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-8 h-8 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0 ring-2 ring-primary/20" 
                          />
                        )}
                        {item.type === 'page' && (
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                            <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm flex-1 truncate font-medium">{item.title}</span>
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-600 font-bold" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Animation de chargement améliorée */}
            {phase !== 'complete' && (
              <div className="flex justify-center items-center gap-2 flex-shrink-0 py-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.3s' }} />
              </div>
            )}

            {/* Message de succès final */}
            {phase === 'complete' && (
              <div className="flex-shrink-0 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg animate-scale-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                      Import terminé avec succès !
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {displayedProducts} produits et {displayedPages} pages ont été importés
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 animate-scale-in">
            {/* Message quota atteint */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2">Limite atteinte !</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Vous avez atteint la limite de {maxProducts} produits de votre plan.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                Les {productsImported} premiers produits ont été importés avec succès.
              </p>
            </div>

            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                {productsImported} / {maxProducts}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Produits importés
              </div>
            </div>

            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary">
              <Package className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base">Passez au plan supérieur</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm">
                  <li>✅ Plan Starter : 100 produits</li>
                  <li>✅ Plan Pro : 1000 produits</li>
                  <li>✅ Plan Enterprise : Illimité</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleUpgrade}
              className="w-full animate-pulse"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t('dashboard.activate_my_plan')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
