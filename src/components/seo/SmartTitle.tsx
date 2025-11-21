import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const SmartTitle = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-smart-title'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          product_type,
          optimization_count,
          product_images (
            id,
            src,
            position
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async (productId: string) => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('smart-title', {
        body: { productId, language: 'fr' },
      });

      if (error) throw error;

      setResult(data);
      toast.success('Titre optimisé généré avec succès!');
    } catch (error) {
      console.error('Smart title error:', error);
      toast.error('Erreur lors de la génération du titre');
    } finally {
      setIsGenerating(false);
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
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Smart Title Generator</h2>
      </div>

      <p className="text-muted-foreground">
        Génération intelligente de titres optimisés combinant l'analyse visuelle (Gemini) et textuelle (DeepSeek)
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
          </div>
        </Card>
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
                      Générer
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
