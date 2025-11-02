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
import { Loader2, Package, Layers, FileText, Newspaper, Image, Check, TrendingUp, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface SyncStats {
  products: { before: number; after: number; imported: number };
  collections: { before: number; after: number; imported: number };
  pages: { before: number; after: number; imported: number };
  articles: { before: number; after: number; imported: number };
  images: { before: number; after: number; imported: number };
}

interface SyncProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: 'syncing' | 'complete';
  progress: number;
  currentType: string;
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

export function SyncProgressDialog({
  open,
  onOpenChange,
  phase,
  progress,
  currentType,
  stats,
  totalImported,
}: SyncProgressDialogProps) {
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayedProgress < progress) {
        setDisplayedProgress(prev => Math.min(prev + 2, progress));
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [displayedProgress, progress]);

  // Animate total counter
  useEffect(() => {
    if (displayedTotal < totalImported) {
      const timer = setTimeout(() => {
        setDisplayedTotal(prev => Math.min(prev + 1, totalImported));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [displayedTotal, totalImported]);

  const getPhaseTitle = () => {
    if (phase === 'complete') return "✅ Synchronisation Terminée !";
    return `🔄 Synchronisation en cours...`;
  };

  const getPhaseDescription = () => {
    if (phase === 'complete') return "Toutes vos données ont été importées avec succès";
    return `Import de ${TYPE_CONFIG[currentType as keyof typeof TYPE_CONFIG]?.label || currentType}...`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col animate-scale-in">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            {phase !== 'complete' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {getPhaseTitle()}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {getPhaseDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Progress bar */}
          {phase === 'syncing' && (
            <div className="flex-shrink-0 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium">Progression Globale</span>
                <span className="font-bold text-lg text-primary tabular-nums">
                  {Math.round(displayedProgress)}%
                </span>
              </div>
              <Progress 
                value={displayedProgress} 
                className="h-3 sm:h-4 transition-all duration-300 ease-out shadow-sm [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:via-primary/90 [&>div]:to-primary/80 [&>div]:animate-pulse" 
              />
            </div>
          )}

          {/* Total counter */}
          <div className="flex-shrink-0">
            <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6 pb-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary animate-pulse" />
                <div className="text-4xl font-bold text-primary tabular-nums mb-1">
                  {displayedTotal}
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Éléments Importés
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats by type */}
          <div className="flex-1 min-h-0 animate-fade-in">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Rapport Détaillé
            </h4>
            <ScrollArea className="h-[300px] border-2 rounded-lg shadow-inner bg-muted/5">
              <div className="p-4 space-y-3">
                {Object.entries(stats).map(([type, data]) => {
                  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                  const Icon = config.icon;
                  
                  if (data.imported === 0 && phase !== 'complete') return null;
                  
                  return (
                    <Card key={type} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20`}>
                            <Icon className={`w-6 h-6 ${config.color}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm">{config.label}</span>
                              <span className="text-2xl font-bold text-primary tabular-nums">
                                +{data.imported}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">Avant: {data.before}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-medium text-primary">Après: {data.after}</span>
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

          {/* Loading animation */}
          {phase === 'syncing' && (
            <div className="flex justify-center items-center gap-2 flex-shrink-0 py-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg" />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.15s' }} />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.3s' }} />
            </div>
          )}

          {/* Success message */}
          {phase === 'complete' && (
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Synchronisation terminée avec succès !
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {totalImported} éléments importés au total
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          {phase === 'complete' && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fermer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
