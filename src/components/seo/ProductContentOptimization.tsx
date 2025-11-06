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
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop' | '360'>('desktop');
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<'ecommerce' | 'luxury' | 'technical'>('ecommerce');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { generateProductDescription } = useImageOptimization();

  // Calculate quality score based on HTML content
  const calculateQualityScore = (html: string): number => {
    let score = 0;
    
    // Length check (20 points)
    const wordCount = html.split(/\s+/).length;
    if (wordCount >= 150) score += 20;
    else if (wordCount >= 100) score += 15;
    else if (wordCount >= 50) score += 10;
    
    // SEO keywords (20 points)
    const seoKeywords = ['qualité', 'premium', 'durable', 'confort', 'design', 'moderne', 'élégant', 'performant'];
    const keywordCount = seoKeywords.filter(kw => html.toLowerCase().includes(kw)).length;
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

      setIsGenerating(true);
      setShowPreview(true);
      setSelectedProduct(product || null);

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
    },
    onError: (error: any) => {
      console.error('Error generating description:', error);
      setIsGenerating(false);
      setShowPreview(false);
      
      // Better error handling for 402
      if (error?.message?.includes('402') || error?.message?.includes('credits')) {
        toast.error('Crédits IA épuisés', {
          description: 'Veuillez ajouter des crédits à votre workspace Lovable.'
        });
      } else {
        toast.error('Erreur lors de la génération');
      }
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
          Générez des descriptions HTML UX haute qualité, mobile-friendly avec intégration automatique des photos produits et analyse vision IA.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Génération de Descriptions UX
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Créez des descriptions HTML professionnelles et engageantes avec mise en page optimisée pour mobile.
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


      {/* Preview Dialog with Generation */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
              Aperçu Landing Page - {selectedProduct?.title}
            </DialogTitle>
            <DialogDescription>
              {isGenerating 
                ? "Génération en cours avec analyse Vision IA..." 
                : "Description HTML UX optimisée - Mobile-friendly"}
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
                      {qualityScore >= 80 && 'Excellente qualité - Structure complète et optimisée SEO'}
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
    </div>
  );
};
