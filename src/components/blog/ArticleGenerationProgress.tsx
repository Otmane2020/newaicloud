import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Tag, CheckCircle, ExternalLink, Eye } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface ArticleGenerationProgressProps {
  open: boolean;
  onClose: () => void;
  generatedArticle?: { id: string; title: string; shopifyUrl?: string } | null;
  onViewArticle?: (articleId: string) => void;
}

export function ArticleGenerationProgress({ 
  open, 
  onClose, 
  generatedArticle,
  onViewArticle 
}: ArticleGenerationProgressProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  
  const messages = [
    { progress: 0, message: t.blog.articleGeneration.steps.start, icon: Sparkles },
    { progress: 15, message: t.blog.articleGeneration.steps.analyzingProducts, icon: FileText },
    { progress: 30, message: t.blog.articleGeneration.steps.integratingKeywords, icon: Tag },
    { progress: 45, message: t.blog.articleGeneration.steps.creatingContent, icon: Sparkles },
    { progress: 60, message: t.blog.articleGeneration.steps.applyingDesign, icon: Sparkles },
    { progress: 75, message: t.blog.articleGeneration.steps.generatingGalleries, icon: FileText },
    { progress: 85, message: t.blog.articleGeneration.steps.creatingLinks, icon: FileText },
    { progress: 95, message: t.blog.articleGeneration.steps.finalizing, icon: CheckCircle },
    { progress: 100, message: t.blog.articleGeneration.steps.complete, icon: CheckCircle },
  ];
  
  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCurrentMessage("");
      setIsComplete(false);
      return;
    }
    
    // If article is already generated, show complete state
    if (generatedArticle) {
      setProgress(100);
      setCurrentMessage(t.blog.articleGeneration.steps.complete);
      setIsComplete(true);
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
    }, 1500);
    
    return () => clearInterval(interval);
  }, [open, generatedArticle]);
  
  const handleViewArticle = () => {
    if (generatedArticle && onViewArticle) {
      onViewArticle(generatedArticle.id);
    }
  };
  
  const handleViewOnShopify = () => {
    if (generatedArticle?.shopifyUrl) {
      window.open(generatedArticle.shopifyUrl, '_blank');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center gap-6 py-8">
          {isComplete && generatedArticle ? (
            <>
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{t.blog.articleGeneration.successTitle}</h2>
                <p className="text-muted-foreground mb-2">
                  {t.blog.articleGeneration.successDescription}
                </p>
                <p className="font-medium text-primary">
                  {generatedArticle.title}
                </p>
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  onClick={handleViewArticle}
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t.blog.articleGeneration.viewArticle}
                </Button>
                
                {generatedArticle.shopifyUrl && (
                  <Button 
                    variant="outline"
                    onClick={handleViewOnShopify}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t.blog.articleGeneration.viewOnShopify}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{t.blog.articleGeneration.title}</h2>
                <p className="text-muted-foreground">
                  {t.blog.articleGeneration.description}
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
                {t.blog.articleGeneration.warning}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
