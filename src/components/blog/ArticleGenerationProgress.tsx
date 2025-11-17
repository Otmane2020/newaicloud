import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sparkles, FileText, Tag, CheckCircle } from "lucide-react";

interface ArticleGenerationProgressProps {
  open: boolean;
  onClose: () => void;
}

export function ArticleGenerationProgress({ open, onClose }: ArticleGenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  
  const messages = [
    { progress: 0, message: "🚀 Démarrage de la génération IA...", icon: Sparkles },
    { progress: 15, message: "📦 Analyse des produits sélectionnés", icon: FileText },
    { progress: 30, message: "🔍 Intégration des mots-clés SEO", icon: Tag },
    { progress: 45, message: "✨ Création du contenu par IA", icon: Sparkles },
    { progress: 60, message: "🎨 Application du design et des couleurs", icon: Sparkles },
    { progress: 75, message: "🖼️ Génération des galeries d'images", icon: FileText },
    { progress: 85, message: "🔗 Création des liens Shopify", icon: FileText },
    { progress: 95, message: "✅ Finalisation de l'article blog", icon: CheckCircle },
    { progress: 100, message: "🎉 Article prêt !", icon: CheckCircle },
  ];
  
  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCurrentMessage("");
      return;
    }
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < messages.length) {
        setProgress(messages[currentStep].progress);
        setCurrentMessage(messages[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 1500); // Change message every 1.5s
    
    return () => clearInterval(interval);
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative">
            <Sparkles className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Génération en cours</h2>
            <p className="text-muted-foreground">
              Création de votre article SEO optimisé...
            </p>
          </div>
          
          <div className="w-full space-y-4">
            <Progress value={progress} className="h-3" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary">{currentMessage}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center max-w-xs">
            Cette opération peut prendre 1-2 minutes. Ne fermez pas cette fenêtre.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
