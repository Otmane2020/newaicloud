import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, Clock, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MediaHistory() {
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const dateLocale = language === 'fr' ? fr : enUS;

  const { data: history, isLoading } = useQuery({
    queryKey: ['media-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Récupérer l'historique avec les produits et images
      const { data, error } = await supabase
        .from('product_image_history')
        .select(`
          *,
          shopify_products!product_image_history_product_id_fkey(
            title,
            product_images(id, position)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching media history:", error);
        throw error;
      }
      
      return data;
    }
  });

  const applyToImage = useMutation({
    mutationFn: async ({ 
      historyId, 
      targetImageId, 
      optimizedUrl 
    }: { 
      historyId: string; 
      targetImageId: string; 
      optimizedUrl: string;
    }) => {
      // Update product image
      const { error: updateError } = await supabase
        .from('product_images')
        .update({ 
          src: optimizedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetImageId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success(t.mediaHistoryPage.actions.applySuccess);
      queryClient.invalidateQueries({ queryKey: ['media-history'] });
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
    },
    onError: (error) => {
      console.error('Error applying image:', error);
      toast.error(t.mediaHistoryPage.actions.applyError);
    }
  });

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t.mediaHistoryPage.actions.downloadStarted);
  };

  const getOptimizationTypeLabel = (type: string) => {
    switch (type) {
      case 'white_background':
        return t.mediaHistoryPage.types.whiteBackground;
      case 'ai_background':
        return t.mediaHistoryPage.types.aiBackground;
      case 'description':
        return t.mediaHistoryPage.types.description;
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
    const productTitle = item.shopify_products?.title || t.mediaHistoryPage.unknownProduct;
    if (!acc[productTitle]) {
      acc[productTitle] = [];
    }
    acc[productTitle].push(item);
    return acc;
  }, {} as Record<string, typeof history>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.mediaHistoryPage.title}</h1>
        <p className="text-muted-foreground">
          {t.mediaHistoryPage.description}
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
                {t.mediaHistoryPage.optimizationCount
                  .replace('{{count}}', String(items.length))
                  .replace('{{s}}', items.length > 1 ? 's' : '')}
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
                            {t.mediaHistoryPage.badges.current}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t.mediaHistoryPage.badges.version.replace('{{version}}', String(item.version_number))}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </div>
                        
                        {item.resolution && (
                          <span className="text-xs">{item.resolution}</span>
                        )}
                        
                        {item.quality_score && (
                          <span className="text-xs">
                            {t.mediaHistoryPage.details.quality}: {item.quality_score}/100
                          </span>
                        )}
                      </div>

                      {item.ai_prompt && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {t.mediaHistoryPage.details.prompt}: {item.ai_prompt}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(
                          item.optimized_url, 
                          `${productTitle}-v${item.version_number}.png`
                        )}
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      {item.shopify_products?.product_images && 
                       item.shopify_products.product_images.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={applyToImage.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {t.mediaHistoryPage.actions.apply}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.shopify_products.product_images
                              .sort((a: any, b: any) => a.position - b.position)
                              .map((img: any, idx: number) => (
                                <DropdownMenuItem
                                  key={img.id}
                                  onClick={() => applyToImage.mutate({
                                    historyId: item.id,
                                    targetImageId: img.id,
                                    optimizedUrl: item.optimized_url
                                  })}
                                >
                                  {idx === 0 
                                    ? `📸 ${t.mediaHistoryPage.actions.mainImage}` 
                                    : `📷 ${t.mediaHistoryPage.actions.image.replace('{{number}}', String(idx + 1))}`}
                                </DropdownMenuItem>
                              ))
                            }
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
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
                {t.mediaHistoryPage.noHistory}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
