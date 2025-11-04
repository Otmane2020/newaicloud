import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Layers, FileText, Newspaper, Image, Check, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";

interface SyncStats {
  products: { before: number; after: number; imported: number; error?: string };
  collections: { before: number; after: number; imported: number; error?: string };
  pages: { before: number; after: number; imported: number; error?: string };
  articles: { before: number; after: number; imported: number; error?: string };
  images: { before: number; after: number; imported: number; error?: string };
}

interface SyncResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: SyncStats;
  totalImported: number;
}

const TYPE_CONFIG = {
  products: { icon: Package, label: 'Produits', color: 'text-blue-500' },
  collections: { icon: Layers, label: 'Collections', color: 'text-purple-500' },
  pages: { icon: FileText, label: 'Pages', color: 'text-green-500' },
  articles: { icon: Newspaper, label: 'Articles', color: 'text-orange-500' },
  images: { icon: Image, label: 'Images', color: 'text-pink-500' },
};

export function SyncResultDialog({
  open,
  onOpenChange,
  stats,
  totalImported,
}: SyncResultDialogProps) {
  const { t } = useTranslation();
  const [displayedTotal, setDisplayedTotal] = useState(0);

  // Animate total counter
  useEffect(() => {
    if (open && displayedTotal < totalImported) {
      const timer = setTimeout(() => {
        setDisplayedTotal(prev => Math.min(prev + 1, totalImported));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [open, displayedTotal, totalImported]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setDisplayedTotal(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col animate-scale-in p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="truncate">{t.integration.sync.result.title}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t.integration.sync.result.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 flex-1 min-h-0 flex flex-col">
          {/* Total counter - Featured */}
          <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg text-center">
            <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-green-500 animate-pulse" />
            <div className="text-3xl sm:text-5xl font-bold text-green-600 dark:text-green-400 tabular-nums mb-1 sm:mb-2">
              {totalImported > 0 ? '+' : ''}{displayedTotal}
            </div>
            <p className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">
              {totalImported > 0 
                ? t.integration.sync.result.totalImported 
                : 'Éléments synchronisés (0 nouveaux)'}
            </p>
            {totalImported === 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Tous vos éléments sont à jour avec Shopify
              </p>
            )}
          </div>

          {/* Stats by type */}
          <div className="flex-1 min-h-0 animate-fade-in">
            <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
              <span>{t.integration.sync.result.detailedReport}</span>
            </h4>
            <ScrollArea className="h-[250px] sm:h-[300px] border rounded-lg bg-muted/30">
              <div className="p-2 sm:p-3 space-y-2">
                {Object.entries(stats).map(([type, data]) => {
                    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                    const Icon = config.icon;
                    const typeKey = type as keyof typeof t.integration.sync.types;
                    const typeLabel = t.integration.sync.types[typeKey] || config.label;
                    const hasError = !!data.error;
                    const change = data.imported;
                    const currentCount = data.after;
                    
                    return (
                      <div key={type} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card border rounded-lg hover:shadow-md transition-all ${hasError ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${hasError ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${hasError ? 'text-red-600 dark:text-red-400' : config.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs sm:text-sm truncate">{typeLabel}</span>
                            {hasError ? (
                              <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                                Échec
                              </span>
                            ) : (
                              <span className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400 tabular-nums flex-shrink-0">
                                {change > 0 ? '+' : ''}{change}
                              </span>
                            )}
                          </div>
                          
                          {hasError ? (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                              {data.error}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs mt-1">
                              <span className="text-muted-foreground tabular-nums">
                                {currentCount} 
                                {change !== 0 && (
                                  <span className={`ml-1 font-semibold ${change > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    ({change > 0 ? '+' : ''}{change})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          {/* Close button */}
          <Button onClick={() => onOpenChange(false)} size="lg" className="w-full">
            {t.integration.sync.result.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
