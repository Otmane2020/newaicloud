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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Eye,
  Smartphone,
  Monitor,
  Info,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Wand2,
  Square,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { PlanUpgradeDialog } from '@/components/dashboard/PlanUpgradeDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Product {
  id: string;
  title: string;
  description: string | null;
  images: Array<{ id?: string; src: string }>;
}

type BackgroundFormat = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
type BackgroundMode = 'white_shopping' | 'smart_serp' | '3d_shopping' | '3d_generate';

export const ProductContentOptimization = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop' | '360'>('desktop');
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<'ecommerce' | 'luxury' | 'technical'>('ecommerce');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // 🆕 Smart Background states
  const [bgFormat, setBgFormat] = useState<BackgroundFormat>('1:1');
  const [bgMode, setBgMode] = useState<BackgroundMode>('smart_serp');
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [showBgPreview, setShowBgPreview] = useState(false);
  const [generatedBgUrl, setGeneratedBgUrl] = useState<string | null>(null);
  const [selectedBgProduct, setSelectedBgProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const queryClient = useQueryClient();

  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { generateProductDescription, generateWhiteBackground, applyOptimizedImage } = useImageOptimization();

  // Calculate quality score based on HTML content
  const calculateQualityScore = (html: string): number => {
    let score = 0;
    
    // Length check (20 points)
    const wordCount = html.split(/\s+/).length;
    if (wordCount >= 150) score += 20;
    else if (wordCount >= 100) score += 15;
    else if (wordCount >= 50) score += 10;
    
    // Marketing keywords (20 points)
    const marketingKeywords = ['qualité', 'premium', 'durable', 'confort', 'design', 'moderne', 'élégant', 'performant'];
    const keywordCount = marketingKeywords.filter(kw => html.toLowerCase().includes(kw)).length;
    score += Math.min(20, keywordCount * 3);
    
    // HTML structure (30 points)
    if (html.includes('<h2>') || html.includes('<h3>')) score += 10;
    if (html.includes('<ul>') || html.includes('<ol>')) score += 10;
    if (html.includes('<table>')) score += 10;
    
    // Semantic tags (15 points)
    if (html.includes('<section>')) score += 5;
    if (html.includes('<article>')) score += 5;
    if (html.includes('<div class=')) score += 5;
    
    // Images/Media placeholders (15 points)
    const imgCount = (html.match(/<img/g) || []).length;
    score += Math.min(15, imgCount * 5);
    
    return Math.min(100, score);
  };

  // Check limits before generation
  const handleGenerateClick = (productId: string) => {
    // ✅ Vérifier les limites AVANT de générer
    if (!limits?.canUseOptimizations || limits?.limitReached?.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }
    
    // Si OK, lancer la génération
    generateMutation.mutate(productId);
  };

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
          .select('id, product_id, src')
          .in('product_id', productsData.map((p: any) => p.id))
          .order('position');

        const imagesData = (imagesResponse.data || []) as Array<{ id: string; product_id: string; src: string }>;

        return productsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          images: imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => ({ id: img.id, src: img.src }))
        }));
      } catch (error) {
        console.error('Error loading products:', error);
        return [];
      }
    }
  });

  // 🆕 Smart Background generation handler
  const handleGenerateSmartBackground = async (product: Product, imageIndex: number = 0) => {
    if (!limits?.canUseOptimizations) {
      setShowUpgradeDialog(true);
      toast.error('Limite d\'optimisations atteinte');
      return;
    }

    const image = product.images[imageIndex];
    if (!image) {
      toast.error('Aucune image trouvée');
      return;
    }

    setSelectedBgProduct(product);
    setSelectedImageIndex(imageIndex);
    setIsGeneratingBg(true);
    setShowBgPreview(true);

    try {
      // Map format to edge function format
      const formatMap: Record<BackgroundFormat, 'square' | 'portrait' | 'landscape'> = {
        '1:1': 'square',
        '4:3': 'landscape',
        '3:4': 'portrait',
        '16:9': 'landscape',
        '9:16': 'portrait'
      };

      // Fetch SERP data if in smart mode
      let serpData = null;
      let visionAiData = null;
      let productDescription = null;

      // Get existing product data
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

      // Fetch SERP data if smart mode and no existing data
      if ((bgMode === 'smart_serp' || bgMode === '3d_generate') && !serpData) {
        console.log('🔍 [SmartBg] Fetching SERP data for:', product.title);
        const { data: serpResult } = await supabase.functions.invoke('search-similar-products-specs', {
          body: { productTitle: product.title, limit: 5 }
        });
        
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
          console.log('✅ [SmartBg] SERP data formatted:', serpData);
        }
      }

      // Determine format: 3d_shopping forces 1:1 square
      const effectiveFormat = bgMode === '3d_shopping' ? 'square' : formatMap[bgFormat];
      
      // Determine API mode
      const apiMode = bgMode === '3d_shopping' ? '3d_google_shopping' 
        : bgMode === '3d_generate' ? '3d_generate' 
        : 'google_shopping';

      const result = await generateWhiteBackground.mutateAsync({
        imageUrl: image.src,
        productTitle: product.title,
        resolution: '2000x2000',
        format: effectiveFormat,
        mode: apiMode,
        product_id: product.id,
        serpData: (bgMode === 'smart_serp' || bgMode === '3d_generate' || bgMode === '3d_shopping') ? serpData : null,
        visionAiData: (bgMode === 'smart_serp' || bgMode === '3d_generate') ? visionAiData : null,
        productDescription: (bgMode === 'smart_serp' || bgMode === '3d_generate') ? productDescription : null
      });

      if (result.imageUrl) {
        setGeneratedBgUrl(result.imageUrl);
        toast.success('Background généré avec succès');
      }
    } catch (error) {
      console.error('Error generating background:', error);
      toast.error('Erreur lors de la génération du background');
      setShowBgPreview(false);
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // Apply background to image
  const handleApplyBackground = async () => {
    if (!selectedBgProduct || !generatedBgUrl) return;

    const image = selectedBgProduct.images[selectedImageIndex];
    if (!image?.id) {
      toast.error('ID image manquant');
      return;
    }

    try {
      await applyOptimizedImage.mutateAsync({
        imageId: image.id,
        productId: selectedBgProduct.id,
        optimizedUrl: generatedBgUrl,
        originalUrl: image.src,
        optimizationType: 'white_background', // Always use white_background type
        aiModel: 'gemini-2.5-flash-image-preview',
        resolution: '2000x2000',
        qualityScore: 95
      });

      toast.success('Background appliqué et synchronisé');
      setShowBgPreview(false);
      setGeneratedBgUrl(null);
      queryClient.invalidateQueries({ queryKey: ['products-for-content'] });
      refreshLimits();
    } catch (error) {
      console.error('Error applying background:', error);
      toast.error('Erreur lors de l\'application');
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products?.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      setIsGenerating(true);
      setShowPreview(true);
      setSelectedProduct(product || null);

      // Récupérer les données de vision analysis existantes ou analyser
      let visionAnalysis = null;
      
      // D'abord, essayer de récupérer les données existantes
      const { data: productData } = await supabase
        .from('shopify_products')
        .select('vision_attributes')
        .eq('id', product.id)
        .single();
      
      if (productData?.vision_attributes) {
        visionAnalysis = productData.vision_attributes;
        console.log("✅ Vision attributes récupérées depuis la DB:", visionAnalysis);
      } else if (product.images.length > 0) {
        // Si pas de données existantes, analyser l'image
        console.log("📸 Analyse de l'image avec Vision AI...");
        const { data: visionData } = await supabase.functions.invoke('analyze-image-with-vision', {
          body: { imageUrl: product.images[0].src }
        });
        visionAnalysis = visionData?.visualAttributes;
      }

      const result = await generateProductDescription.mutateAsync({
        title: product.title,
        existingDescription: product.description || undefined,
        images: product.images.map(img => img.src),
        visionAnalysis,
        template: selectedTemplate
      });

      return result;
    },
    onSuccess: (data) => {
      setGeneratedHtml(data.htmlDescription);
      setGeneratedTitle(data.optimizedTitle || null);
      setIsGenerating(false);
      
      // Calculate quality score
      const score = calculateQualityScore(data.htmlDescription);
      setQualityScore(score);
      
      queryClient.invalidateQueries({ queryKey: ['products-for-content'] });
      
      // ✅ NOUVEAU: Rafraîchir les limites
      refreshLimits();
    },
    onError: (error: any) => {
      console.error('Error generating description:', error);
      setIsGenerating(false);
      setShowPreview(false);
      
      const errorMessage = error?.message || '';
      
      // Gérer les erreurs de limites
      if (errorMessage.includes('LIMIT_REACHED') || errorMessage.includes('429')) {
        toast.error('Limite d\'optimisations atteinte');
        setShowUpgradeDialog(true);
        refreshLimits();
        return;
      }
      
      if (errorMessage.includes('402') || errorMessage.includes('credits')) {
        toast.error('Crédits IA épuisés', {
          description: 'Contactez le support pour plus d\'informations.'
        });
        return;
      }
      
      toast.error('Erreur lors de la génération');
    }
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !generatedHtml) throw new Error('No content to apply');

      const updateData: any = { 
        description: generatedHtml,
        updated_at: new Date().toISOString()
      };

      // Save optimized title if generated
      if (generatedTitle) {
        updateData.title = generatedTitle;
        updateData.seo_title = generatedTitle;
      }

      const { error } = await supabase
        .from('shopify_products')
        .update(updateData)
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
          Générez des descriptions HTML professionnelles avec titres structurés (H1, H2, H3), intégration automatique des photos produits et mise en page optimisée pour mobile et moteurs de recherche.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Génération de Contenu Produit Premium
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Créez des descriptions HTML riches avec titres structurés (H1, H2, H3), médias intégrés et mise en page professionnelle pour séduire vos clients et améliorer votre référencement naturel.
        </p>

        {/* Template Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Style de description</label>
          <Tabs value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ecommerce">
                <Sparkles className="h-4 w-4 mr-2" />
                E-commerce
              </TabsTrigger>
              <TabsTrigger value="luxury">
                <FileText className="h-4 w-4 mr-2" />
                Luxe
              </TabsTrigger>
              <TabsTrigger value="technical">
                <Info className="h-4 w-4 mr-2" />
                Technique
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedTemplate === 'ecommerce' && 'Style direct et persuasif avec focus sur les bénéfices client'}
            {selectedTemplate === 'luxury' && 'Ton sophistiqué et élégant avec narration raffinée'}
            {selectedTemplate === 'technical' && 'Langage précis et professionnel avec spécifications détaillées'}
          </p>
        </div>

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
                  onClick={() => handleGenerateClick(product.id)}
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
                      Générer Contenu Premium
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

      {/* 🆕 Smart Background Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Smart Background - Optimisation Photo Produit
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Générez des backgrounds professionnels pour vos photos produits avec enrichissement SERP et bonnes pratiques Google Shopping.
        </p>

        {/* Format & Mode Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Square className="h-4 w-4" />
              Format de sortie
            </label>
            <Select value={bgFormat} onValueChange={(v) => setBgFormat(v as BackgroundFormat)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    Carré (1:1) - Google Shopping
                  </div>
                </SelectItem>
                <SelectItem value="4:3">
                  <div className="flex items-center gap-2">
                    <RectangleHorizontal className="h-4 w-4" />
                    Paysage (4:3)
                  </div>
                </SelectItem>
                <SelectItem value="3:4">
                  <div className="flex items-center gap-2">
                    <RectangleVertical className="h-4 w-4" />
                    Portrait (3:4)
                  </div>
                </SelectItem>
                <SelectItem value="16:9">
                  <div className="flex items-center gap-2">
                    <RectangleHorizontal className="h-4 w-4" />
                    Cinéma (16:9) - Bannières
                  </div>
                </SelectItem>
                <SelectItem value="9:16">
                  <div className="flex items-center gap-2">
                    <RectangleVertical className="h-4 w-4" />
                    Story (9:16) - Instagram/TikTok
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Mode de génération
            </label>
            <Select value={bgMode} onValueChange={(v) => setBgMode(v as BackgroundMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white_shopping">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-gray-300" />
                    White Background - Google Shopping
                  </div>
                </SelectItem>
                <SelectItem value="3d_shopping">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">3D</span>
                    3D Google Shopping 1×1 - White
                  </div>
                </SelectItem>
                <SelectItem value="smart_serp">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Smart Background - SERP + Vision AI
                  </div>
                </SelectItem>
                <SelectItem value="3d_generate">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-500">3D</span>
                    3D Generate - Recréer produit en 3D
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {bgMode === 'white_shopping' && 'Fond blanc pur, éclairage studio, conforme Google Merchant Center'}
              {bgMode === '3d_shopping' && 'Produit 3D réaliste sur fond blanc 1:1, conforme Google Shopping'}
              {bgMode === 'smart_serp' && 'Enrichissement SERP (dimensions, matériaux), Vision AI, effet 3D professionnel'}
              {bgMode === '3d_generate' && 'Recréation complète du produit en 3D avec modélisation réaliste'}
            </p>
          </div>
        </div>

        {/* Products Grid for Background */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products?.slice(0, 12).map(product => (
            <Card key={`bg-${product.id}`} className="p-3 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                {product.images[0] && (
                  <div className="aspect-square rounded-md overflow-hidden bg-muted relative group">
                    <img 
                      src={product.images[0].src} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}
                
                <h4 className="font-medium text-xs line-clamp-2">{product.title}</h4>
                
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {bgMode === '3d_shopping' ? '1:1' : bgFormat}
                  </Badge>
                  <Badge 
                    variant={(bgMode === 'smart_serp' || bgMode === '3d_generate') ? 'default' : 'secondary'} 
                    className="text-[10px]"
                  >
                    {bgMode === 'smart_serp' && 'Smart'}
                    {bgMode === 'white_shopping' && 'White'}
                    {bgMode === '3d_shopping' && '3D White'}
                    {bgMode === '3d_generate' && '3D'}
                  </Badge>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  variant={(bgMode === 'smart_serp' || bgMode === '3d_generate') ? 'default' : 'secondary'}
                  onClick={() => handleGenerateSmartBackground(product, 0)}
                  disabled={isGeneratingBg || !product.images[0]}
                >
                  {isGeneratingBg && selectedBgProduct?.id === product.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3 w-3 mr-1" />
                      Optimiser Photo
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {products && products.length === 0 && (
          <div className="text-center py-8">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun produit avec images disponible</p>
          </div>
        )}
      </Card>

      {/* 🆕 Smart Background Preview Dialog */}
      <Dialog open={showBgPreview} onOpenChange={setShowBgPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGeneratingBg ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Background généré - {selectedBgProduct?.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isGeneratingBg 
                ? `Mode: ${
                    bgMode === 'smart_serp' ? 'Smart SERP + Vision AI' : 
                    bgMode === '3d_shopping' ? '3D Google Shopping 1:1' :
                    bgMode === '3d_generate' ? '3D Generate' :
                    'White Background'
                  } | Format: ${bgMode === '3d_shopping' ? '1:1' : bgFormat}`
                : 'Aperçu du background optimisé - Cliquez sur Appliquer pour synchroniser'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Original */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Original</label>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                {selectedBgProduct?.images[selectedImageIndex] && (
                  <img 
                    src={selectedBgProduct.images[selectedImageIndex].src}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Generated */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {bgMode === 'smart_serp' ? 'Smart Background' : 'White Background'}
              </label>
              <div className="aspect-square rounded-lg overflow-hidden bg-white border-2 border-primary/20">
                {isGeneratingBg ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="text-center space-y-3">
                      <Wand2 className="h-12 w-12 mx-auto text-primary animate-pulse" />
                      <p className="text-sm text-muted-foreground">
                        {bgMode === 'smart_serp' ? 'Enrichissement SERP...' : 'Génération fond blanc...'}
                      </p>
                    </div>
                  </div>
                ) : generatedBgUrl ? (
                  <img 
                    src={generatedBgUrl}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Info badges */}
          {!isGeneratingBg && generatedBgUrl && (
            <div className="flex flex-wrap gap-2 pb-4">
              <Badge variant="outline">
                <Square className="h-3 w-3 mr-1" />
                Format: {bgFormat}
              </Badge>
              <Badge variant={bgMode === 'smart_serp' ? 'default' : 'secondary'}>
                {bgMode === 'smart_serp' ? (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    SERP + Vision AI
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1 text-gray-300" />
                    White Background
                  </>
                )}
              </Badge>
              <Badge variant="outline">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                Effet 3D inclus
              </Badge>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBgPreview(false);
              setGeneratedBgUrl(null);
            }}>
              Annuler
            </Button>
            <Button 
              onClick={handleApplyBackground}
              disabled={isGeneratingBg || !generatedBgUrl || applyOptimizedImage.isPending}
            >
              {applyOptimizedImage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Appliquer & Synchroniser
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Preview Dialog with Generation */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
              Aperçu Contenu Premium - {selectedProduct?.title}
            </DialogTitle>
            <DialogDescription>
              {isGenerating 
                ? "Génération en cours avec analyse Vision IA..." 
                : "Description HTML structurée avec titres H1, H2, H3 et médias - Mobile-friendly"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isGenerating ? (
              <div className="py-12 space-y-6">
                <div className="flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-center font-medium">Optimisation en cours...</p>
                  <p className="text-center text-sm text-muted-foreground">
                    Analyse des images et création d'une présentation professionnelle
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Quality Score Badge */}
                {qualityScore !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score de qualité</span>
                      <Badge 
                        variant={qualityScore >= 80 ? "default" : qualityScore >= 60 ? "secondary" : "outline"}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {qualityScore}/100
                      </Badge>
                    </div>
                    <Progress value={qualityScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {qualityScore >= 80 && 'Excellente qualité - Structure complète et contenu riche optimisé'}
                      {qualityScore >= 60 && qualityScore < 80 && 'Bonne qualité - Quelques améliorations possibles'}
                      {qualityScore < 60 && 'Qualité moyenne - Ajoutez plus de contenu et de structure'}
                    </p>
                  </div>
                )}

                {/* Preview Mode Toggle */}
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="desktop">
                      <Monitor className="h-4 w-4 mr-2" />
                      Desktop
                    </TabsTrigger>
                    <TabsTrigger value="mobile">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Mobile
                    </TabsTrigger>
                    <TabsTrigger value="360">
                      <Eye className="h-4 w-4 mr-2" />
                      Vue 360°
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

                  <TabsContent value="360" className="space-y-4">
                    <div className="border rounded-lg p-6 bg-gradient-to-br from-background to-muted min-h-[400px]">
                      <div className="text-center space-y-4">
                        <div className="relative w-64 h-64 mx-auto">
                          {selectedProduct?.images[0] && (
                            <img 
                              src={selectedProduct.images[0].src}
                              alt={selectedProduct.title}
                              className="w-full h-full object-contain rounded-lg shadow-lg animate-pulse"
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Eye className="h-16 w-16 text-primary/20" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Badge variant="secondary" className="mb-2">
                            <Eye className="h-3 w-3 mr-1" />
                            Vue interactive 360°
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Prévisualisation de la rotation produit avec la description
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 p-4 border-t">
                        <div dangerouslySetInnerHTML={{ __html: generatedHtml || '' }} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Original Description Comparison */}
                {selectedProduct?.description && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Description originale:</h4>
                    <div className="p-4 bg-muted rounded-lg text-sm line-clamp-3">
                      {selectedProduct.description}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setShowPreview(false);
                    setGeneratedHtml(null);
                    setSelectedProduct(null);
                  }}>
                    Annuler
                  </Button>
                  <Button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="gap-2"
                  >
                    {applyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Synchronisation...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Synchroniser sur Shopify
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
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

      {/* Plan Upgrade Dialog */}
      <PlanUpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlanId={limits?.currentPlanId || 'trial'}
        onSuccess={() => {
          setShowUpgradeDialog(false);
          refreshLimits();
          toast.success('Plan mis à jour avec succès !');
        }}
      />
    </div>
  );
};
