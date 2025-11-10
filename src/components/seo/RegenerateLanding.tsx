import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertCircle, Eye, Monitor, Smartphone, Loader2, 
  CheckCircle2, RefreshCw, X, Sparkles 
} from 'lucide-react';
import { LandingConfig } from '@/components/seo/LandingConfigDialog';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  shopify_id: number | null;
  handle?: string | null;
}

interface RegenerateLandingProps {
  product: Product;
  config: LandingConfig;
  autoGenerate?: boolean;
  onGenerated?: (html: string) => void;
  onClose?: () => void;
}

export default function RegenerateLanding({
  product,
  config,
  autoGenerate = false,
  onGenerated,
  onClose,
}: RegenerateLandingProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (autoGenerate) {
      handleGenerate();
    }
  }, [autoGenerate]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);
      
      const { data, error: invokeError } = await supabase.functions.invoke('generate-landing-ai', {
        body: {
          product_id: product.id,
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.description,
          style: config.style,
          mainColor: config.colorScheme,
          layout: config.layout,
          length: config.contentLength,
          customHighlights: config.customHighlights,
          language: 'fr',
        },
      });

      setProgress(80);

      if (invokeError) {
        throw invokeError;
      }

      if (!data || !data.html) {
        throw new Error('Aucune landing page générée');
      }

      setProgress(100);
      setGeneratedHtml(data.html);
      
      toast.success('Landing page générée avec succès !');
      
      if (onGenerated) {
        onGenerated(data.html);
      }

    } catch (err: any) {
      console.error('Error generating landing page:', err);
      const errorMessage = err?.message || 'Erreur lors de la génération';
      setError(errorMessage);
      
      toast.error('Erreur lors de la génération', {
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncToShopify = async () => {
    if (!generatedHtml) return;

    setIsSyncing(true);
    try {
      const { error: syncError } = await supabase.functions.invoke('sync-landing-to-shopify', {
        body: {
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle || product.title.toLowerCase().replace(/\s+/g, '-'),
          htmlContent: generatedHtml,
        },
      });

      if (syncError) throw syncError;

      toast.success('Landing page synchronisée avec Shopify !');
      
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error syncing to Shopify:', err);
      toast.error('Erreur lors de la synchronisation', {
        description: err?.message || 'Impossible de synchroniser avec Shopify',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-lg font-semibold">
                Générer Landing Page
              </span>
            </div>
            {generatedHtml && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Landing page générée</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  Génération en cours...
                </p>
                <p className="text-sm text-muted-foreground">
                  Création de votre landing page premium
                </p>
              </div>
              {progress > 0 && (
                <div className="w-full max-w-md space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {generatedHtml && !isGenerating && (
            <div className="h-full flex flex-col gap-4">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Aperçu
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="w-4 h-4 mr-1" />
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="w-4 h-4 mr-1" />
                    Mobile
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg p-4 overflow-hidden">
                <div className={cn(
                  "border-2 border-border rounded-lg overflow-hidden bg-white shadow-lg transition-all duration-300",
                  previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
                )}>
                  <iframe
                    srcDoc={generatedHtml}
                    className={cn(
                      "w-full border-0",
                      previewMode === 'mobile' ? 'h-[667px]' : 'h-[700px]'
                    )}
                    title="Landing Page Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 flex-shrink-0 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  <X className="w-4 h-4 mr-2" />
                  Fermer
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerate}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regénérer
                  </Button>
                  <Button onClick={handleSyncToShopify} disabled={isSyncing}>
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Synchroniser sur Shopify
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}