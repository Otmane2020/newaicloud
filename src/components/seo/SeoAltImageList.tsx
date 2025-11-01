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
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog, 
  SuccessDialog,
  WorkflowItem 
} from './SeoWorkflowDialogs';

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number;
  product_id: string;
  product_title?: string;
  last_synced_at?: string | null;
  shopify_image_id?: number | null;
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
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'empty' | 'filled'>('all');
  
  // Workflow states
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<'optimizing' | 'syncing'>('optimizing');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [optimizedItems, setOptimizedItems] = useState<WorkflowItem[]>([]);
  const [imagesToSync, setImagesToSync] = useState<ProductImage[]>([]);

  useEffect(() => {
    fetchImages();
  }, [user]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Fetch product images with their product info
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select(`
          id,
          src,
          alt_text,
          position,
          product_id,
          last_synced_at,
          shopify_image_id,
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

      // Fetch homepage images
      const { data: homepageImagesData, error: homepageError } = await supabase
        .from('homepage_images')
        .select('*')
        .eq('user_id', user?.id)
        .order('position', { ascending: true });

      if (homepageError) console.error('Homepage images error:', homepageError);

      // Group product images by product
      const productsMap = new Map<string, ProductWithImages>();
      
      (imagesData || []).forEach((img: any) => {
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
          product_id: productId,
          last_synced_at: img.last_synced_at,
          shopify_image_id: img.shopify_image_id
        });
      });

      // Add homepage images as a separate "product"
      if (homepageImagesData && homepageImagesData.length > 0) {
        productsMap.set('homepage', {
          id: 'homepage',
          title: '🏠 Page d\'accueil',
          handle: 'homepage',
          images: homepageImagesData.map((img: any) => ({
            id: img.id,
            src: img.src,
            alt_text: img.alt_text,
            position: img.position,
            product_id: 'homepage',
            last_synced_at: img.last_synced_at,
            shopify_image_id: img.shopify_image_id || null
          }))
        });
      }

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

    setCurrentOperation('optimizing');
    setShowProgressDialog(true);
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

    setSelectedImages(new Set());
    await fetchImages();
    
    // Prepare items for results dialog
    const items: WorkflowItem[] = generatedImages.map(img => ({
      id: img.id,
      title: img.product_title || 'Unknown Product',
      alt_text: img.alt_text,
      image_url: img.src,
      shopify_image_id: img.shopify_image_id
    }));
    
    setOptimizedItems(items);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  // Helper: Invoke with timeout and retry
  const invokeWithTimeout = async (imageId: string, timeoutMs = 30000, retries = 1): Promise<any> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );

        const invokePromise = supabase.functions.invoke('sync-seo-to-shopify', {
          body: { imageId }
        });

        const result = await Promise.race([invokePromise, timeoutPromise]);
        return result;
      } catch (error: any) {
        if (attempt < retries && (error.message === 'Timeout' || error.message?.includes('network'))) {
          console.log(`⚠️ Retry ${attempt + 1}/${retries} for image ${imageId}`);
          continue;
        }
        throw error;
      }
    }
  };

  const handleSyncImages = async () => {
    if (imagesToSync.length === 0) return;

    // CRITICAL: Filter out images without Shopify ID before syncing
    const syncableImages = imagesToSync.filter(img => img.shopify_image_id);
    const filteredCount = imagesToSync.length - syncableImages.length;
    
    if (syncableImages.length === 0) {
      toast.error('Aucune image synchronisable', {
        description: 'Les images de homepage ne peuvent pas être synchronisées avec Shopify.'
      });
      setShowResultsDialog(false);
      setShowSyncDialog(false);
      return;
    }
    
    if (filteredCount > 0) {
      toast.info(`${filteredCount} image(s) de homepage ignorée(s)`, {
        description: 'Seules les images de produits seront synchronisées.'
      });
    }

    setShowResultsDialog(false);
    setShowSyncDialog(false);
    setCurrentOperation('syncing');
    setShowProgressDialog(true);
    setProgress({ current: 0, total: syncableImages.length });

    let successCount = 0;
    let errorCount = 0;
    const failedImages: string[] = [];
    const successfulImages: ProductImage[] = [];

    try {
      for (let i = 0; i < syncableImages.length; i++) {
        const image = syncableImages[i];
        console.log(`🔄 [${i + 1}/${syncableImages.length}] Syncing image:`, image.id, 'Shopify ID:', image.shopify_image_id);
        
        try {
          const { data, error } = await invokeWithTimeout(image.id);

          if (error) {
            console.error(`❌ [${i + 1}/${imagesToSync.length}] Function error:`, error);
            errorCount++;
            failedImages.push(image.product_title || image.id);
            continue;
          }

          if (!data?.success) {
            console.error(`❌ [${i + 1}/${imagesToSync.length}] API error:`, data?.error || data?.message);
            errorCount++;
            failedImages.push(image.product_title || image.id);
            if (data?.message) {
              toast.error(data.message, { duration: 3000 });
            }
            continue;
          }

          console.log(`✅ [${i + 1}/${imagesToSync.length}] Synced successfully`);
          successCount++;
          successfulImages.push(image);
        } catch (error: any) {
          console.error(`❌ [${i + 1}/${imagesToSync.length}] Unexpected error:`, error.message);
          errorCount++;
          failedImages.push(image.product_title || image.id);
        } finally {
          setProgress({ current: i + 1, total: imagesToSync.length });
        }
      }
    } finally {
      // Wait for UI to update before closing (prevents dialog getting stuck at 100%)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ALWAYS close the dialog first
      setShowProgressDialog(false);
      
      // Wait a bit before showing success dialog to avoid conflicts
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear sync state
      setImagesToSync([]);
      
      // Show results
      if (successCount > 0) {
        // Update optimizedItems with successfully synced images
        const syncedItems: WorkflowItem[] = successfulImages.map(img => ({
          id: img.id,
          title: img.product_title || 'Unknown Product',
          alt_text: img.alt_text || '',
          image_url: img.src,
          shopify_image_id: img.shopify_image_id
        }));
        setOptimizedItems(syncedItems);
        setShowSuccessDialog(true);
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} image(s) échouée(s)`, {
          description: failedImages.length > 0 ? `Produits: ${failedImages.slice(0, 3).join(', ')}${failedImages.length > 3 ? '...' : ''}` : undefined,
          duration: 5000
        });
      }
      
      // Refresh
      await fetchImages();
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false);
    setOptimizedItems([]);
    toast.success('Synchronisation terminée !', {
      description: `${progress.current} image${progress.current > 1 ? 's synchronisées' : ' synchronisée'} avec succès`
    });
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
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {selectedImages.size} image(s) sélectionnée(s)
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (expandedProducts.size === filteredProducts.length) {
                    setExpandedProducts(new Set());
                  } else {
                    setExpandedProducts(new Set(filteredProducts.map(p => p.id)));
                  }
                }}
              >
                {expandedProducts.size === filteredProducts.length ? (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Tout replier
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Tout déplier
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('import-homepage-images');
                    if (error) throw error;
                    toast.success(`${data.imported} images importées depuis la page d'accueil`);
                    await fetchImages();
                  } catch (error) {
                    console.error('Import error:', error);
                    toast.error('Erreur lors de l\'import');
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Importer page d'accueil
              </Button>
            </div>
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateForSelected}
              disabled={currentOperation === 'optimizing' && showProgressDialog || selectedImages.size === 0}
            >
              {(currentOperation === 'optimizing' && showProgressDialog) ? (
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
                  
                  // Filter images that have ALT text AND Shopify image ID
                  const syncableImages = allImages.filter(img => 
                    selectedImages.has(img.id) && 
                    img.alt_text && 
                    img.shopify_image_id
                  ).map(img => {
                    const product = products.find(p => p.id === img.product_id);
                    return { ...img, product_title: product?.title };
                  });

                  // Check for images without Shopify ID
                  const imagesWithoutShopifyId = allImages.filter(img =>
                    selectedImages.has(img.id) && 
                    img.alt_text && 
                    !img.shopify_image_id
                  );
                  
                  if (syncableImages.length === 0 && imagesWithoutShopifyId.length > 0) {
                    toast.error('Images non synchronisables', {
                      description: `${imagesWithoutShopifyId.length} image(s) n'ont pas d'ID Shopify. Importez-les d'abord depuis Shopify.`
                    });
                    return;
                  }

                  if (syncableImages.length === 0) {
                    toast.info('Aucune image avec ALT text sélectionnée');
                    return;
                  }

                  if (imagesWithoutShopifyId.length > 0) {
                    toast.warning('Certaines images ignorées', {
                      description: `${imagesWithoutShopifyId.length} image(s) sans ID Shopify seront ignorées.`
                    });
                  }
                  
                  setImagesToSync(syncableImages);
                  setShowSyncDialog(true);
                }}
                disabled={selectedImages.size === 0}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Synchroniser ({selectedImages.size})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Cliquez sur un produit pour déplier et voir ses images
          </p>
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
                              {image.last_synced_at && (
                                <Badge className="absolute top-10 right-2 bg-green-500 text-white text-xs">
                                  Synced
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
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="alt"
        operation={currentOperation}
        current={progress.current}
        total={progress.total}
      />

      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="alt"
        items={optimizedItems}
        onSyncClick={() => {
          setShowResultsDialog(false);
          
          // Filter images that have Shopify ID
          const syncableImages = optimizedItems.filter(img => img.shopify_image_id);
          const imagesWithoutShopifyId = optimizedItems.filter(img => !img.shopify_image_id);
          
          if (syncableImages.length === 0) {
            toast.error('Images non synchronisables', {
              description: `Aucune image n'a d'ID Shopify. Les images de homepage ne peuvent pas être synchronisées.`
            });
            return;
          }
          
          if (imagesWithoutShopifyId.length > 0) {
            toast.warning('Certaines images ignorées', {
              description: `${imagesWithoutShopifyId.length} image(s) de homepage sans ID Shopify seront ignorées.`
            });
          }
          
          const imagesWithProduct = syncableImages.map(img => {
            const product = products.find(p => p.images.some(i => i.id === img.id));
            return {
              id: img.id,
              src: img.image_url || '',
              alt_text: img.alt_text,
              position: 0,
              product_id: product?.id || '',
              product_title: product?.title,
              shopify_image_id: img.shopify_image_id
            };
          });
          setImagesToSync(imagesWithProduct);
          setShowSyncDialog(true);
        }}
        onClose={() => setShowResultsDialog(false)}
      />

      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        type="alt"
        itemCount={imagesToSync.length}
        onConfirm={handleSyncImages}
        loading={currentOperation === 'syncing' && showProgressDialog}
      />

      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        type="alt"
        count={progress.total}
        items={optimizedItems}
        onClose={handleCloseSuccess}
      />
    </div>
  );
}
