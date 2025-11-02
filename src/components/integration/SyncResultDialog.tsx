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

interface SyncStats {
  products: { before: number; after: number; imported: number };
  collections: { before: number; after: number; imported: number };
  pages: { before: number; after: number; imported: number };
  articles: { before: number; after: number; imported: number };
  images: { before: number; after: number; imported: number };
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
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col animate-scale-in">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            Synchronisation Terminée !
          </DialogTitle>
          <DialogDescription>
            Toutes vos données ont été importées avec succès
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 min-h-0 flex flex-col">
          {/* Total counter - Featured */}
          <div className="flex-shrink-0 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-green-500 animate-pulse" />
            <div className="text-5xl font-bold text-green-600 dark:text-green-400 tabular-nums mb-2">
              +{displayedTotal}
            </div>
            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
              Éléments Importés
            </p>
          </div>

          {/* Stats by type */}
          <div className="flex-1 min-h-0 animate-fade-in">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Rapport Détaillé
            </h4>
            <ScrollArea className="h-[300px] border-2 rounded-lg shadow-inner bg-muted/5">
              <div className="p-4 space-y-3">
                {Object.entries(stats)
                  .filter(([_, data]) => data.imported > 0)
                  .map(([type, data]) => {
                    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                    const Icon = config.icon;
                    
                    return (
                      <Card key={type} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                              <Icon className={`w-7 h-7 ${config.color}`} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-base">{config.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                                    +{data.imported}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 text-sm">
                                <div className="px-3 py-1 bg-muted rounded-full">
                                  <span className="font-medium text-muted-foreground">Avant: </span>
                                  <span className="font-bold">{data.before}</span>
                                </div>
                                <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                  <span className="font-medium text-muted-foreground">Après: </span>
                                  <span className="font-bold text-primary">{data.after}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          {/* Close button */}
          <Button onClick={() => onOpenChange(false)} size="lg" className="w-full">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
