import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Eye,
  Smartphone,
  Monitor,
  Info,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Product {
  id: string;
  title: string;
  description: string | null;
  images: Array<{ src: string }>;
}

export const ProductContentOptimization = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showOptimizingDialog, setShowOptimizingDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [syncProgress, setSyncProgress] = useState(0);
  const queryClient = useQueryClient();

  const { generateProductDescription } = useImageOptimization();

  // Load products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-content'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const userResponse: any = await (supabase as any).auth.getUser();
        const user = userResponse?.data?.user;
        if (!user) throw new Error('Not authenticated');

        const productsResponse: any = await (supabase as any)
          .from('shopify_products')
          .select('id, title, description')
          .eq('user_id', user.id)
          .order('title');

        if (productsResponse.error) throw productsResponse.error;
        if (!productsResponse.data) return [];

        const productsData = productsResponse.data as Array<{ id: string; title: string; description: string | null }>;

        // Load images
        const imagesResponse: any = await (supabase as any)
          .from('product_images')
          .select('product_id, src')
          .in('product_id', productsData.map((p: any) => p.id))
          .order('position');

        const imagesData = (imagesResponse.data || []) as Array<{ product_id: string; src: string }>;

        return productsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          images: imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => ({ src: img.src }))
        }));
      } catch (error) {
        console.error('Error loading products:', error);
        return [];
      }
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products?.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      setShowOptimizingDialog(true);

      // Analyze images with Vision AI if needed
      let visionAnalysis = null;
      if (product.images.length > 0 && !product.description) {
        const { data: visionData } = await supabase.functions.invoke('analyze-image-with-vision', {
          body: { imageUrl: product.images[0].src }
        });
        visionAnalysis = visionData?.attributes;
      }

      const result = await generateProductDescription.mutateAsync({
        title: product.title,
        existingDescription: product.description || undefined,
        images: product.images.map(img => img.src),
        visionAnalysis
      });

      return result;
    },
    onSuccess: (data, productId) => {
      setGeneratedHtml(data.htmlDescription);
      const product = products?.find(p => p.id === productId);
      setSelectedProduct(product || null);
      setShowOptimizingDialog(false);
      setShowPreview(true);
      queryClient.invalidateQueries({ queryKey: ['products-for-content'] });
    },
    onError: (error) => {
      console.error('Error generating description:', error);
      setShowOptimizingDialog(false);
      toast.error('Erreur lors de la génération');
    }
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !generatedHtml) throw new Error('No content to apply');

      const { error } = await supabase
        .from('shopify_products')
        .update({ 
          description: generatedHtml,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      // Increment optimization count
      await supabase.rpc('increment_usage', {
        p_seller_id: (await supabase.auth.getUser()).data.user?.id,
        p_field: 'optimizations_count',
        p_increment: 1
      });
    },
    onSuccess: async () => {
      setShowPreview(false);
      setShowSyncDialog(true);
      queryClient.invalidateQueries({ queryKey: ['products-for-content'] });
      
      // Lancer automatiquement la synchronisation Shopify
      await syncToShopify();
    },
    onError: (error) => {
      console.error('Error applying description:', error);
      toast.error('Erreur lors de l\'application');
    }
  });

  const syncToShopify = async () => {
    if (!selectedProduct) return;

    try {
      setSyncProgress(30);
      
      const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
        body: { 
          productIds: [selectedProduct.id],
          syncType: 'description'
        }
      });

      setSyncProgress(70);

      if (error) throw error;

      setSyncProgress(100);
      
      setTimeout(() => {
        setShowSyncDialog(false);
        setSyncProgress(0);
        setGeneratedHtml(null);
        setSelectedProduct(null);
        toast.success('Synchronisation Shopify terminée');
      }, 1000);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur lors de la synchronisation');
      setSyncProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Générez des descriptions HTML UX haute qualité, mobile-friendly avec intégration automatique des photos produits et analyse vision IA.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Génération de Descriptions UX
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Créez des descriptions HTML professionnelles et engageantes avec mise en page optimisée pour mobile.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map(product => (
            <Card key={product.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {product.images[0] && (
                  <div className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img 
                      src={product.images[0].src} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-sm line-clamp-2 mb-2">{product.title}</h4>
                  
                  {product.description ? (
                    <Badge variant="secondary" className="mb-2">
                      <FileText className="h-3 w-3 mr-1" />
                      Description existante
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mb-2">
                      Pas de description
                    </Badge>
                  )}

                  {product.images.length > 0 ? (
                    <Badge variant="secondary">
                      {product.images.length} photo{product.images.length > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pas d'image</Badge>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate(product.id)}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer HTML UX
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {products && products.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Aucun produit</h3>
            <p className="text-sm text-muted-foreground">
              Importez des produits depuis Shopify pour commencer
            </p>
          </div>
        )}
      </Card>

      {/* Optimizing Dialog */}
      <Dialog open={showOptimizingDialog} onOpenChange={setShowOptimizingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Optimisation en cours
            </DialogTitle>
            <DialogDescription>
              Génération de la description HTML UX avec analyse Vision IA...
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Analyse des images et création d'une présentation mobile-friendly haute qualité
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation Landing Page Shopify - {selectedProduct?.title}</DialogTitle>
            <DialogDescription>
              Description HTML UX générée avec IA - Mobile-friendly et optimisée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Mode Toggle */}
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="desktop">
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desktop" className="space-y-4">
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: generatedHtml || '' }} />
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4">
                <div className="max-w-md mx-auto border rounded-lg p-4 bg-white min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: generatedHtml || '' }} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Original Description Comparison */}
            {selectedProduct?.description && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Description originale:</h4>
                <div className="p-4 bg-muted rounded-lg text-sm">
                  {selectedProduct.description}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Application...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Mettre à jour sur Shopify
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncProgress === 100 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Synchronisation terminée
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Synchronisation Shopify
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {syncProgress === 100 
                ? 'Votre description a été mise à jour avec succès sur Shopify'
                : 'Mise à jour de la description sur votre boutique Shopify...'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <Progress value={syncProgress} className="w-full" />
            <div className="flex items-center justify-center">
              {syncProgress === 100 ? (
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              ) : (
                <Upload className="h-16 w-16 text-primary animate-pulse" />
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {syncProgress === 100 
                ? 'Vos modifications sont maintenant visibles sur Shopify'
                : 'Synchronisation en cours avec Shopify...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
