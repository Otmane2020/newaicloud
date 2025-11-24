import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minimize2, Maximize2, X, Sparkles, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BrowserNotificationService } from "@/lib/notificationService";
import { toast } from "sonner";

interface MinimizableProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isProcessing: boolean;
  currentProcessing?: { index: number; total: number; title: string } | null;
  onCancel?: () => void;
  onComplete?: () => void;
  title: string;
  children?: React.ReactNode;
}

export function MinimizableProgressDialog({
  open,
  onOpenChange,
  isProcessing,
  currentProcessing,
  onCancel,
  onComplete,
  title,
  children,
}: MinimizableProgressDialogProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wasProcessing, setWasProcessing] = useState(false);

  // Smooth progress animation
  useEffect(() => {
    if (!isProcessing || !currentProcessing) {
      return;
    }

    const targetProgress = (currentProcessing.index / currentProcessing.total) * 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isProcessing, currentProcessing]);

  // Detect completion and notify
  useEffect(() => {
    if (wasProcessing && !isProcessing && open) {
      // Processing just finished
      const showCompletionNotification = async () => {
        // Browser notification
        if (BrowserNotificationService.isSupported()) {
          await BrowserNotificationService.showNotification("Génération terminée ✅", {
            body: "Votre contenu optimisé est prêt à être prévisualisé",
            icon: "/icon-192.png",
          });
        }

        // Toast notification
        toast.success("Génération terminée !", {
          description: "Cliquez pour voir l'aperçu",
          action: {
            label: "Voir l'aperçu",
            onClick: () => {
              setIsMinimized(false);
              onComplete?.();
            },
          },
          duration: 10000,
        });
      };

      showCompletionNotification();
    }

    setWasProcessing(isProcessing);
  }, [isProcessing, wasProcessing, open, onComplete]);

  // Request notification permission on mount
  useEffect(() => {
    if (open && isProcessing) {
      BrowserNotificationService.requestPermission();
    }
  }, [open, isProcessing]);

  if (!open) return null;

  // Minimized floating widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-background border border-border rounded-lg shadow-2xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Sparkles className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "3s" }} />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium text-sm truncate">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)} className="h-7 w-7 p-0">
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isProcessing && currentProcessing ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground truncate">
                {currentProcessing.title.substring(0, 40)}...
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {currentProcessing.index}/{currentProcessing.total}
                </span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-green-600 flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>Terminé - Cliquez pour voir l'aperçu</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full dialog
  return (
    <Dialog open={!isMinimized} onOpenChange={(open) => !open && setIsMinimized(true)}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isProcessing && <Sparkles className="h-5 w-5 text-primary animate-spin" style={{ animationDuration: "3s" }} />}
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)} className="gap-2">
              <Minimize2 className="h-4 w-4" />
              Minimiser
            </Button>
            {isProcessing && onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2">
                <X className="h-4 w-4" />
                Annuler
              </Button>
            )}
          </div>
        </div>

        {isProcessing && currentProcessing ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Sparkles className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>

            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm font-semibold text-primary truncate px-4">
                {currentProcessing.title.substring(0, 50)}...
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="animate-pulse">●</span>
                <span>Analyse IA</span>
                <span className="animate-pulse delay-75">●</span>
                <span>Génération SEO</span>
                <span className="animate-pulse delay-150">●</span>
                <span>Création HTML</span>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {currentProcessing.index}/{currentProcessing.total}
                </span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentProcessing.total - currentProcessing.index > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {currentProcessing.total - currentProcessing.index} restant(s)
                </p>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
