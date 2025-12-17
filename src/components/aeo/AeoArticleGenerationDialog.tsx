import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, Eye, ExternalLink, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  shopify_url?: string;
}

interface AeoArticleGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  isGenerating: boolean;
  progress: number;
  currentStep?: string;
  generatedArticle: GeneratedArticle | null;
  opportunityTitle?: string;
  platformColor?: string;
}

export function AeoArticleGenerationDialog({
  open,
  onClose,
  isGenerating,
  progress,
  currentStep,
  generatedArticle,
  opportunityTitle,
  platformColor = '#10b981',
}: AeoArticleGenerationDialogProps) {
  const { language } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  const steps = [
    { id: 'analyzing', label: language === 'fr' ? 'Analyse de l\'opportunité...' : 'Analyzing opportunity...' },
    { id: 'structuring', label: language === 'fr' ? 'Structuration du contenu...' : 'Structuring content...' },
    { id: 'generating', label: language === 'fr' ? 'Génération de l\'article...' : 'Generating article...' },
    { id: 'optimizing', label: language === 'fr' ? 'Optimisation SEO...' : 'SEO optimization...' },
    { id: 'complete', label: language === 'fr' ? 'Article prêt !' : 'Article ready!' },
  ];

  const getCurrentStepIndex = () => {
    const idx = steps.findIndex(s => s.id === currentStep);
    return idx >= 0 ? idx : 0;
  };

  // Reset preview when dialog closes
  useEffect(() => {
    if (!open) {
      setShowPreview(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: platformColor }} />
                <span>{language === 'fr' ? 'Génération en cours...' : 'Generating...'}</span>
              </>
            ) : generatedArticle ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                <span>{language === 'fr' ? 'Article généré !' : 'Article generated!'}</span>
              </>
            ) : (
              <span>{language === 'fr' ? 'Générer article AEO' : 'Generate AEO article'}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Opportunity title */}
          {opportunityTitle && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'fr' ? 'Opportunité' : 'Opportunity'}
              </p>
              <p className="font-medium text-sm">"{opportunityTitle}"</p>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {steps[getCurrentStepIndex()]?.label}
                </span>
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: platformColor }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-3 sm:h-4" />
              
              {/* Step indicators */}
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 text-sm ${
                      idx < getCurrentStepIndex() 
                        ? 'text-success' 
                        : idx === getCurrentStepIndex() 
                          ? 'text-primary font-medium' 
                          : 'text-muted-foreground'
                    }`}
                  >
                    {idx < getCurrentStepIndex() ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : idx === getCurrentStepIndex() ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: platformColor }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Article Preview */}
          {!isGenerating && generatedArticle && (
            <div className="space-y-4">
              {!showPreview ? (
                <>
                  {/* Success summary */}
                  <div className="text-center py-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${platformColor}20` }}
                    >
                      <Sparkles className="w-8 h-8" style={{ color: platformColor }} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{generatedArticle.title}</h3>
                    {generatedArticle.meta_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {generatedArticle.meta_description}
                      </p>
                    )}
                    {generatedArticle.keywords && generatedArticle.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-3">
                        {generatedArticle.keywords.slice(0, 5).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => setShowPreview(true)} 
                      variant="outline" 
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {language === 'fr' ? 'Aperçu article' : 'Preview article'}
                    </Button>
                    {generatedArticle.shopify_url && (
                      <Button 
                        onClick={() => window.open(generatedArticle.shopify_url, '_blank')}
                        className="flex-1"
                        style={{ backgroundColor: platformColor }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Voir sur Shopify' : 'View on Shopify'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Full article preview */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      {language === 'fr' ? 'Aperçu de l\'article' : 'Article preview'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                      {language === 'fr' ? '← Retour' : '← Back'}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border p-4">
                    <article className="prose prose-sm dark:prose-invert max-w-none">
                      <h1 className="text-xl font-bold mb-4">{generatedArticle.title}</h1>
                      <div dangerouslySetInnerHTML={{ __html: generatedArticle.content }} />
                    </article>
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          {/* Close button */}
          <div className="flex justify-end pt-2">
            {!isGenerating && (
              <Button onClick={onClose} className="w-full sm:w-auto">
                {language === 'fr' ? 'Fermer' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}