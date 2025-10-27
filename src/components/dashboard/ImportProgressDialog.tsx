import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Package, FileText, CreditCard, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: {
    percentage: number;
    currentPage: number;
    totalPages: number;
    productsProcessed: number;
  };
  limitReached: boolean;
  maxProducts: number;
}

export function ImportProgressDialog({
  open,
  onOpenChange,
  progress,
  limitReached,
  maxProducts,
}: ImportProgressDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate("/subscription");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {limitReached ? "⚠️ Quota atteint" : "📦 Import en cours..."}
          </DialogTitle>
        </DialogHeader>

        {!limitReached ? (
          <div className="space-y-6 animate-fade-in">
            {/* Animation de chargement circulaire */}
            <div className="relative w-32 h-32 mx-auto">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress.percentage / 100)}`}
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary animate-pulse">
                  {progress.percentage}%
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold mb-2 animate-pulse">
                Import en cours...
              </p>
              <p className="text-muted-foreground">
                {progress.productsProcessed} produits importés
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <FileText className="w-5 h-5" />
                  {progress.currentPage}/{progress.totalPages || "?"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Pages</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Package className="w-5 h-5" />
                  {progress.productsProcessed}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Produits</div>
              </div>
            </div>

            {/* Animation des produits qui défilent */}
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-scale-in">
            {/* Message quota atteint */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Limite atteinte !</h3>
              <p className="text-muted-foreground mb-2">
                Vous avez atteint la limite de {maxProducts} produits de votre plan.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Les {progress.productsProcessed} premiers produits ont été importés avec succès.
              </p>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary mb-2">
                {progress.productsProcessed} / {maxProducts}
              </div>
              <div className="text-sm text-muted-foreground">
                Produits importés
              </div>
            </div>

            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary">
              <Package className="h-4 w-4" />
              <AlertTitle>Passez au plan supérieur</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 text-sm">
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
