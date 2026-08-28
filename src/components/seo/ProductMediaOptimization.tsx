import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, Palette, History, Loader2, Sparkles, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { ImageHistoryPanel } from './ImageHistoryPanel';
import { BackgroundVariantSelector } from './BackgroundVariantSelector';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { PlanUpgradeDialog } from '@/components/dashboard/PlanUpgradeDialog';
import { useTranslation } from '@/lib/language';
import { translateImageGenerationError } from '@/lib/imageUiTranslations';

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
  const { language } = useTranslation();
  const copy = language === 'fr'
    ? {
        limitReached: "Limite d'optimisations atteinte. Passez à un plan supérieur.",
        missingProduct: 'Erreur : produit introuvable',
        missingProductForImage: 'Erreur : image sans produit associé',
        whiteBgError: 'Erreur lors de la génération du fond blanc',
        applyError: "Erreur lors de l'application de l'image",
        variantsError: 'Erreur lors de la génération des arrière-plans IA',
        applyVariantError: "Erreur lors de l'application de la variante",
        downloadStarted: 'Téléchargement HD démarré',
        totalImages: 'Images totales',
        products: 'Produits',
        savedVersions: 'Versions sauvegardées',
        hdResolution: 'Résolution HD',
        intro: "Optimisez vos images produits avec l'IA. Toutes les versions appliquées sont sauvegardées dans l'historique et peuvent être restaurées.",
        whiteBackground: 'Fond blanc',
        aiBackground: 'Arrière-plan IA',
        history: 'Historique',
        whiteTitle: 'Génération de fond blanc HD',
        whiteDescription: 'Générez des photos produits professionnelles sur fond blanc pur. Idéal pour Google Shopping et les marketplaces.',
        format: 'Format',
        square: 'Carré (1:1)',
        portrait: 'Portrait (3:4)',
        landscape: 'Paysage (4:3)',
        mode: 'Mode',
        generate: 'Générer',
        aiTitle: "Génération d'arrière-plans IA",
        aiDescription: "Générez 4 variantes d'arrière-plans créatifs pour vos produits. L'IA conserve le produit et adapte le décor.",
        outputFormat: 'Format de sortie',
        optionalPrompt: 'Prompt personnalisé (optionnel)',
        promptPlaceholder: 'Ex: Luxueux, lifestyle moderne, ambiance chaleureuse...',
        variants: '4 variantes',
        selectImage: 'Sélectionnez une image',
        historyHelp: "Générez ou appliquez une image dans les onglets « Fond blanc » ou « Arrière-plan IA » pour consulter son historique d'optimisations.",
        previewTitle: 'Fond blanc HD',
        previewDescription: "Comparez l'image originale avec le fond blanc généré",
        notSynced: "⚠️ Produit non synchronisé avec Shopify — l'optimisation sera locale uniquement",
        sync: 'Synchroniser',
        original: 'Original',
        optimized: 'Fond blanc HD',
        downloadHd: 'Télécharger HD',
        cancel: 'Annuler',
        applying: 'Application...',
        apply: 'Appliquer',
        variantsDialogTitle: "4 variantes d'arrière-plans IA — Résolution HD",
        variantsDialogDescription: 'Sélectionnez votre variante préférée. Les images sont générées dans le format choisi en conservant le produit comme élément principal.',
        planUpdated: 'Plan mis à jour avec succès !',
      }
    : {
        limitReached: 'Optimization limit reached. Upgrade to a higher plan.',
        missingProduct: 'Error: product not found',
        missingProductForImage: 'Error: image is not linked to a product',
        whiteBgError: 'Error generating white background',
        applyError: 'Error applying image',
        variantsError: 'Error generating AI backgrounds',
        applyVariantError: 'Error applying variant',
        downloadStarted: 'HD download started',
        totalImages: 'Total images',
        products: 'Products',
        savedVersions: 'Saved versions',
        hdResolution: 'HD resolution',
        intro: 'Optimize product images with AI. Every applied version is saved in history and can be restored.',
        whiteBackground: 'White background',
        aiBackground: 'AI background',
        history: 'History',
        whiteTitle: 'HD white background generation',
        whiteDescription: 'Generate professional product photos on a pure white background. Ideal for Google Shopping and marketplaces.',
        format: 'Format',
        square: 'Square (1:1)',
        portrait: 'Portrait (3:4)',
        landscape: 'Landscape (4:3)',
        mode: 'Mode',
        generate: 'Generate',
        aiTitle: 'AI background generation',
        aiDescription: 'Generate 4 creative AI background variants while preserving the product and adapting the scene.',
        outputFormat: 'Output format',
        optionalPrompt: 'Custom prompt (optional)',
        promptPlaceholder: 'Example: Luxury, modern lifestyle, warm atmosphere...',
        variants: '4 variants',
        selectImage: 'Select an image',
        historyHelp: 'Generate or apply an image from the “White background” or “AI background” tabs to view its optimization history.',
        previewTitle: 'HD white background',
        previewDescription: 'Compare the original image with the generated white-background version',
        notSynced: '⚠️ Product is not synchronized with Shopify — the optimization will remain local only',
        sync: 'Synchronize',
        original: 'Original',
        optimized: 'HD white background',
        downloadHd: 'Download HD',
        cancel: 'Cancel',
        applying: 'Applying...',
        apply: 'Apply',
        variantsDialogTitle: '4 AI background variants — HD resolution',
        variantsDialogDescription: 'Select your preferred variant. Images use the selected format while keeping the product as the main subject.',
        planUpdated: 'Plan updated successfully!',
      };

  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [showWhiteBgPreview, setShowWhiteBgPreview] = useState(false);
  const [whiteBgResult, setWhiteBgResult] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [backgroundVariants, setBackgroundVariants] = useState<any[]>([]);
  const [showVariantsSelector, setShowVariantsSelector] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'square' | 'portrait' | 'landscape'>('square');
  const [selectedMode, setSelectedMode] = useState<'standard' | 'google_shopping'>('google_shopping');

  const { limits } = useUsageLimits();
  const { isOptimizing, generateWhiteBackground, generateAIBackgroundVariants, applyOptimizedImage } = useImageOptimization();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-with-images', selectedStore?.id],
    queryFn: async (): Promise<ProductWithImages[]> => {
      if (!selectedStore?.id) return [];

      try {
        const userResponse: any = await (supabase as any).auth.getUser();
        const user = userResponse?.data?.user;
        if (!user) throw new Error('Not authenticated');

        const productsResponse: any = await (supabase as any)
          .from('shopify_products')
          .select('id, title, shopify_id')
          .eq('seller_id', user.id)
          .eq('store_id', selectedStore.id)
          .order('title');

        if (productsResponse.error) throw productsResponse.error;
        const productsData = (productsResponse.data || []) as Array<{ id: string; title: string; shopify_id?: number | null }>;
        if (!productsData.length) return [];

        const imagesResponse: any = await (supabase as any)
          .from('product_images')
          .select('id, src, position, product_id')
          .in('product_id', productsData.map((product) => product.id))
          .order('position');
        if (imagesResponse.error) throw imagesResponse.error;

        const imagesData = (imagesResponse.data || []) as ProductImage[];
        return productsData.map((product) => ({
          ...product,
          product_images: imagesData.filter((image) => image.product_id === product.id),
        }));
      } catch (error) {
        console.error('Error loading products:', error);
        return [];
      }
    },
  });

  const handleGenerationError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('LIMIT_REACHED') || message.includes('429')) {
      setShowUpgradeDialog(true);
      toast.error(copy.limitReached);
      return;
    }
    toast.error(fallback, { description: translateImageGenerationError(error, language) });
  };

  const handleGenerateWhiteBackground = async (image: ProductImage) => {
    if (!limits?.canUseOptimizations) {
      setShowUpgradeDialog(true);
      toast.error(copy.limitReached);
      return;
    }

    const product = products?.find((item) => item.id === image.product_id);
    if (!product) {
      toast.error(copy.missingProduct);
      return;
    }

    try {
      let serpData: any = null;
      let visionAiData: any = null;
      let productDescription: string | null = null;

      const { data: productDetails } = await supabase
        .from('shopify_products')
        .select('body_html, seo_description, serp_data, vision_attributes')
        .eq('id', product.id)
        .single();

      if (productDetails) {
        serpData = productDetails.serp_data;
        visionAiData = productDetails.vision_attributes;
        productDescription = productDetails.body_html || productDetails.seo_description;
      }

      if (!serpData) {
        try {
          const { data: serpResult } = await supabase.functions.invoke('search-similar-products-specs', {
            body: { productTitle: product.title, limit: 5 },
          });
          if (serpResult?.similarProducts || serpResult?.averageWeight || serpResult?.averageDimensions) {
            serpData = {
              dimensions: serpResult.averageDimensions
                ? `${serpResult.averageDimensions.length || ''} x ${serpResult.averageDimensions.width || ''} x ${serpResult.averageDimensions.height || ''}`.replace(/\s+x\s+x\s+/g, '').trim()
                : null,
              weight: serpResult.averageWeight,
              materials: serpResult.similarProducts?.flatMap((item: any) => item.materials || []).slice(0, 3) || [],
              dominantStyles: serpResult.similarProducts?.flatMap((item: any) => item.style ? [item.style] : []).slice(0, 2) || [],
              confidence: serpResult.confidence,
            };
          }
        } catch (serpError) {
          console.warn('[WhiteBg] SERP enrichment unavailable:', serpError);
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
        productDescription: productDescription || undefined,
      });

      if (result.imageUrl) {
        setWhiteBgResult(result.imageUrl);
        setSelectedImage(image);
        setShowWhiteBgPreview(true);
      }
    } catch (error) {
      console.error('Error generating white background:', error);
      handleGenerationError(error, copy.whiteBgError);
    }
  };

  const handleApplyWhiteBackground = async () => {
    if (!selectedImage || !whiteBgResult) return;
    const productId = selectedImage.product_id;
    if (!productId) {
      toast.error(copy.missingProductForImage);
      return;
    }

    try {
      // applyOptimizedImage owns the single Shopify synchronization. Do not sync twice here.
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId,
        optimizedUrl: whiteBgResult,
        originalUrl: selectedImage.src,
        optimizationType: 'white_background',
        aiModel: 'auto-provider',
        resolution: selectedFormat === 'square' ? '1024x1024' : selectedFormat === 'portrait' ? '768x1024' : '1024x768',
        qualityScore: 95,
      });

      setShowWhiteBgPreview(false);
      setWhiteBgResult(null);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error applying white background:', error);
      toast.error(copy.applyError, { description: translateImageGenerationError(error, language) });
    }
  };

  const handleGenerateAIBackgrounds = async (image: ProductImage) => {
    if (!limits?.canUseOptimizations) {
      setShowUpgradeDialog(true);
      toast.error(copy.limitReached);
      return;
    }

    const product = products?.find((item) => item.id === image.product_id);
    if (!product) return;

    try {
      const result = await generateAIBackgroundVariants.mutateAsync({
        productTitle: product.title,
        productImageUrl: image.src,
        basePrompt: aiPrompt,
        style: 'professional',
        format: selectedFormat,
      });

      if (result.variants?.length) {
        setBackgroundVariants(result.variants);
        setSelectedImage(image);
        setShowVariantsSelector(true);
      }
    } catch (error) {
      console.error('Error generating AI backgrounds:', error);
      handleGenerationError(error, copy.variantsError);
    }
  };

  const handleApplyVariant = async (variantId: string) => {
    if (!selectedImage) return;
    const productId = selectedImage.product_id;
    if (!productId) {
      toast.error(copy.missingProductForImage);
      return;
    }

    const variant = backgroundVariants.find((item) => item.variantId === variantId);
    if (!variant) return;

    try {
      await applyOptimizedImage.mutateAsync({
        imageId: selectedImage.id,
        productId,
        optimizedUrl: variant.imageUrl,
        originalUrl: selectedImage.src,
        optimizationType: 'ai_background',
        aiModel: variant.model || 'auto-provider',
        aiPrompt: variant.prompt,
        resolution: variant.resolution || '2000x2000',
        qualityScore: variant.qualityScore,
      });
      setShowVariantsSelector(false);
      setBackgroundVariants([]);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error applying variant:', error);
      toast.error(copy.applyVariantError, { description: translateImageGenerationError(error, language) });
    }
  };

  const handleDownloadHD = (imageUrl: string, filename = 'optimized-image.png') => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(copy.downloadStarted);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const totalImages = products?.reduce((sum, product) => sum + (product.product_images?.length || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><ImageIcon className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalImages}</p><p className="text-sm text-muted-foreground">{copy.totalImages}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><Sparkles className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{products?.length || 0}</p><p className="text-sm text-muted-foreground">{copy.products}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><History className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">-</p><p className="text-sm text-muted-foreground">{copy.savedVersions}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><Palette className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">HD</p><p className="text-sm text-muted-foreground">{copy.hdResolution}</p></div></div></Card>
      </div>

      <Alert><Info className="h-4 w-4" /><AlertDescription>{copy.intro}</AlertDescription></Alert>

      <Tabs defaultValue="white-bg" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="white-bg"><ImageIcon className="h-4 w-4 mr-2" />{copy.whiteBackground}</TabsTrigger>
          <TabsTrigger value="ai-bg"><Palette className="h-4 w-4 mr-2" />{copy.aiBackground}</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />{copy.history}</TabsTrigger>
        </TabsList>

        <TabsContent value="white-bg" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{copy.whiteTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">{copy.whiteDescription}</p>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">{copy.format}</label>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as typeof selectedFormat)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">{copy.square}</SelectItem>
                    <SelectItem value="portrait">{copy.portrait}</SelectItem>
                    <SelectItem value="landscape">{copy.landscape}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{copy.mode}</label>
                <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as typeof selectedMode)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="google_shopping">Google Shopping</SelectItem><SelectItem value="standard">Standard</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products?.flatMap((product) => product.product_images?.map((image) => (
                <Card key={image.id} className="overflow-hidden group">
                  <div className="aspect-square relative bg-muted">
                    <img src={image.src} alt={product.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" onClick={() => handleGenerateWhiteBackground(image)} disabled={isOptimizing}>
                        {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" />{copy.generate}</>}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3"><p className="text-xs font-medium truncate">{product.title}</p></div>
                </Card>
              )) || [])}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai-bg" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{copy.aiTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">{copy.aiDescription}</p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">{copy.outputFormat}</label>
              <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as typeof selectedFormat)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">{copy.square}</SelectItem>
                  <SelectItem value="portrait">{copy.portrait}</SelectItem>
                  <SelectItem value="landscape">{copy.landscape}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">{copy.optionalPrompt}</label>
              <Input placeholder={copy.promptPlaceholder} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products?.flatMap((product) => product.product_images?.map((image) => (
                <Card key={image.id} className="overflow-hidden group">
                  <div className="aspect-square relative bg-muted">
                    <img src={image.src} alt={product.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" onClick={() => handleGenerateAIBackgrounds(image)} disabled={isOptimizing}>
                        {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Palette className="h-4 w-4 mr-2" />{copy.variants}</>}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3"><p className="text-xs font-medium truncate">{product.title}</p></div>
                </Card>
              )) || [])}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {selectedImage ? (
            <ImageHistoryPanel imageId={selectedImage.id} productId={selectedImage.product_id} />
          ) : (
            <Card className="p-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{copy.selectImage}</h3>
              <p className="text-sm text-muted-foreground">{copy.historyHelp}</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showWhiteBgPreview && selectedImage && whiteBgResult && (
        <Dialog open={showWhiteBgPreview} onOpenChange={setShowWhiteBgPreview}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[95vw] sm:max-w-3xl md:max-w-4xl h-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{copy.previewTitle}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">{copy.previewDescription}</DialogDescription>
            </DialogHeader>

            {(() => {
              const product = products?.find((item) => item.id === selectedImage.product_id);
              return !product?.shopify_id ? (
                <Alert className="mb-3 sm:mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-xs sm:text-sm">{copy.notSynced}</span>
                    <Button size="sm" variant="outline" onClick={() => { window.location.href = '/products'; }} className="text-xs">{copy.sync}</Button>
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium">{copy.original}</p>
                <div className="relative w-full rounded-lg overflow-hidden border bg-muted" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  <img src={selectedImage.src} alt={copy.original} className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium">{copy.optimized}</p>
                <div className="relative w-full rounded-lg overflow-hidden border bg-white" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  <img src={whiteBgResult} alt={copy.optimized} className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0 pt-3 sm:pt-4">
              <Button variant="outline" onClick={() => handleDownloadHD(whiteBgResult, `white-bg-${selectedImage.id}.png`)} className="w-full sm:w-auto order-2 sm:order-1">
                <Download className="h-4 w-4 mr-2" />{copy.downloadHd}
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                <Button variant="outline" onClick={() => setShowWhiteBgPreview(false)} className="w-full sm:w-auto">{copy.cancel}</Button>
                <Button onClick={handleApplyWhiteBackground} disabled={applyOptimizedImage.isPending} className="w-full sm:w-auto">
                  {applyOptimizedImage.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{copy.applying}</> : copy.apply}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showVariantsSelector && selectedImage && backgroundVariants.length > 0 && (
        <Dialog open={showVariantsSelector} onOpenChange={setShowVariantsSelector}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{copy.variantsDialogTitle}</DialogTitle>
              <DialogDescription>{copy.variantsDialogDescription}</DialogDescription>
            </DialogHeader>
            <BackgroundVariantSelector
              variants={backgroundVariants}
              originalImage={selectedImage.src}
              onSelect={(id) => console.log('Selected:', id)}
              onApply={handleApplyVariant}
              onDownloadHD={(variantId, imageUrl) => handleDownloadHD(imageUrl, `ai-bg-${variantId}.png`)}
              isApplying={applyOptimizedImage.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      <PlanUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlanId={limits?.currentPlanId || 'trial'}
        onSuccess={() => {
          setShowUpgradeDialog(false);
          toast.success(copy.planUpdated);
        }}
      />
    </div>
  );
};
