import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";

export const SmartTitle = () => {
  const { selectedStore } = useStore();
  const storeId = selectedStore?.id;
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: productsData, isLoading } = useQuery({
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
      const { error } = await supabase
        .from('shopify_products')
        .update({ title: optimizedTitle })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Titre optimisé appliqué avec succès!');
      setResult(null);
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

      {result && (
        <Card className="p-6 bg-primary/5 border-primary">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Titre original</p>
              <p className="text-lg line-through opacity-60">{result.originalTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Titre optimisé</p>
              <p className="text-xl font-bold text-primary">{result.optimizedTitle}</p>
            </div>
            {result.deepseekAnalysis && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Analyse DeepSeek:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{result.deepseekAnalysis.category}</Badge>
                  {result.deepseekAnalysis.materials?.map((m: string, i: number) => (
                    <Badge key={i} variant="outline">{m}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleApply(result.productId, result.optimizedTitle)}
                className="flex-1"
              >
                Appliquer le titre
              </Button>
              <Button
                variant="outline"
                onClick={() => setResult(null)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}

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
