import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, Wand2, AlertCircle, ChevronDown, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AltImageSyncDialog } from './AltImageSyncDialog';
import { OptimizationProgressDialog } from './OptimizationProgressDialog';
import { OptimizationResultsDialog } from './OptimizationResultsDialog';

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number;
  product_id: string;
  product_title?: string;
}

interface ProductWithImages {
  id: string;
  title: string;
  handle: string;
  images: ProductImage[];
}

export function SeoAltImageList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'empty' | 'filled'>('all');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [imagesToSync, setImagesToSync] = useState<ProductImage[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedImages, setOptimizedImages] = useState<any[]>([]);

  useEffect(() => {
    fetchImages();
  }, [user]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Fetch all images with their product info
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select(`
          *,
          shopify_products!inner(
            id,
            title,
            handle,
            seller_id
          )
        `)
        .eq('shopify_products.seller_id', user?.id)
        .order('product_id', { ascending: true })
        .order('position', { ascending: true });

      if (imagesError) throw imagesError;

      if (!imagesData || imagesData.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Group images by product
      const productsMap = new Map<string, ProductWithImages>();
      
      imagesData.forEach((img: any) => {
        const productId = img.shopify_products.id;
        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            id: productId,
            title: img.shopify_products.title,
            handle: img.shopify_products.handle,
            images: []
          });
        }
        productsMap.get(productId)!.images.push({
          id: img.id,
          src: img.src,
          alt_text: img.alt_text,
          position: img.position,
          product_id: productId
        });
      });

      setProducts(Array.from(productsMap.values()));
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Erreur lors du chargement des images');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleSelectImage = (imageId: string, checked: boolean) => {
    const newSelected = new Set(selectedImages);
    if (checked) {
      newSelected.add(imageId);
    } else {
      newSelected.delete(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleGenerateForSelected = async () => {
    const allImages = products.flatMap(p => p.images);
    const imagesToGenerate = allImages.filter(
      img => selectedImages.has(img.id) && !img.alt_text
    );

    if (imagesToGenerate.length === 0) {
      toast.info('Aucune image sans ALT text sélectionnée');
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: imagesToGenerate.length });

    const generatedImages: ProductImage[] = [];

    for (let i = 0; i < imagesToGenerate.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-alt-texts', {
          body: { imageId: imagesToGenerate[i].id }
        });
        
        if (!error && data) {
          const product = products.find(p => p.id === imagesToGenerate[i].product_id);
          generatedImages.push({
            ...imagesToGenerate[i],
            alt_text: data.alt_text,
            product_title: product?.title
          });
        }
        
        setProgress({ current: i + 1, total: imagesToGenerate.length });
      } catch (error) {
        console.error('Error generating ALT text:', error);
      }
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    setSelectedImages(new Set());
    await fetchImages();
    
    // Préparer les données pour OptimizationResultsDialog
    const optimizedItems = generatedImages.map(img => ({
      id: img.id,
      title: img.product_title || 'Unknown Product',
      alt_text: img.alt_text,
      image_url: img.src
    }));
    
    setOptimizedImages(optimizedItems);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  const handleSyncImages = async () => {
    if (imagesToSync.length === 0) return;

    setShowResultsDialog(false);
    setShowSyncDialog(false);
    setSyncing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: imagesToSync.length });

    let successCount = 0;

    for (let i = 0; i < imagesToSync.length; i++) {
      try {
        const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
          body: {
            productId: imagesToSync[i].product_id,
            imageId: imagesToSync[i].id,
            altText: imagesToSync[i].alt_text
          }
        });

        if (!error) {
          successCount++;
        }
        
        setProgress({ current: i + 1, total: imagesToSync.length });
      } catch (error) {
        console.error('Error syncing image:', error);
      }
    }

    setSyncing(false);
    setIsOptimizationComplete(true);
    setImagesToSync([]);
  };

  const handleCloseProgressDialog = () => {
    if (isOptimizationComplete && syncing) {
      const successCount = progress.current;
      if (successCount > 0) {
        toast.success('Synchronisation terminée !', {
          description: `${successCount} image${successCount > 1 ? 's synchronisées' : ' synchronisée'} avec succès sur Shopify`
        });
      }
    }
    
    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
    setShowSyncDialog(false);
  };

  const filteredProducts = products.map(product => ({
    ...product,
    images: product.images.filter(img => {
      if (filterStatus === 'empty') return !img.alt_text;
      if (filterStatus === 'filled') return !!img.alt_text;
      return true;
    })
  })).filter(p => p.images.length > 0);

  const allImages = products.flatMap(p => p.images);
  const stats = {
    total: allImages.length,
    empty: allImages.filter(img => !img.alt_text).length,
    filled: allImages.filter(img => !!img.alt_text).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total images</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-warning">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{stats.empty}</p>
              <p className="text-sm text-muted-foreground">Sans ALT text</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-success">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{stats.filled}</p>
              <p className="text-sm text-muted-foreground">Avec ALT text</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({stats.total})</TabsTrigger>
          <TabsTrigger value="empty">Sans ALT ({stats.empty})</TabsTrigger>
          <TabsTrigger value="filled">Avec ALT ({stats.filled})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Actions - Sticky */}
      <Card className="sticky top-0 z-10 bg-background">
        <div className="p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {selectedImages.size} image(s) sélectionnée(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateForSelected}
              disabled={generating || selectedImages.size === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Optimiser ALT ({selectedImages.size})
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                const allImages = products.flatMap(p => p.images);
                const imagesWithAlt = allImages.filter(img => 
                  selectedImages.has(img.id) && img.alt_text
                ).map(img => {
                  const product = products.find(p => p.id === img.product_id);
                  return { ...img, product_title: product?.title };
                });
                
                if (imagesWithAlt.length === 0) {
                  toast.info('Aucune image avec ALT text sélectionnée');
                  return;
                }
                
                setImagesToSync(imagesWithAlt);
                setShowSyncDialog(true);
              }}
              disabled={selectedImages.size === 0}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser ({selectedImages.size})
            </Button>
          </div>
        </div>
      </Card>

      {/* Products List with Collapsible Images */}
      <ScrollArea className="h-[600px]">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Aucune image trouvée</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const isExpanded = expandedProducts.has(product.id);
              const mainImage = product.images.find(img => img.position === 0) || product.images[0];
              const imagesWithAlt = product.images.filter(img => img.alt_text).length;

              return (
                <Card key={product.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleProduct(product.id)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          {mainImage && (
                            <img
                              src={mainImage.src}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="text-left">
                            <h3 className="font-semibold">{product.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.images.length} image(s)
                            </p>
                          </div>
                        </div>
                        <Badge variant={imagesWithAlt === product.images.length ? "default" : "secondary"}>
                          {imagesWithAlt}/{product.images.length} ALT
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {product.images.map((image) => (
                          <Card key={image.id} className="overflow-hidden">
                            <div className="relative aspect-square">
                              <img
                                src={image.src}
                                alt={image.alt_text || 'Product image'}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2">
                                <Checkbox
                                  checked={selectedImages.has(image.id)}
                                  onCheckedChange={(checked) => handleSelectImage(image.id, checked as boolean)}
                                  className="bg-background"
                                />
                              </div>
                              {image.alt_text && (
                                <Badge className="absolute top-2 right-2 bg-success text-xs">
                                  ALT ✓
                                </Badge>
                              )}
                              {image.position === 0 && (
                                <Badge className="absolute bottom-2 left-2 bg-primary text-xs">
                                  Principale
                                </Badge>
                              )}
                            </div>
                            <div className="p-2">
                              {image.alt_text ? (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {image.alt_text}
                                </p>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-warning">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Pas de texte ALT</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Dialogs */}
      <OptimizationProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        title={generating ? "🔄 Génération des textes ALT..." : "🔄 Synchronisation avec Shopify..."}
        current={progress.current}
        total={progress.total}
        isComplete={isOptimizationComplete}
        operationType={syncing ? 'synchronization' : 'optimization'}
        onSyncClick={() => {
          setShowProgressDialog(false);
          const imagesWithProduct = optimizedImages.map(img => {
            const product = products.find(p => p.images.some(i => i.id === img.id));
            return {
              id: img.id,
              src: img.image_url,
              alt_text: img.alt_text,
              position: 0,
              product_id: product?.id || '',
              product_title: product?.title
            };
          });
          setImagesToSync(imagesWithProduct);
          setShowSyncDialog(true);
        }}
        onClose={handleCloseProgressDialog}
      />

      <OptimizationResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="alt"
        items={optimizedImages}
        onSyncClick={() => {
          setShowResultsDialog(false);
          const imagesWithProduct = optimizedImages.map(img => {
            const product = products.find(p => p.images.some(i => i.id === img.id));
            return {
              id: img.id,
              src: img.image_url,
              alt_text: img.alt_text,
              position: 0,
              product_id: product?.id || '',
              product_title: product?.title
            };
          });
          setImagesToSync(imagesWithProduct);
          setShowSyncDialog(true);
        }}
        onClose={() => setShowResultsDialog(false)}
      />

      <AltImageSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        images={imagesToSync}
        onConfirm={handleSyncImages}
        loading={syncing}
      />
    </div>
  );
}
