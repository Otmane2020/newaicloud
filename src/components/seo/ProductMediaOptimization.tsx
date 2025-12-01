import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { PlanUpgradeDialog } from '@/components/dashboard/PlanUpgradeDialog';

interface ProductImage {
  id: string;
  src: string;
  position: number;
  product_id?: string;
}

interface ProductWithImages {
  id: string;
  title: string;
  shopify_id?: number | null;
  product_images: ProductImage[];
}

export const ProductMediaOptimization = () => {
  const { selectedStore } = useStore();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [showWhiteBgPreview, setShowWhiteBgPreview] = useState(false);
  const [whiteBgResult, setWhiteBgResult] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [backgroundVariants, setBackgroundVariants] = useState<any[]>([]);
  const [showVariantsSelector, setShowVariantsSelector] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  // 🆕 Format selection state
  const [selectedFormat, setSelectedFormat] = useState<'square' | 'portrait' | 'landscape'>('square');
  const [selectedMode, setSelectedMode] = useState<'standard' | 'google_shopping'>('google_shopping');

  const { limits, loading: limitsLoading } = useUsageLimits();

  const {
    isOptimizing,
    generateWhiteBackground,
    generateAIBackgroundVariants,
    applyOptimizedImage
  } = useImageOptimization();

  // Load products with images filtered by store
  const { data: products, isLoading } = useQuery({
    queryKey: ['products-with-images', selectedStore?.id],
    queryFn: async (): Promise<ProductWithImages[]> => {
      if (!selectedStore?.id) return [];

      try {
        const userResponse: any = await (supabase as any).auth.getUser();
        const user = userResponse?.data?.user;
        if (!user) throw new Error('Not authenticated');

        // Load products filtered by store
        const productsResponse: any = await (supabase as any)
          .from('shopify_products')
          .select('id, title, shopify_id')
          .eq('seller_id', user.id)
          .eq('store_id', selectedStore.id)
          .order('title');

        if (productsResponse.error) throw productsResponse.error;
        if (!productsResponse.data) return [];

        const productsData = productsResponse.data as Array<{ id: string; title: string; shopify_id?: number | null }>;
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
          shopify_id: product.shopify_id,
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
    // ✅ Vérifier les limites AVANT de générer
    if (!limits?.canUseOptimizations) {
      setShowUpgradeDialog(true);
      toast.error('Limite d\'optimisations atteinte. Passez à un plan supérieur.');
      return;
    }

    const product = products?.find(p => p.id === image.product_id);
    if (!product) return;

    try {
      // 🆕 Fetch SERP and Vision AI data for enrichment
      let serpData = null;
      let visionAiData = null;
      let productDescription = null;
      
      // Fetch product details including SERP data and vision attributes
      const { data: productDetails } = await supabase
        .from('shopify_products')
        .select('body_html, seo_description, serp_data, vision_attributes')
        .eq('id', product.id)
        .single();
      
      if (productDetails) {
        serpData = productDetails.serp_data;
        visionAiData = productDetails.vision_attributes;
        productDescription = productDetails.body_html || productDetails.seo_description;
        console.log('🔍 [WhiteBg] Enrichment data loaded:', {
          hasSerpData: !!serpData,
          hasVisionData: !!visionAiData,
          hasDescription: !!productDescription
        });
      }
      
      // If no SERP data, try to fetch it
      if (!serpData) {
        try {
          console.log('🔍 [WhiteBg] Fetching SERP data for product:', product.title);
          const { data: serpResult } = await supabase.functions.invoke('search-similar-products-specs', {
            body: { productTitle: product.title, limit: 5 }
          });
          
          // ✅ FIX: serpResult returns data directly, NOT wrapped in {success, data}
          if (serpResult?.similarProducts || serpResult?.averageWeight || serpResult?.averageDimensions) {
            serpData = {
              dimensions: serpResult.averageDimensions 
                ? `${serpResult.averageDimensions.length || ''} x ${serpResult.averageDimensions.width || ''} x ${serpResult.averageDimensions.height || ''}`.replace(/\s+x\s+x\s+/g, '').trim()
                : null,
              weight: serpResult.averageWeight,
              materials: serpResult.similarProducts?.flatMap((p: any) => p.materials || []).slice(0, 3) || [],
              dominantStyles: serpResult.similarProducts?.flatMap((p: any) => p.style ? [p.style] : []).slice(0, 2) || [],
              confidence: serpResult.confidence
            };
            console.log('✅ [WhiteBg] SERP data formatted:', JSON.stringify(serpData).slice(0, 200));
          } else {
            console.log('⚠️ [WhiteBg] SERP returned but no usable data:', JSON.stringify(serpResult || {}).slice(0, 200));
          }
        } catch (serpError) {
          console.log('⚠️ [WhiteBg] SERP fetch failed, continuing without:', serpError);
        }
      }

      const result = await generateWhiteBackground.mutateAsync({
        imageUrl: image.src,
        productTitle: product.title,
        resolution: '2000x2000',
        format: selectedFormat,
        mode: selectedMode,
        product_id: product.id,
        serpData,
        visionAiData,
        productDescription
      });

      if (result.imageUrl) {
        setWhiteBgResult(result.imageUrl);
        setSelectedImage(image);
        setShowWhiteBgPreview(true);
      }
    } catch (error) {
      console.error('Error generating white background:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('LIMIT_REACHED') || errorMessage.includes('429')) {
        setShowUpgradeDialog(true);
        toast.error('Limite d\'optimisations atteinte');
      } else {
        toast.error('Erreur lors de la génération du fond blanc');
      }
    }
  };

  const handleApplyWhiteBackground = async () => {
    if (!selectedImage || !whiteBgResult) return;

    // ✅ CRITICAL: Validate product_id exists before proceeding
    const productId = selectedImage.product_id;
    if (!productId) {
      console.error('❌ [WhiteBg] Missing product_id on selected image');
      toast.error('Erreur: Image sans produit associé');
      return;
    }

    const product = products?.find(p => p.id === productId);
    if (!product) {
      console.error('❌ [WhiteBg] Product not found for id:', productId);
      toast.error('Erreur: Produit non trouvé');
      return;
    }

    console.log(`🎨 [WhiteBg] Applying white background for product:`, {
      productId,
      productTitle: product.title,
      imageId: selectedImage.id,
      optimizedUrl: whiteBgResult.substring(0, 100) + '...'
    });

    try {
      // ✅ STEP 1: Apply image locally and save to history
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId: productId, // Now guaranteed to be string
        optimizedUrl: whiteBgResult,
        originalUrl: selectedImage.src,
        optimizationType: 'white_background',
        aiModel: 'gemini-2.5-flash-image-preview',
        resolution: '2000x2000',
        qualityScore: 95
      });

      console.log('✅ [WhiteBg] applyOptimizedImage completed - image should be saved to history');

      console.log(`✅ [WhiteBg] Image applied locally, now syncing to Shopify...`);

      // ✅ STEP 2: Sync with Shopify and handle different scenarios
      let syncErrors = 0;
      let syncBlocked = 0;
      let syncPartial = 0;
      let syncSkipped = 0;
      let syncOk = 0;

      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-product-images-to-shopify', {
          body: { productId: selectedImage.product_id }
        });

        console.log(`🔍 [WhiteBg] Shopify sync response:`, {
          hasError: !!syncError,
          hasData: !!syncData,
          syncData,
          syncError
        });

        if (syncError) {
          console.error(`❌ [WhiteBg] Shopify sync error (technical):`, syncError);
          syncErrors++;
        } else if (syncData?.requiresUpgrade || syncData?.error === 'upgrade_required') {
          console.log(`🚫 [WhiteBg] Shopify sync blocked - trial user`);
          syncBlocked++;
        } else if (syncData?.skipped) {
          console.log(`⏭️ [WhiteBg] Sync skipped for product (no shopify_product_id)`);
          syncSkipped++;
        } else if (syncData?.error) {
          console.warn(`⚠️ [WhiteBg] Shopify sync partial error:`, syncData.error);
          syncPartial++;
        } else {
          console.log(`✅ [WhiteBg] Shopify sync successful`);
          syncOk++;
        }
      } catch (syncException) {
        console.error(`❌ [WhiteBg] Shopify sync exception:`, syncException);
        syncErrors++;
      }

      // ✅ STEP 3: Display conditional toasts based on sync results
      if (syncErrors > 0) {
        toast.error('Erreur de synchronisation Shopify', {
          description: 'Image appliquée localement seulement. Vérifiez votre connexion Shopify.',
          action: {
            label: '⚙️ Paramètres',
            onClick: () => window.location.href = '/settings/integrations'
          },
          duration: 8000
        });
      } else if (syncBlocked > 0) {
        toast.warning('Synchronisation limitée', {
          description: 'Image appliquée localement. Upgradez pour synchroniser avec Shopify.',
          action: {
            label: '✨ Voir les plans',
            onClick: () => window.location.href = '/subscription'
          },
          duration: 10000
        });
      } else if (syncPartial > 0) {
        toast.warning('Synchronisation partielle', {
          description: 'Image appliquée localement. Certaines images n\'ont pas été synchronisées avec Shopify.',
          duration: 6000
        });
      } else if (syncSkipped > 0) {
        toast.warning('Image appliquée localement uniquement', {
          description: 'Le produit n\'est pas encore synchronisé avec Shopify (aucun ID Shopify).',
          duration: 8000,
        });
      } else if (syncOk > 0) {
        toast.success('Image appliquée et synchronisée', {
          description: 'Votre boutique Shopify est à jour'
        });
      }

      setShowWhiteBgPreview(false);
      setWhiteBgResult(null);
      setSelectedImage(null);
    } catch (error) {
      console.error('❌ [WhiteBg] Error applying white background:', error);
      toast.error('Erreur lors de l\'application de l\'image');
    }
  };

  const handleGenerateAIBackgrounds = async (image: ProductImage) => {
    // ✅ Vérifier les limites AVANT de générer
    if (!limits?.canUseOptimizations) {
      setShowUpgradeDialog(true);
      toast.error('Limite d\'optimisations atteinte. Passez à un plan supérieur.');
      return;
    }

    const product = products?.find(p => p.id === image.product_id);
    if (!product) return;

    try {
      const result = await generateAIBackgroundVariants.mutateAsync({
        productTitle: product.title,
        basePrompt: aiPrompt,
        style: 'professional',
        format: selectedFormat // 🆕 Use selected format
      });

      if (result.variants && result.variants.length > 0) {
        setBackgroundVariants(result.variants);
        setSelectedImage(image);
        setShowVariantsSelector(true);
      }
    } catch (error) {
      console.error('Error generating AI backgrounds:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('LIMIT_REACHED') || errorMessage.includes('429')) {
        setShowUpgradeDialog(true);
        toast.error('Limite d\'optimisations atteinte');
      } else {
        toast.error('Erreur lors de la génération des arrière-plans IA');
      }
    }
  };

  const handleApplyVariant = async (variantId: string) => {
    if (!selectedImage) return;

    // ✅ CRITICAL: Validate product_id exists
    const productId = selectedImage.product_id;
    if (!productId) {
      console.error('❌ [AIVariant] Missing product_id on selected image');
      toast.error('Erreur: Image sans produit associé');
      return;
    }

    const variant = backgroundVariants.find(v => v.variantId === variantId);
    if (!variant) return;

    try {
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId: productId, // Now guaranteed to be string
        optimizedUrl: variant.imageUrl,
        originalUrl: selectedImage.src,
        optimizationType: 'ai_background',
        aiModel: 'gemini-2.5-flash-image-preview',
        aiPrompt: variant.prompt,
        resolution: variant.resolution || '2000x2000',
        qualityScore: variant.qualityScore
      });

      console.log('✅ [AIVariant] applyOptimizedImage completed - image should be saved to history');

      setShowVariantsSelector(false);
      setBackgroundVariants([]);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error applying variant:', error);
      toast.error('Erreur lors de l\'application de la variante');
    }
  };

  const handleDownloadHD = (imageUrl: string, filename: string = 'optimized-image-2000px.png') => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement HD démarré (2000x2000px)');
  };

  const handleDownloadWhiteBg = () => {
    if (whiteBgResult) {
      handleDownloadHD(whiteBgResult, `white-bg-${selectedImage?.id}-2000px.png`);
    }
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
            <p className="text-sm text-muted-foreground mb-4">
              Générez des photos produits professionnelles sur fond blanc pur. Parfait pour Google Shopping et marketplaces.
            </p>
            
            {/* 🆕 Format and Mode Selection */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Carré (1:1)</SelectItem>
                    <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                    <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <Select value={selectedMode} onValueChange={(v) => setSelectedMode(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_shopping">Google Shopping</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            {/* 🆕 Format Selection for AI Backgrounds */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Format de sortie</label>
              <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1:1) - 2000x2000px</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4) - 1500x2000px</SelectItem>
                  <SelectItem value="landscape">Paysage (4:3) - 2000x1500px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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

      {/* White Background Preview Dialog - RESPONSIVE */}
      {showWhiteBgPreview && selectedImage && whiteBgResult && (
        <Dialog open={showWhiteBgPreview} onOpenChange={setShowWhiteBgPreview}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[95vw] sm:max-w-3xl md:max-w-4xl h-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Fond Blanc HD - Résolution 2000x2000px</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Comparez l'image originale avec le fond blanc généré
              </DialogDescription>
            </DialogHeader>

            {/* Shopify Status Alert */}
            {(() => {
              const product = products?.find(p => p.id === selectedImage.product_id);
              return !product?.shopify_id ? (
                <Alert className="mb-3 sm:mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-xs sm:text-sm">⚠️ Produit non synchronisé avec Shopify - L'optimisation sera locale uniquement</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.location.href = '/products'}
                      className="text-xs"
                    >
                      Synchroniser
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium">Original</p>
                <div className="relative w-full rounded-lg overflow-hidden border bg-muted" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  <img 
                    src={selectedImage.src} 
                    alt="Original" 
                    className="w-full h-auto max-h-[400px] object-contain mx-auto" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium">Fond Blanc HD</p>
                <div className="relative w-full rounded-lg overflow-hidden border bg-white" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  <img 
                    src={whiteBgResult} 
                    alt="Optimized" 
                    className="w-full h-auto max-h-[400px] object-contain mx-auto" 
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0 pt-3 sm:pt-4">
              <Button
                variant="outline"
                onClick={handleDownloadWhiteBg}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger HD
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowWhiteBgPreview(false)}
                  className="w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleApplyWhiteBackground}
                  disabled={applyOptimizedImage.isPending}
                  className="w-full sm:w-auto"
                >
                  {applyOptimizedImage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Application...
                    </>
                  ) : (
                    'Appliquer'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Background Variants Selector */}
      {showVariantsSelector && selectedImage && backgroundVariants.length > 0 && (
        <Dialog open={showVariantsSelector} onOpenChange={setShowVariantsSelector}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>4 Variantes d'Arrière-plans IA - Résolution HD</DialogTitle>
              <DialogDescription>
                Sélectionnez votre variante préférée. Chaque image est générée en 2000x2000px avec le produit parfaitement centré.
              </DialogDescription>
            </DialogHeader>
            <BackgroundVariantSelector
              variants={backgroundVariants}
              originalImage={selectedImage.src}
              onSelect={(id) => console.log('Selected:', id)}
              onApply={handleApplyVariant}
              onDownloadHD={(variantId, imageUrl) => handleDownloadHD(imageUrl, `ai-bg-${variantId}-2000px.png`)}
              isApplying={applyOptimizedImage.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Plan Upgrade Dialog */}
      <PlanUpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlanId={limits?.currentPlanId || 'trial'}
        onSuccess={() => {
          setShowUpgradeDialog(false);
          toast.success('Plan mis à jour avec succès !');
        }}
      />
    </div>
  );
};
