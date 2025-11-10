import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Upload, Monitor, Smartphone } from 'lucide-react';
import { LandingConfig } from '@/components/seo/LandingConfigDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={handleGenerate}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <LoadingState
        message="Génération de la landing page en cours..."
        progress={progress}
        estimatedTime="30-60 secondes"
        details={`Création d'une page optimisée pour "${product.title}"`}
      />
    );
  }

  if (generatedHtml) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Aperçu de la landing page</h3>
          </div>
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'desktop' | 'mobile')}>
            <TabsList>
              <TabsTrigger value="desktop" className="gap-2">
                <Monitor className="h-4 w-4" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={`border rounded-lg overflow-hidden bg-background ${
          previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
        }`}>
          <iframe
            srcDoc={generatedHtml}
            className={`w-full ${previewMode === 'mobile' ? 'h-[667px]' : 'h-[600px]'}`}
            title="Landing Page Preview"
            sandbox="allow-same-origin"
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette landing page sera créée en tant que page Shopify et liée à votre produit.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button 
            onClick={handleGenerate}
            variant="outline"
            disabled={isGenerating}
          >
            Régénérer
          </Button>
          <Button 
            onClick={handleSyncToShopify}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <>Synchronisation...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Synchroniser avec Shopify
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground">
        Prêt à générer une landing page pour "{product.title}"
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleGenerate}>
          Générer maintenant
        </Button>
      </div>
    </div>
  );
}
