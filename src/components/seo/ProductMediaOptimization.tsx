import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Image as ImageIcon, 
  Palette, 
  History, 
  Loader2, 
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { ImageHistoryPanel } from './ImageHistoryPanel';
import { BackgroundVariantSelector } from './BackgroundVariantSelector';
import { SingleImagePreviewDialog } from './SingleImagePreviewDialog';

interface ProductImage {
  id: string;
  src: string;
  position: number;
  product_id?: string;
}

interface ProductWithImages {
  id: string;
  title: string;
  product_images: ProductImage[];
}

export const ProductMediaOptimization = () => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [showWhiteBgPreview, setShowWhiteBgPreview] = useState(false);
  const [whiteBgResult, setWhiteBgResult] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [backgroundVariants, setBackgroundVariants] = useState<any[]>([]);
  const [showVariantsSelector, setShowVariantsSelector] = useState(false);

  const {
    isOptimizing,
    generateWhiteBackground,
    generateAIBackgroundVariants,
    applyOptimizedImage
  } = useImageOptimization();

  // Load products with images
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-with-images'],
    queryFn: async (): Promise<ProductWithImages[]> => {
      try {
        const userResponse: any = await (supabase as any).auth.getUser();
        const user = userResponse?.data?.user;
        if (!user) throw new Error('Not authenticated');

        // Load products - using any to avoid TS infinite type recursion
        const productsResponse: any = await (supabase as any)
          .from('shopify_products')
          .select('id, title')
          .eq('user_id', user.id)
          .order('title');

        if (productsResponse.error) throw productsResponse.error;
        if (!productsResponse.data) return [];

        const productsData = productsResponse.data as Array<{ id: string; title: string }>;
        if (productsData.length === 0) return [];

        // Load images for all products
        const imagesResponse: any = await (supabase as any)
          .from('product_images')
          .select('id, src, position, product_id')
          .in('product_id', productsData.map((p: any) => p.id))
          .order('position');

        if (imagesResponse.error) throw imagesResponse.error;

        const imagesData = (imagesResponse.data || []) as ProductImage[];

        // Combine data
        const result: ProductWithImages[] = productsData.map((product: any) => ({
          id: product.id,
          title: product.title,
          product_images: imagesData.filter((img: any) => img.product_id === product.id)
        }));

        return result;
      } catch (error) {
        console.error('Error loading products:', error);
        return [];
      }
    }
  });

  const handleGenerateWhiteBackground = async (image: ProductImage) => {
    const product = products?.find(p => p.id === image.product_id);
    if (!product) return;

    try {
      const result = await generateWhiteBackground.mutateAsync({
        imageUrl: image.src,
        productTitle: product.title,
        resolution: '2000x2000'
      });

      if (result.imageUrl) {
        setWhiteBgResult(result.imageUrl);
        setSelectedImage(image);
        setShowWhiteBgPreview(true);
      }
    } catch (error) {
      console.error('Error generating white background:', error);
      toast.error('Erreur lors de la génération du fond blanc');
    }
  };

  const handleApplyWhiteBackground = async () => {
    if (!selectedImage || !whiteBgResult) return;

    const product = products?.find(p => p.id === selectedImage.product_id);
    if (!product) return;

    try {
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId: selectedImage.product_id,
        optimizedUrl: whiteBgResult,
        originalUrl: selectedImage.src,
        optimizationType: 'white_background',
        aiModel: 'gemini-2.5-flash-image-preview',
        resolution: '2000x2000',
        qualityScore: 95
      });

      setShowWhiteBgPreview(false);
      setWhiteBgResult(null);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error applying white background:', error);
    }
  };

  const handleGenerateAIBackgrounds = async (image: ProductImage) => {
    const product = products?.find(p => p.id === image.product_id);
    if (!product) return;

    try {
      const result = await generateAIBackgroundVariants.mutateAsync({
        imageUrl: image.src,
        productTitle: product.title,
        basePrompt: aiPrompt
      });

      if (result.variants && result.variants.length > 0) {
        setBackgroundVariants(result.variants);
        setSelectedImage(image);
        setShowVariantsSelector(true);
      }
    } catch (error) {
      console.error('Error generating AI backgrounds:', error);
    }
  };

  const handleApplyVariant = async (variantId: string) => {
    if (!selectedImage) return;

    const variant = backgroundVariants.find(v => v.variantId === variantId);
    if (!variant) return;

    try {
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId: selectedImage.product_id,
        optimizedUrl: variant.imageUrl,
        originalUrl: selectedImage.src,
        optimizationType: 'ai_background',
        aiModel: 'gemini-2.5-flash-image-preview',
        aiPrompt: variant.prompt,
        resolution: variant.resolution || '2000x2000',
        qualityScore: variant.qualityScore
      });

      setShowVariantsSelector(false);
      setBackgroundVariants([]);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error applying variant:', error);
    }
  };

  const handleDownloadHD = (variantId: string, imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-background-${variantId}-2000px.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement HD démarré');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalImages = products?.reduce((sum, p) => sum + (p.product_images?.length || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalImages}</p>
              <p className="text-sm text-muted-foreground">Images totales</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Produits</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <History className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Versions sauvegardées</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">2000px</p>
              <p className="text-sm text-muted-foreground">Résolution HD</p>
            </div>
          </div>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Optimisez vos images produits avec l'IA. Toutes les versions sont sauvegardées dans l'historique et peuvent être restaurées.
        </AlertDescription>
      </Alert>

      {/* Product Images Grid */}
      <Tabs defaultValue="white-bg" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="white-bg">
            <ImageIcon className="h-4 w-4 mr-2" />
            Fond Blanc
          </TabsTrigger>
          <TabsTrigger value="ai-bg">
            <Palette className="h-4 w-4 mr-2" />
            Arrière-plan IA
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="white-bg" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Génération de Fond Blanc HD</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Générez des photos produits professionnelles sur fond blanc pur en résolution 2000x2000px. 
              Parfait pour Google Shopping et marketplaces.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products?.map(product => 
                product.product_images?.map((image: ProductImage) => (
                  <Card key={image.id} className="overflow-hidden group">
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={image.src}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateWhiteBackground(image)}
                          disabled={isOptimizing}
                        >
                          {isOptimizing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Générer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{product.title}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai-bg" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Génération d'Arrière-plans IA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Générez 4 variantes d'arrière-plans créatifs pour vos produits. L'IA centre automatiquement le produit.
            </p>

            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Prompt personnalisé (optionnel)</label>
              <Input
                placeholder="Ex: Luxueux, lifestyle moderne, ambiance chaleureuse..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products?.map(product =>
                product.product_images?.map((image: ProductImage) => (
                  <Card key={image.id} className="overflow-hidden group">
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={image.src}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateAIBackgrounds(image)}
                          disabled={isOptimizing}
                        >
                          {isOptimizing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Palette className="h-4 w-4 mr-2" />
                              4 Variantes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{product.title}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {selectedImage ? (
            <ImageHistoryPanel
              imageId={selectedImage.id}
              productId={selectedImage.product_id}
            />
          ) : (
            <Card className="p-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Sélectionnez une image</h3>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une image dans les onglets "Fond Blanc" ou "Arrière-plan IA" 
                pour voir son historique d'optimisations.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* White Background Preview Dialog */}
      {showWhiteBgPreview && selectedImage && whiteBgResult && (
        <SingleImagePreviewDialog
          open={showWhiteBgPreview}
          onOpenChange={setShowWhiteBgPreview}
          originalImage={selectedImage.src}
          optimizedImage={whiteBgResult}
          onApply={handleApplyWhiteBackground}
          isApplying={applyOptimizedImage.isPending}
        />
      )}

      {/* AI Background Variants Selector */}
      {showVariantsSelector && selectedImage && backgroundVariants.length > 0 && (
        <Card className="fixed inset-4 z-50 overflow-auto p-6">
          <BackgroundVariantSelector
            variants={backgroundVariants}
            originalImage={selectedImage.src}
            onSelect={(id) => console.log('Selected:', id)}
            onApply={handleApplyVariant}
            onDownloadHD={handleDownloadHD}
            isApplying={applyOptimizedImage.isPending}
          />
          <Button
            variant="ghost"
            className="absolute top-4 right-4"
            onClick={() => setShowVariantsSelector(false)}
          >
            Fermer
          </Button>
        </Card>
      )}
    </div>
  );
};
