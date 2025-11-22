import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';

interface SyncResult {
  id: string;
  title: string;
  imageUrl?: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

interface SyncAllDialogProps {
  open: boolean;
  onClose: () => void;
  results: SyncResult[];
  progress: number;
  isProcessing: boolean;
  currentItem?: string;
  type: 'products' | 'collections' | 'pages' | 'articles' | 'tags' | 'alt-images';
}

export function SyncAllDialog({
  open,
  onClose,
  results,
  progress,
  isProcessing,
  currentItem,
  type,
}: SyncAllDialogProps) {
  const { t, tf } = useTranslation();
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  const getTypeLabel = () => {
    const typeMap: Record<string, string> = {
      products: t.dialogs.syncAll.types.products,
      collections: t.dialogs.syncAll.types.collections,
      pages: t.dialogs.syncAll.types.pages,
      articles: t.dialogs.syncAll.types.articles,
      tags: t.dialogs.syncAll.types.tags,
      'alt-images': t.dialogs.syncAll.types['alt-images']
    };
    return typeMap[type] || t.dialogs.syncAll.types.products;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                {t.dialogs.syncAll.inProgress}
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                {t.dialogs.syncAll.completed}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {isProcessing ? tf('dialogs.syncAll.syncingType', { type: getTypeLabel() }) : t.dialogs.syncAll.completed}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {currentItem && (
              <p className="text-sm text-muted-foreground">
                {tf('dialogs.syncAll.processingItem', { item: currentItem })}
              </p>
            )}
          </div>

          {/* Stats Summary */}
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">{t.dialogs.syncAll.success}</span>
                </div>
                <p className="text-2xl font-bold text-success">{successCount}</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">{t.dialogs.syncAll.errors}</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">{t.dialogs.syncAll.skipped}</span>
                </div>
                <p className="text-2xl font-bold text-warning">{skippedCount}</p>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">{t.dialogs.syncAll.detailsTitle}</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      {result.imageUrl && (
                        <img 
                          src={result.imageUrl} 
                          alt={result.title}
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{result.title}</p>
                        {result.error && (
                          <p className="text-xs text-destructive mt-1">{result.error}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
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
                {t.dialogs.syncAll.close}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}