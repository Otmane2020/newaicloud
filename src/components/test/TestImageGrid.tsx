import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image as ImageIcon, RefreshCw, Loader2, Sparkles } from 'lucide-react';

interface TestImageGridProps {
  images: any[];
}

export function TestImageGrid({ images }: TestImageGridProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const handleGenerateAltText = async (imageId: string) => {
    setLoading(imageId);
    try {
      const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
        body: { imageIds: [imageId] }
      });
      if (error) throw error;
      toast.success('Alt text généré');
    } catch (error) {
      toast.error('Erreur lors de la génération de l\'alt text');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAllAltTexts = async () => {
    setProcessingAll(true);
    try {
      const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
        body: { imageIds: images.map(img => img.id) }
      });
      if (error) throw error;
      toast.success('Alt texts générés pour toutes les images');
    } catch (error) {
      toast.error('Erreur lors de la génération des alt texts');
      console.error(error);
    } finally {
      setProcessingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleGenerateAllAltTexts}
          disabled={processingAll}
        >
          {processingAll ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Générer tous les Alt Texts
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="p-3 space-y-2">
            <div className="aspect-square relative rounded overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.alt_text || 'Image'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                {image.type}
              </Badge>
              {image.alt_text && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {image.alt_text}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleGenerateAltText(image.id)}
                disabled={loading === image.id || processingAll}
              >
                {loading === image.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={loading === image.id || processingAll}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
