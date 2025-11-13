import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface TestPageCardProps {
  page: any;
}

export function TestPageCard({ page }: TestPageCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerateSEO = async () => {
    setLoading('seo');
    try {
      const { error } = await supabase.functions.invoke('generate-page-seo', {
        body: { pageId: page.id }
      });
      if (error) throw error;
      toast.success('SEO de page généré');
    } catch (error) {
      toast.error('Erreur lors de la génération du SEO');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleSync = async () => {
    setLoading('sync');
    try {
      const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
        body: { pageIds: [page.id] }
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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold">{page.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {page.seo_description || 'Pas de description'}
              </p>
            </div>
            {page.seo_score && (
              <Badge variant="outline">Score: {page.seo_score}/100</Badge>
            )}
          </div>
          <div className="flex gap-2 mt-4">
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
              Générer SEO
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
              Synchroniser
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
