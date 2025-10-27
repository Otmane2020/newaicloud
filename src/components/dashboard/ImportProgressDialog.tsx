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
    navigate("/account?tab=subscription");
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
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary">
                {progress.percentage}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {progress.productsProcessed} produits importés
              </p>
            </div>

            <Progress value={progress.percentage} className="h-3" />

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

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Import en cours, veuillez patienter...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Limite de {maxProducts} produits atteinte !</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <p className="text-sm">
                    Votre plan trial est limité à {maxProducts} produits. 
                    Passez au plan Starter pour importer jusqu'à 100 produits.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Les {maxProducts} premiers produits ont été importés avec succès.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary mb-2">
                {progress.productsProcessed} / {maxProducts}
              </div>
              <div className="text-sm text-muted-foreground">
                Produits importés
              </div>
            </div>

            <Button onClick={handleUpgrade} className="w-full" size="lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Passer au plan Starter (9,99€/mois)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
