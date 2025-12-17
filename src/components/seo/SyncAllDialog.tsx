import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SyncResult {
  id: string;
  title: string;
  imageUrl?: string;
  status: 'success' | 'error' | 'skipped' | 'pending' | 'processing';
  error?: string;
}

interface SyncAllDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  results: SyncResult[];
  progress: number;
  isProcessing: boolean;
  currentItem?: string;
  totalItems?: number;
  currentIndex?: number;
  type: 'products' | 'collections' | 'pages' | 'articles' | 'tags' | 'alt-images';
}

export function SyncAllDialog({
  open,
  onClose,
  onCancel,
  results,
  progress,
  isProcessing,
  currentItem,
  totalItems = results.length,
  currentIndex = 0,
  type,
}: SyncAllDialogProps) {
  const { t, tf, language } = useTranslation();
  const currentItemRef = useRef<HTMLDivElement>(null);

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  const getTypeLabel = () => {
    const typeMap: Record<string, string> = {
      products: t.dialogs?.syncAll?.types?.products || 'Products',
      collections: t.dialogs?.syncAll?.types?.collections || 'Collections',
      pages: t.dialogs?.syncAll?.types?.pages || 'Pages',
      articles: t.dialogs?.syncAll?.types?.articles || 'Articles',
      tags: t.dialogs?.syncAll?.types?.tags || 'Tags',
      'alt-images': t.dialogs?.syncAll?.types?.['alt-images'] || 'Images'
    };
    return typeMap[type] || type;
  };

  // Auto-scroll to current item
  useEffect(() => {
    if (currentItemRef.current && isProcessing) {
      currentItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex, isProcessing]);

  const getStatusBadge = (result: SyncResult, isCurrentItem: boolean) => {
    if (result.status === 'pending') {
      return (
        <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/30">
          {language === 'fr' ? 'En attente' : 'Pending'}
        </Badge>
      );
    }

    if (result.status === 'processing' || isCurrentItem) {
      return (
        <Badge className="text-xs bg-primary/20 text-primary border-primary/30 animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {language === 'fr' ? 'Sync...' : 'Syncing...'}
        </Badge>
      );
    }

    if (result.status === 'success') {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Badge className="text-xs bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Sync' : 'Synced'}
          </Badge>
        </motion.div>
      );
    }

    if (result.status === 'error') {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Erreur' : 'Error'}
          </Badge>
        </motion.div>
      );
    }

    if (result.status === 'skipped') {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Badge className="text-xs bg-warning/20 text-warning border-warning/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Ignoré' : 'Skipped'}
          </Badge>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 sm:p-6 sm:pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-3">
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="flex-shrink-0"
              >
                <RefreshCw className="w-6 h-6 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <CheckCircle className="w-6 h-6 text-success" />
              </motion.div>
            )}
            <span className="truncate">
              {isProcessing 
                ? (language === 'fr' ? `Sync ${getTypeLabel()} en cours...` : `Syncing ${getTypeLabel()}...`)
                : (language === 'fr' ? `Sync ${getTypeLabel()} terminée` : `${getTypeLabel()} sync completed`)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 pt-4 space-y-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{getTypeLabel()}</span>
                <span className="font-semibold text-foreground">
                  {currentIndex} / {totalItems}
                </span>
              </div>
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                className="text-2xl sm:text-3xl font-bold"
              >
                {Math.round(progress)}%
              </motion.span>
            </div>

            <Progress value={progress} className="h-3 sm:h-4" />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div 
              className="bg-success/10 rounded-xl p-2 sm:p-3 border border-success/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CheckCircle className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'Succès' : 'Success'}</p>
              <p className="text-lg sm:text-xl font-bold text-success">{successCount}</p>
            </motion.div>
            <motion.div 
              className="bg-destructive/10 rounded-xl p-2 sm:p-3 border border-destructive/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <XCircle className="w-4 h-4 text-destructive mx-auto mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'Erreurs' : 'Errors'}</p>
              <p className="text-lg sm:text-xl font-bold text-destructive">{errorCount}</p>
            </motion.div>
            <motion.div 
              className="bg-warning/10 rounded-xl p-2 sm:p-3 border border-warning/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AlertCircle className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'Ignorés' : 'Skipped'}</p>
              <p className="text-lg sm:text-xl font-bold text-warning">{skippedCount}</p>
            </motion.div>
          </div>

          {/* Liste avec scroll */}
          {results.length > 0 && (
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-[200px] sm:h-[280px] rounded-xl border bg-muted/30">
                <div className="p-2 sm:p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {results.map((result, index) => {
                      const isCurrentItem = isProcessing && result.title === currentItem;
                      
                      return (
                        <motion.div
                          key={result.id}
                          ref={isCurrentItem ? currentItemRef : null}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            scale: isCurrentItem ? 1.02 : 1,
                          }}
                          transition={{ 
                            duration: 0.3,
                            delay: index * 0.02,
                          }}
                          className={cn(
                            "flex items-center gap-3 p-2 sm:p-3 rounded-xl border transition-all duration-300",
                            isCurrentItem && "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-lg",
                            !isCurrentItem && result.status === 'success' && "bg-success/5 border-success/20",
                            !isCurrentItem && result.status === 'error' && "bg-destructive/5 border-destructive/20",
                            !isCurrentItem && result.status === 'skipped' && "bg-warning/5 border-warning/20",
                            !isCurrentItem && result.status === 'pending' && "bg-background border-border/50 opacity-60"
                          )}
                        >
                          {/* Image */}
                          <div className={cn(
                            "relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-muted",
                            isCurrentItem && "ring-2 ring-primary"
                          )}>
                            {result.imageUrl ? (
                              <img 
                                src={result.imageUrl} 
                                alt={result.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <RefreshCw className="w-4 h-4" />
                              </div>
                            )}
                            {isCurrentItem && (
                              <motion.div
                                className="absolute inset-0 bg-primary/20"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>

                          {/* Titre */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-xs sm:text-sm line-clamp-1",
                              isCurrentItem && "text-primary"
                            )}>
                              {result.title}
                            </p>
                            {result.error && (
                              <p className="text-[10px] sm:text-xs text-destructive mt-0.5 line-clamp-1">
                                {result.error}
                              </p>
                            )}
                          </div>

                          {/* Badge de statut */}
                          <div className="flex-shrink-0">
                            {getStatusBadge(result, isCurrentItem)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-2 border-t bg-muted/30 flex gap-2 justify-end">
          {isProcessing && onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              <X className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          )}
          {!isProcessing && (
            <Button 
              onClick={onClose} 
              className="flex-1 sm:flex-none"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
