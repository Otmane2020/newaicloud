import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function MediaHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['media-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('product_image_history')
        .select(`
          *,
          product_id,
          shopify_products!inner(title),
          product_images!inner(src)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const getOptimizationTypeLabel = (type: string) => {
    switch (type) {
      case 'white_background':
        return 'Fond Blanc';
      case 'ai_background':
        return 'Arrière-plan IA';
      case 'description':
        return 'Description';
      default:
        return type;
    }
  };

  const getOptimizationTypeColor = (type: string) => {
    switch (type) {
      case 'white_background':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ai_background':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'description':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedByProduct = history?.reduce((acc, item) => {
    const productTitle = item.shopify_products?.title || 'Produit inconnu';
    if (!acc[productTitle]) {
      acc[productTitle] = [];
    }
    acc[productTitle].push(item);
    return acc;
  }, {} as Record<string, typeof history>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Historique Media</h1>
        <p className="text-muted-foreground">
          Consultez l'historique complet de toutes vos optimisations d'images par produit
        </p>
      </div>

      <div className="grid gap-4">
        {groupedByProduct && Object.entries(groupedByProduct).map(([productTitle, items]) => (
          <Card key={productTitle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {productTitle}
              </CardTitle>
              <CardDescription>
                {items.length} optimisation{items.length > 1 ? 's' : ''} effectuée{items.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={item.optimized_url}
                        alt="Optimized"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getOptimizationTypeColor(item.optimization_type)}>
                          {getOptimizationTypeLabel(item.optimization_type)}
                        </Badge>
                        {item.is_current && (
                          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                            Actuel
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          v{item.version_number}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                        
                        {item.resolution && (
                          <span className="text-xs">{item.resolution}</span>
                        )}
                        
                        {item.quality_score && (
                          <span className="text-xs">
                            Qualité: {item.quality_score}/100
                          </span>
                        )}
                      </div>

                      {item.ai_prompt && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          Prompt: {item.ai_prompt}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={item.optimized_url}
                        download
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!groupedByProduct || Object.keys(groupedByProduct).length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aucun historique d'optimisation disponible
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
