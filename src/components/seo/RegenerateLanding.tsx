import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { LandingConfig } from '@/components/seo/LandingConfigDialog';

interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  shopify_id: number | null;
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
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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
          productId: product.id,
          config,
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
      
      toast.success('Landing page générée avec succès !');
      
      if (onGenerated) {
        onGenerated(data.html);
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1000);

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
