import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/language";

interface SimpleSyncProgressProps {
  open: boolean;
  currentType: string;
}

export function SimpleSyncProgress({ open, currentType }: SimpleSyncProgressProps) {
  const { t, tf } = useTranslation();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [displayedPercentage, setDisplayedPercentage] = useState(0);

  // Animer la barre de progression
  useEffect(() => {
    if (!open) {
      setAnimatedProgress(0);
      setDisplayedPercentage(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        const increment = Math.random() * 2 + 1;
        const newValue = Math.min(prev + increment, 95);
        return newValue;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [open]);

  // Animer le pourcentage défilant
  useEffect(() => {
    if (!open) return;

    const targetPercentage = Math.round(animatedProgress);
    if (displayedPercentage < targetPercentage) {
      const timer = setTimeout(() => {
        setDisplayedPercentage((prev) => Math.min(prev + 1, targetPercentage));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [animatedProgress, displayedPercentage, open]);

  // Réinitialiser quand le dialogue s'ouvre
  useEffect(() => {
    if (open) {
      setDisplayedPercentage(0);
      setAnimatedProgress(0);
    }
  }, [open]);

  const getTypeLabel = (type: string) => {
    const typeKey = type as keyof typeof t.integration.sync.types;
    return t.integration.sync.types[typeKey] || type;
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[95vw] sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl flex items-center gap-2 pr-6">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary flex-shrink-0" />
            <span className="truncate">{t.integration.sync.progress.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm pr-6">
            <span className="block truncate">
              {tf("integration.sync.progress.importing", { type: getTypeLabel(currentType) })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-bold text-primary tabular-nums transition-all duration-200">
                {displayedPercentage}%
              </span>
            </div>

            {/* Barre de progression avec dégradé bleu */}
            <div className="relative">
              <div className="h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25"
                  style={{
                    width: `${animatedProgress}%`,
                    background: `linear-gradient(90deg, 
                      #3b82f6 0%, 
                      #2563eb 25%, 
                      #1d4ed8 50%, 
                      #4338ca 75%, 
                      #3730a3 100%)`,
                  }}
                />

                {/* Effet de brillance animé */}
                <div
                  className="absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                  style={{
                    transform: `translateX(${animatedProgress * 0.8}%)`,
                    transition: "transform 0.3s ease-out",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Points de chargement animés */}
          <div className="flex justify-center items-center gap-2 py-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-bounce shadow-sm" />
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-bounce shadow-sm"
              style={{ animationDelay: "0.15s" }}
            />
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-bounce shadow-sm"
              style={{ animationDelay: "0.3s" }}
            />
          </div>

          {/* Message d'encouragement dynamique */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground animate-pulse">
              {displayedPercentage < 30 && "Préparation des données..."}
              {displayedPercentage >= 30 && displayedPercentage < 60 && "Synchronisation en cours..."}
              {displayedPercentage >= 60 && displayedPercentage < 85 && "Finalisation..."}
              {displayedPercentage >= 85 && "Presque terminé !"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
