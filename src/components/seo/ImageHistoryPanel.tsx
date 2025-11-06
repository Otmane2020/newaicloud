import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, Download, RotateCcw, Image as ImageIcon, Sparkles, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImageHistoryEntry {
  id: string;
  version_number: number;
  optimization_type: string;
  original_url: string;
  optimized_url: string;
  created_at: string;
  ai_model: string | null;
  ai_prompt: string | null;
  resolution: string | null;
  quality_score: number | null;
  is_current: boolean;
}

interface ImageHistoryPanelProps {
  imageId: string;
  productId: string;
  onRestore?: () => void;
}

const optimizationIcons: Record<string, any> = {
  'white_background': ImageIcon,
  'ai_background': Palette,
  'title_description': FileText,
};

const optimizationLabels: Record<string, string> = {
  'white_background': 'Fond blanc',
  'ai_background': 'Arrière-plan IA',
  'title_description': 'Titre & Description',
};

export const ImageHistoryPanel = ({ imageId, productId, onRestore }: ImageHistoryPanelProps) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['image-history', imageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_image_history')
        .select('*')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ImageHistoryEntry[];
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (historyId: string) => {
      const entry = history?.find(h => h.id === historyId);
      if (!entry) throw new Error('Version not found');

      // Mark all versions as not current
      await supabase
        .from('product_image_history')
        .update({ is_current: false })
        .eq('image_id', imageId);

      // Mark selected version as current
      await supabase
        .from('product_image_history')
        .update({ 
          is_current: true,
          restored_at: new Date().toISOString()
        })
        .eq('id', historyId);

      // Update the product image URL
      await supabase
        .from('product_images')
        .update({ 
          src: entry.optimized_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-history', imageId] });
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      toast.success('Version restaurée avec succès');
      onRestore?.();
    },
    onError: (error) => {
      console.error('Error restoring version:', error);
      toast.error('Erreur lors de la restauration');
    }
  });

  const handleDownload = (url: string, version: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-image-v${version}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement démarré');
  };

  const getQualityColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Historique des versions</h3>
        </div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Historique des versions</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Aucune optimisation enregistrée pour cette image.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Historique des versions</h3>
          <Badge variant="secondary">{history.length}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {history.filter(h => h.is_current).length > 0 && (
            <Badge variant="default">Version actuelle</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {history.map((entry, index) => {
            const Icon = optimizationIcons[entry.optimization_type] || Sparkles;
            
            return (
              <div key={entry.id}>
                <div 
                  className={`group relative rounded-lg border p-4 hover:bg-accent/50 transition-colors ${
                    entry.is_current ? 'border-primary bg-primary/5' : ''
                  } ${selectedVersion === entry.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedVersion(entry.id)}
                >
                  {entry.is_current && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="text-xs">Actuelle</Badge>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {/* Preview */}
                    <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={entry.optimized_url}
                        alt={`Version ${entry.version_number}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {optimizationLabels[entry.optimization_type]}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          v{entry.version_number}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}</p>
                        {entry.ai_model && (
                          <p className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {entry.ai_model}
                          </p>
                        )}
                        {entry.resolution && (
                          <p>Résolution: {entry.resolution}</p>
                        )}
                        {entry.quality_score && (
                          <p className={getQualityColor(entry.quality_score)}>
                            Qualité: {entry.quality_score}/100
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {!entry.is_current && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreMutation.mutate(entry.id);
                            }}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(entry.optimized_url, entry.version_number);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < history.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Stats */}
      <Separator className="my-4" />
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{history.length}</p>
          <p className="text-xs text-muted-foreground">Versions</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {Math.round(history.reduce((sum, h) => sum + (h.quality_score || 0), 0) / history.length)}
          </p>
          <p className="text-xs text-muted-foreground">Qualité moy.</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {new Set(history.map(h => h.optimization_type)).size}
          </p>
          <p className="text-xs text-muted-foreground">Types d'optim.</p>
        </div>
      </div>
    </Card>
  );
};
