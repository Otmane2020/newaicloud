import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizationProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: number;
  total: number;
  isComplete: boolean;
  onSyncClick?: () => void;
  onClose: () => void;
  operationType?: 'optimization' | 'synchronization';
}

export function OptimizationProgressDialog({
  open,
  onOpenChange,
  title,
  current,
  total,
  isComplete,
  onSyncClick,
  onClose,
  operationType = 'optimization',
}: OptimizationProgressDialogProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  const getTitle = () => {
    if (operationType === 'synchronization') {
      return isComplete ? '✅ Synchronization Complete!' : '🔄 Syncing to Shopify...';
    }
    return isComplete ? '✅ Optimization Complete!' : title;
  };

  const getDescription = () => {
    if (operationType === 'synchronization') {
      return isComplete 
        ? `${current} products synchronized successfully to Shopify`
        : `${current} / ${total} products synchronized`;
    }
    return `${current} / ${total} produits traités`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{getTitle()}</DialogTitle>
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {!isComplete ? (
            <>
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-background rounded-full" />
                </div>
              </div>
              <div className="text-center space-y-2 w-full">
                <h3 className="text-xl font-semibold">{getTitle()}</h3>
                <p className="text-sm text-muted-foreground">
                  {getDescription()}
                </p>
                <Progress value={percentage} className="h-3 mt-4" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(percentage)}%
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={cn(
                "relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center",
                "animate-scale-in"
              )}>
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {operationType === 'synchronization' ? 'Synchronization completed!' : 'Optimisation terminée !'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {total} {operationType === 'synchronization' ? 'products synchronized' : 'produits optimisés'} avec succès
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-4">
                {operationType === 'optimization' && onSyncClick && (
                  <Button
                    onClick={onSyncClick}
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <Upload className="w-5 h-5" />
                    Synchroniser avec Shopify
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Fermer
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
