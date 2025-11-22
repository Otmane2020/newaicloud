import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Collection {
  id: string;
  title: string;
  optimization_count?: number;
  last_optimization_at?: string;
}

interface ReoptimizeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  onConfirm: () => void;
}

export function ReoptimizeConfirmDialog({
  open,
  onOpenChange,
  collections,
  onConfirm
}: ReoptimizeConfirmDialogProps) {
  const { t, tf } = useTranslation();
  const alreadyOptimized = collections.filter(c => (c.optimization_count || 0) > 0);
  const neverOptimized = collections.filter(c => (c.optimization_count || 0) === 0);
  
  const totalOptimizations = alreadyOptimized.reduce((sum, c) => sum + (c.optimization_count || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                {t.dialogs.reoptimize.title}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {t.dialogs.reoptimize.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {collections.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {tf(collections.length === 1 ? 'dialogs.reoptimize.selected_one' : 'dialogs.reoptimize.selected_other')}
              </div>
            </div>
            
            {alreadyOptimized.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {totalOptimizations}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.dialogs.reoptimize.previousOptimizations}
                </div>
              </div>
            )}
          </div>

          {/* Avertissement */}
          {alreadyOptimized.length > 0 && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {t.dialogs.reoptimize.warning}
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200">
                    {t.dialogs.reoptimize.warningText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des collections */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {alreadyOptimized.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {tf('dialogs.reoptimize.alreadyOptimized', { count: alreadyOptimized.length })}
                </p>
                {alreadyOptimized.map(collection => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate flex-1">
                      {collection.title}
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {tf('dialogs.reoptimize.optimizations', { count: collection.optimization_count })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {neverOptimized.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {tf('dialogs.reoptimize.neverOptimized', { count: neverOptimized.length })}
                </p>
                {neverOptimized.map(collection => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate">
                      {collection.title}
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs text-green-600">
                      {t.dialogs.reoptimize.new}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note sur la facturation */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>{t.dialogs.reoptimize.quotaNote}</strong>
              <br />
              {tf('dialogs.reoptimize.consumedOptimizations', { 
                count: collections.length, 
                plural: collections.length > 1 ? 's' : '',
                plural2: collections.length > 1 ? 'ont' : 'a'
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t.dialogs.reoptimize.cancel}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {t.dialogs.reoptimize.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
