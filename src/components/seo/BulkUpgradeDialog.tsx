import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Zap, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface BulkUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalProducts: number;
  maxProducts: number;
  onUpgradeClick: () => void;
}

export function BulkUpgradeDialog({
  open,
  onOpenChange,
  totalProducts,
  maxProducts,
  onUpgradeClick,
}: BulkUpgradeDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {t.bulkLimit?.title || "Opération Bulk Non Disponible"}
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p className="text-base">
              {t.bulkLimit?.description?.replace("{{totalProducts}}", String(totalProducts)) || 
                `Vous avez ${totalProducts} produits.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.bulkLimit?.requirement?.replace("{{maxProducts}}", String(maxProducts)) ||
                `Les opérations bulk sont disponibles à partir de ${maxProducts} produits.`}
            </p>
            <div className="flex items-center justify-center gap-2 py-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">
                {t.bulkLimit?.upgrade || "Passez à un plan supérieur pour débloquer cette fonctionnalité."}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t.bulkLimit?.close || "Fermer"}
          </Button>
          <Button
            onClick={onUpgradeClick}
            className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 gap-2"
          >
            {t.bulkLimit?.viewPlans || "Voir les plans"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
