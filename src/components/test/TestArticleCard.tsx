import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Image, RefreshCw, Loader2 } from 'lucide-react';

interface TestArticleCardProps {
  article: any;
}

export function TestArticleCard({ article }: TestArticleCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerateSEO = async () => {
    setLoading('seo');
    try {
      const { error } = await supabase.functions.invoke('generate-article-seo', {
        body: { articleId: article.id }
      });
      if (error) throw error;
      toast.success('SEO d\'article généré');
    } catch (error) {
      toast.error('Erreur lors de la génération du SEO');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateFeaturedImage = async () => {
    setLoading('image');
    try {
      const { error } = await supabase.functions.invoke('generate-image', {
        body: { articleId: article.id }
      });
      if (error) throw error;
      toast.success('Image de couverture générée');
    } catch (error) {
      toast.error('Erreur lors de la génération de l\'image');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAltText = async () => {
    setLoading('alt');
    try {
      const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
        body: { articleId: article.id }
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

  const handleSync = async () => {
    setLoading('sync');
    try {
      const { error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleIds: [article.id] }
      });
      if (error) throw error;
      toast.success('Synchronisé avec Shopify');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {article.featured_image && (
          <img
            src={article.featured_image}
            alt={article.title}
            className="w-20 h-20 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {article.seo_description || 'Pas de description'}
              </p>
            </div>
            {article.seo_score && (
              <Badge variant="outline">Score: {article.seo_score}/100</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSEO}
              disabled={!!loading}
            >
              {loading === 'seo' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              SEO
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateFeaturedImage}
              disabled={!!loading}
            >
              {loading === 'image' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Image className="w-3 h-3 mr-1" />
              )}
              Image
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAltText}
              disabled={!!loading}
            >
              {loading === 'alt' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Image className="w-3 h-3 mr-1" />
              )}
              Alt Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={!!loading}
            >
              {loading === 'sync' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Sync
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
