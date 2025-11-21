import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight, Eye, Brain, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";

export const SmartTitle = () => {
  const { selectedStore } = useStore();
  const storeId = selectedStore?.id;
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products-for-smart-title', storeId, page],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get total count
      const { count } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('store_id', storeId);

      // Get paginated products
      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          product_type,
          body_html,
          optimization_count,
          product_images (
            id,
            src,
            position
          )
        `)
        .eq('seller_id', user.id)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { products: data, totalCount: count || 0 };
    },
    enabled: !!storeId,
  });

  const products = productsData?.products;
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleGenerate = async (productId: string) => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('smart-title', {
        body: { productId, language: 'fr' },
      });

      if (error) throw error;

      setResult(data);
      setIsPreviewOpen(true);
      toast.success('Aperçu du titre optimisé généré!');
    } catch (error) {
      console.error('Smart title error:', error);
      toast.error('Erreur lors de la génération de l\'aperçu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async (productId: string, optimizedTitle: string) => {
    try {
      // First get current product data
      const { data: currentProduct } = await supabase
        .from('shopify_products')
        .select('optimization_count')
        .eq('id', productId)
        .single();

      const { error } = await supabase
        .from('shopify_products')
        .update({ 
          title: optimizedTitle,
          optimization_count: (currentProduct?.optimization_count || 0) + 1,
          last_optimization_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Titre optimisé appliqué avec succès!');
      setResult(null);
      setIsPreviewOpen(false);
      refetch();
    } catch (error) {
      console.error('Apply title error:', error);
      toast.error('Erreur lors de l\'application du titre');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Smart Title Generator</h2>
        </div>
        <Badge variant="secondary">
          {totalCount} produits avec images
        </Badge>
      </div>

      <p className="text-muted-foreground">
        Génération intelligente de titres optimisés combinant l'analyse visuelle (Gemini Vision) et textuelle (DeepSeek)
      </p>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Aperçu du titre optimisé</DialogTitle>
            <DialogDescription>
              Analyse complète par IA pour optimiser votre titre produit
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-6">
              {/* Section 1: Comparaison des titres */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Titre actuel
                </h3>
                <p className="text-sm line-through opacity-60">
                  {result.originalTitle}
                </p>
                
                <h3 className="font-semibold text-sm text-primary mt-4">
                  Titre optimisé proposé
                </h3>
                <p className="text-xl font-bold text-primary">
                  {result.optimizedTitle}
                </p>
              </div>

              <Separator />

              {/* Section 2: Analyse visuelle Gemini */}
              {result.visionAnalysis && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Analyse visuelle Gemini</h3>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.visionAnalysis}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Section 3: Analyse textuelle DeepSeek */}
              {result.deepseekAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Analyse textuelle DeepSeek</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Catégorie */}
                    {result.deepseekAnalysis.category && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Catégorie:
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {result.deepseekAnalysis.category}
                        </Badge>
                      </div>
                    )}

                    {/* Matériaux */}
                    {result.deepseekAnalysis.materials?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Matériaux:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.deepseekAnalysis.materials.map((material: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Caractéristiques */}
                    {result.deepseekAnalysis.features?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Caractéristiques:
                        </span>
                        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                          {result.deepseekAnalysis.features.map((feature: string, idx: number) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Points de vente */}
                    {result.deepseekAnalysis.selling_points?.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Points de vente:
                        </span>
                        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                          {result.deepseekAnalysis.selling_points.map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Use case */}
                    {result.deepseekAnalysis.use_case && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Cas d'usage:
                        </span>
                        <p className="text-sm mt-1">{result.deepseekAnalysis.use_case}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (result?.productId && result?.optimizedTitle) {
                  handleApply(result.productId, result.optimizedTitle);
                }
              }}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Appliquer ce titre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || isLoading}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product: any) => {
          const primaryImage = product.product_images?.[0];
          
          return (
            <Card
              key={product.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedProduct === product.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedProduct(product.id)}
            >
              <div className="space-y-3">
                {primaryImage ? (
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={primaryImage.src}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div>
                  <h3 className="font-semibold line-clamp-2 text-sm">
                    {product.title}
                  </h3>
                  {product.product_type && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {product.product_type}
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate(product.id);
                  }}
                  disabled={isGenerating}
                  className="w-full"
                  size="sm"
                >
                  {isGenerating && selectedProduct === product.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Aperçu
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
