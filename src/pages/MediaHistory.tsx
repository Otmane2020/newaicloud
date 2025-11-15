import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, Clock, Download, CheckCircle2, Package, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Eye } from "lucide-react";
import { useImageOptimization } from "@/hooks/useImageOptimization";

export default function MediaHistory() {
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const dateLocale = language === 'fr' ? fr : enUS;
  const [activeTab, setActiveTab] = useState('products');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; type: string } | null>(null);
  const { applyAllOptimizedImages, isOptimizing } = useImageOptimization();

  // Product images history
  const { data: productHistory, isLoading: productLoading } = useQuery({
    queryKey: ['product-image-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: historyData, error: historyError } = await supabase
        .from('product_image_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Fetch related product data separately
      const enrichedData = await Promise.all(
        historyData.map(async (item) => {
          // Get product title
          const { data: product } = await supabase
            .from('shopify_products')
            .select('title')
            .eq('id', item.product_id)
            .single();

          // Get product images
          const { data: images } = await supabase
            .from('product_images')
            .select('id, position, src')
            .eq('product_id', item.product_id)
            .order('position', { ascending: true });

          // Get product variants
          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, title, image_url, position')
            .eq('product_id', item.product_id)
            .order('position', { ascending: true });

          return {
            ...item,
            shopify_products: {
              title: product?.title,
              product_images: images || [],
              product_variants: variants || []
            }
          };
        })
      );

      return enrichedData;
    }
  });

  // Collection images history
  const { data: collectionHistory, isLoading: collectionLoading } = useQuery({
    queryKey: ['collection-image-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('collection_image_history')
        .select(`
          *,
          shopify_collections!collection_image_history_collection_id_fkey(
            title,
            handle
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Article images history
  const { data: articleHistory, isLoading: articleLoading } = useQuery({
    queryKey: ['article-image-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('article_image_history')
        .select(`
          *,
          blog_articles!article_image_history_article_id_fkey(
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const isLoading = productLoading || collectionLoading || articleLoading;

  const applyProductImage = useMutation({
    mutationFn: async ({ 
      historyId, 
      targetImageId, 
      optimizedUrl 
    }: { 
      historyId: string; 
      targetImageId: string; 
      optimizedUrl: string;
    }) => {
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
      toast.success('Image appliquée avec succès');
      queryClient.invalidateQueries({ queryKey: ['product-image-history'] });
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
    },
    onError: (error) => {
      console.error('Error applying image:', error);
      toast.error('Erreur lors de l\'application');
    }
  });

  const applyCollectionImage = useMutation({
    mutationFn: async ({ collectionId, optimizedUrl }: { collectionId: string; optimizedUrl: string }) => {
      const { error } = await supabase
        .from('shopify_collections')
        .update({ 
          image_url: optimizedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Image de collection appliquée');
      queryClient.invalidateQueries({ queryKey: ['collection-image-history'] });
    },
    onError: () => toast.error('Erreur lors de l\'application')
  });

  const applyArticleImage = useMutation({
    mutationFn: async ({ articleId, optimizedUrl }: { articleId: string; optimizedUrl: string }) => {
      const { error } = await supabase
        .from('blog_articles')
        .update({ 
          featured_image: optimizedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Image d\'article appliquée');
      queryClient.invalidateQueries({ queryKey: ['article-image-history'] });
    },
    onError: () => toast.error('Erreur lors de l\'application')
  });

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement démarré');
  };

  const handleApplyAll = async (productId: string) => {
    try {
      await applyAllOptimizedImages.mutateAsync({ productId });
    } catch (error) {
      console.error('Error applying all images:', error);
    }
  };

  const getOptimizationTypeLabel = (type: string) => {
    switch (type) {
      case 'white_background':
        return 'Fond blanc';
      case 'ai_background':
        return 'Fond IA';
      case 'ai_generated':
        return 'Généré par IA';
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
      case 'ai_generated':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'description':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const renderHistoryItem = (item: any, type: 'product' | 'collection' | 'article') => {
    let title = '';
    let onApply = null;

    if (type === 'product') {
      title = item.shopify_products?.title || 'Produit inconnu';
      
      // Combine product images and variant images
      const productImages = item.shopify_products?.product_images || [];
      const variants = item.shopify_products?.product_variants || [];
      
      onApply = (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={applyProductImage.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Appliquer</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
            {/* Product main images */}
            {productImages.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                  📸 Images produit principales
                </div>
                {productImages
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((img: any, idx: number) => (
                    <DropdownMenuItem
                      key={img.id}
                      onClick={() => applyProductImage.mutate({
                        historyId: item.id,
                        targetImageId: img.id,
                        optimizedUrl: item.optimized_url
                      })}
                      className="gap-3 py-3 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {img.src ? (
                          <img 
                            src={img.src} 
                            alt={`Image ${idx + 1}`}
                            className="w-12 h-12 rounded object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border-2 border-primary/20">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {idx === 0 ? '⭐ Image principale' : `Image ${idx + 1}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Position {img.position || idx + 1}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                }
              </>
            )}
            
            {/* Variant images */}
            {variants.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border-t-2 border-purple-100 mt-1 pt-2">
                  🎨 Variantes du produit
                </div>
                {variants
                  .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                  .map((variant: any) => {
                    return (
                      <DropdownMenuItem
                        key={variant.id}
                        onClick={async () => {
                          try {
                            // Update the variant's image_url directly
                            const { error } = await supabase
                              .from('product_variants')
                              .update({ image_url: item.optimized_url })
                              .eq('id', variant.id);

                            if (error) throw error;

                            // Mark this history version as current
                            await supabase
                              .from('product_image_history')
                              .update({ is_current: true })
                              .eq('id', item.id);

                            toast.success('Image appliquée à la variante avec succès');
                            queryClient.invalidateQueries({ queryKey: ['product-image-history'] });
                          } catch (error) {
                            console.error('Error applying image to variant:', error);
                            toast.error("Erreur lors de l'application de l'image");
                          }
                        }}
                        className="gap-3 py-3 hover:bg-purple-50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {variant.image_url ? (
                            <div className="relative">
                              <img 
                                src={variant.image_url} 
                                alt={variant.title}
                                className="w-12 h-12 rounded object-cover border-2 border-purple-300"
                              />
                              <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                V
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="w-12 h-12 rounded bg-purple-50 flex items-center justify-center border-2 border-purple-300 border-dashed">
                                <ImageIcon className="w-6 h-6 text-purple-400" />
                              </div>
                              <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                V
                              </div>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium line-clamp-1 text-sm text-purple-900">
                              🎨 {item.ai_prompt || variant.title}
                            </div>
                            <div className="text-xs text-purple-600">
                              Variante • {variant.image_url ? '✓ Avec image' : '○ Sans image'}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                }
              </>
            )}
            
            {productImages.length === 0 && variants.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune image disponible pour ce produit
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    } else if (type === 'collection') {
      title = item.shopify_collections?.title || 'Collection inconnue';
      onApply = (
        <Button
          variant="default"
          size="sm"
          disabled={applyCollectionImage.isPending}
          onClick={() => applyCollectionImage.mutate({
            collectionId: item.collection_id,
            optimizedUrl: item.optimized_url
          })}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Appliquer
        </Button>
      );
    } else {
      title = item.blog_articles?.title || 'Article inconnu';
      onApply = (
        <Button
          variant="default"
          size="sm"
          disabled={applyArticleImage.isPending}
          onClick={() => applyArticleImage.mutate({
            articleId: item.article_id,
            optimizedUrl: item.optimized_url
          })}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Appliquer
        </Button>
      );
    }

    return (
      <div
        key={item.id}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <div 
          className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer group"
          onClick={() => setPreviewImage({ 
            url: item.optimized_url, 
            title: title,
            type: getOptimizationTypeLabel(item.optimization_type)
          })}
        >
          <img
            src={item.optimized_url}
            alt="Optimized"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={getOptimizationTypeColor(item.optimization_type)}>
              {getOptimizationTypeLabel(item.optimization_type)}
            </Badge>
            {item.is_current && (
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                Actuelle
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Version {item.version_number}
            </span>
          </div>

          <p className="font-medium mb-1 truncate">{title}</p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
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

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(
              item.optimized_url, 
              `${title}-v${item.version_number}.png`
            )}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
          </Button>

          <div className="w-full sm:w-auto">
            {onApply}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupProductsByTitle = (items: any[]) => {
    return items?.reduce((acc, item) => {
      const title = item.shopify_products?.title || 'Produit inconnu';
      if (!acc[title]) acc[title] = [];
      acc[title].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const groupCollectionsByTitle = (items: any[]) => {
    return items?.reduce((acc, item) => {
      const title = item.shopify_collections?.title || 'Collection inconnue';
      if (!acc[title]) acc[title] = [];
      acc[title].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const groupArticlesByTitle = (items: any[]) => {
    return items?.reduce((acc, item) => {
      const title = item.blog_articles?.title || 'Article inconnu';
      if (!acc[title]) acc[title] = [];
      acc[title].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Historique des images IA</h1>
          <p className="text-muted-foreground">
            Retrouvez toutes vos images générées par IA et restaurez les versions précédentes
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-[400px]">
            <TabsTrigger value="products" className="flex items-center gap-2 text-sm md:text-base">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produits</span>
              <span className="sm:hidden">Prod.</span>
              <span className="text-xs">({(productHistory as any[])?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2 text-sm md:text-base">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Collections</span>
              <span className="sm:hidden">Coll.</span>
              <span className="text-xs">({(collectionHistory as any[])?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="articles" className="flex items-center gap-2 text-sm md:text-base">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Articles</span>
              <span className="sm:hidden">Art.</span>
              <span className="text-xs">({(articleHistory as any[])?.length || 0})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="space-y-4">
          {(() => {
            const grouped = groupProductsByTitle((productHistory as any[]) || []);
            return Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([title, items]: [string, any[]]) => {
                const firstItem = items[0];
                const productId = firstItem.product_id;
                
                return (
                  <Card key={title}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {title}
                          </CardTitle>
                          <CardDescription>
                            {items.length} optimisation{items.length > 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleApplyAll(productId)}
                          disabled={isOptimizing}
                          className="gap-2"
                          size="sm"
                        >
                          {isOptimizing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Application...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Appliquer tout et synchroniser
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item) => renderHistoryItem(item, 'product'))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun historique de produit</p>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          {(() => {
            const grouped = groupCollectionsByTitle((collectionHistory as any[]) || []);
            return Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([title, items]: [string, any[]]) => (
                <Card key={title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" />
                      {title}
                    </CardTitle>
                    <CardDescription>
                      {items.length} optimisation{items.length > 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => renderHistoryItem(item, 'collection'))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun historique de collection</p>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          {(() => {
            const grouped = groupArticlesByTitle((articleHistory as any[]) || []);
            return Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([title, items]: [string, any[]]) => (
                <Card key={title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {title}
                    </CardTitle>
                    <CardDescription>
                      {items.length} optimisation{items.length > 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => renderHistoryItem(item, 'article'))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun historique d'article</p>
                </CardContent>
              </Card>
            );
          })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {previewImage?.title}
            </DialogTitle>
            <DialogDescription>
              Type: {previewImage?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full bg-muted rounded-lg overflow-hidden">
            <img
              src={previewImage?.url}
              alt={previewImage?.title}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (previewImage?.url) {
                  window.open(previewImage.url, '_blank');
                }
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir dans un nouvel onglet
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (previewImage?.url) {
                  const link = document.createElement('a');
                  link.href = previewImage.url;
                  link.download = `optimized-${Date.now()}.jpg`;
                  link.click();
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
