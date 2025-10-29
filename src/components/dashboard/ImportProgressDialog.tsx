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
import { Loader2, Package, FileText, CreditCard, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const handleUpgrade = () => {
    navigate("/subscription");
    onOpenChange(false);
  };

  const getPhaseTitle = () => {
    if (limitReached) return "⚠️ Quota atteint";
    if (phase === 'products') return "📦 Import des produits...";
    if (phase === 'pages') return "📄 Import des pages...";
    if (phase === 'complete') return "✅ Import terminé !";
    return "Import en cours...";
  };

  const getPhaseDescription = () => {
    if (limitReached) return "Vous avez atteint la limite de votre plan";
    if (phase === 'products') return "Veuillez patienter, nous importons vos produits Shopify...";
    if (phase === 'pages') return "Import des pages Shopify en cours...";
    if (phase === 'complete') return "Tous vos produits et pages ont été importés avec succès !";
    return "Import en cours...";
  };

  const overallProgress = phase === 'products' 
    ? progress.percentage / 2 
    : phase === 'pages' 
    ? 50 + (progress.percentage / 2)
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">
            {getPhaseTitle()}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {getPhaseDescription()}
          </DialogDescription>
        </DialogHeader>

        {!limitReached ? (
          <div className="space-y-3 sm:space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Progress bar globale */}
            <div className="flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Progression globale</span>
                <span className="font-bold">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2 sm:h-3" />
            </div>
            
            {/* Liste des éléments importés */}
            {importedItems.length > 0 && (
              <div className="flex-1 min-h-0">
                <h4 className="text-xs sm:text-sm font-semibold mb-2">
                  Éléments importés ({importedItems.length})
                </h4>
                <ScrollArea className="h-[200px] sm:h-[300px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {importedItems.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.handle || index}`}
                        className="flex items-center gap-2 sm:gap-3 p-2 border-b last:border-b-0 animate-fade-in"
                      >
                        {item.type === 'product' && item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-8 h-8 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0" 
                          />
                        )}
                        {item.type === 'page' && (
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm flex-1 truncate">{item.title}</span>
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Compteurs */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-2 sm:gap-4">
              <Card>
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{productsImported}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Produits</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{pagesImported}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pages</p>
                </CardContent>
              </Card>
            </div>

            {/* Animation de chargement */}
            {phase !== 'complete' && (
              <div className="flex justify-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
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
              Activer mon plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
