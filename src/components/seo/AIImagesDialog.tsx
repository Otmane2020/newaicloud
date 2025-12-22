import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Home,
  Camera,
  Eye,
  Sofa,
  BedDouble,
  Download,
  Check,
  X,
  RotateCcw,
  Maximize2,
  Focus,
  Layers,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface ProductVariant {
  id: string;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_url: string | null;
  sku: string | null;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
}

interface GeneratedImage {
  id: string;
  url: string;
  type: 'front' | 'profile' | 'back' | 'zoom_fabric' | 'zoom_legs' | 'zoom_detail' | 'decor';
  label: string;
  selected: boolean;
  variantId?: string; // If this image was generated for a variant
}

interface AIImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete?: () => void;
}

const IMAGE_TYPES = [
  { id: 'front', label: 'Vue de face', labelEn: 'Front view', icon: Camera },
  { id: 'angle45', label: 'Vue 45°', labelEn: '45° view', icon: RotateCcw },
  { id: 'profile', label: 'Vue de profil', labelEn: 'Profile view', icon: RotateCcw },
  { id: 'back', label: 'Vue arrière', labelEn: 'Back view', icon: RotateCcw },
  { id: 'top', label: 'Vue du dessus', labelEn: 'Top view', icon: Eye },
  { id: 'low_angle', label: 'Vue contre-plongée', labelEn: 'Low angle view', icon: Camera },
  { id: 'zoom_fabric', label: 'Zoom tissu/matière', labelEn: 'Fabric/material zoom', icon: Focus },
  { id: 'zoom_legs', label: 'Zoom pieds/structure', labelEn: 'Legs/structure zoom', icon: Focus },
  { id: 'zoom_detail', label: 'Zoom détail', labelEn: 'Detail zoom', icon: Maximize2 },
];

const DECOR_TYPES = [
  { id: 'living_room', label: 'Salon', labelEn: 'Living room', icon: Sofa },
  { id: 'dining_room', label: 'Salle à manger', labelEn: 'Dining room', icon: Home },
  { id: 'bedroom', label: 'Chambre', labelEn: 'Bedroom', icon: BedDouble },
  { id: 'office', label: 'Bureau', labelEn: 'Office', icon: Home },
];

export const AIImagesDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: AIImagesDialogProps) => {
  const { t, language } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<Map<string, GeneratedImage[]>>(new Map());
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(new Set(['front', 'profile', 'zoom_detail']));
  const [includeDecor, setIncludeDecor] = useState(true);
  const [decorType, setDecorType] = useState<'living_room' | 'dining_room' | 'bedroom' | 'office'>('living_room');
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Variant selection state
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  
  // Product gallery images for context
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const currentProduct = selectedProducts[currentProductIndex];
  const currentGeneratedImages = generatedImages.get(currentProduct?.id) || [];

  // Load variants and gallery images when product changes
  useEffect(() => {
    const loadProductData = async () => {
      if (!currentProduct?.id) return;
      
      setIsLoadingVariants(true);
      try {
        // Load variants
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('id, title, option1, option2, option3, image_url, sku')
          .eq('product_id', currentProduct.id)
          .order('created_at', { ascending: true });
        
        if (variantsError) throw variantsError;
        
        // Filter variants that have their own image (different from main product)
        const variantsWithImages = (variantsData || []).filter(v => 
          v.image_url && v.image_url !== currentProduct.image_url
        );
        
        setProductVariants(variantsWithImages);
        // By default, select all variants with images
        setSelectedVariantIds(new Set(variantsWithImages.map(v => v.id)));
        
        // Load gallery images for context
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('src')
          .eq('product_id', currentProduct.id)
          .order('position', { ascending: true })
          .limit(5);
        
        if (!imagesError && imagesData) {
          setGalleryImages(imagesData.map(img => img.src).filter(Boolean));
        }
      } catch (err) {
        console.error('Error loading product data:', err);
        setProductVariants([]);
        setGalleryImages([]);
      } finally {
        setIsLoadingVariants(false);
      }
    };
    
    loadProductData();
  }, [currentProduct?.id, currentProduct?.image_url]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentProductIndex(0);
      setGeneratedImages(new Map());
      setProgress(0);
      setProductVariants([]);
      setSelectedVariantIds(new Set());
      setGalleryImages([]);
    }
  }, [open]);
  
  const toggleVariantSelection = (variantId: string) => {
    setSelectedVariantIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  };
  
  const selectAllVariants = () => {
    setSelectedVariantIds(new Set(productVariants.map(v => v.id)));
  };
  
  const deselectAllVariants = () => {
    setSelectedVariantIds(new Set());
  };
  
  const getVariantLabel = (variant: ProductVariant) => {
    const options = [variant.option1, variant.option2, variant.option3].filter(Boolean);
    return options.length > 0 ? options.join(' / ') : variant.title || variant.sku || 'Variante';
  };

  const toggleImageType = (typeId: string) => {
    const newSet = new Set(selectedImageTypes);
    if (newSet.has(typeId)) {
      if (newSet.size > 2) { // Minimum 2 images
        newSet.delete(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Minimum 2 images requises' : 'Minimum 2 images required');
      }
    } else {
      if (newSet.size < 9) { // Maximum 9 white background images
        newSet.add(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Maximum 9 images' : 'Maximum 9 images');
      }
    }
    setSelectedImageTypes(newSet);
  };

  const handleGenerate = async () => {
    if (!currentProduct?.image_url) {
      toast.error(language === 'fr' ? 'Aucune image source disponible' : 'No source image available');
      return;
    }

    if (selectedImageTypes.size === 0 && !includeDecor) {
      toast.error(language === 'fr' ? 'Sélectionnez au moins un type d\'image' : 'Select at least one image type');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    // Build list of images to generate: main product + selected variants
    const imageSourcesToGenerate: Array<{ id: string; imageUrl: string; label: string; isVariant: boolean }> = [
      { id: currentProduct.id, imageUrl: currentProduct.image_url, label: currentProduct.title, isVariant: false }
    ];
    
    // Add selected variants
    for (const variantId of selectedVariantIds) {
      const variant = productVariants.find(v => v.id === variantId);
      if (variant?.image_url) {
        imageSourcesToGenerate.push({
          id: variant.id,
          imageUrl: variant.image_url,
          label: getVariantLabel(variant),
          isVariant: true,
        });
      }
    }

    const totalSources = imageSourcesToGenerate.length;
    const allGeneratedImages: GeneratedImage[] = [];

    const toastId = toast.loading(
      language === 'fr' 
        ? `Génération pour ${totalSources} source(s)...` 
        : `Generating for ${totalSources} source(s)...`
    );

    try {
      for (let i = 0; i < imageSourcesToGenerate.length; i++) {
        const source = imageSourcesToGenerate[i];
        const progressPercent = Math.round(((i) / totalSources) * 100);
        setProgress(progressPercent);

        toast.loading(
          language === 'fr' 
            ? `Génération ${i + 1}/${totalSources}: ${source.label}...` 
            : `Generating ${i + 1}/${totalSources}: ${source.label}...`,
          { id: toastId }
        );

        const { data, error } = await supabase.functions.invoke('generate-ai-product-images', {
          body: {
            productId: currentProduct.id,
            variantId: source.isVariant ? source.id : null,
            productTitle: source.label,
            productType: currentProduct.product_type || 'furniture',
            sourceImageUrl: source.imageUrl,
            imageTypes: Array.from(selectedImageTypes),
            includeDecor,
            decorType,
            language,
            // Enhanced context for better AI understanding
            productDescription: currentProduct.body_html || currentProduct.seo_description || '',
            galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
            variantLabel: source.isVariant ? source.label : undefined,
          },
        });

        if (error) throw error;

        if (data?.images && data.images.length > 0) {
          const newImages: GeneratedImage[] = data.images.map((img: any, index: number) => ({
            id: `${source.id}-${img.type}-${index}`,
            url: img.url,
            type: img.type,
            label: source.isVariant ? `${source.label} - ${img.label}` : img.label,
            selected: true,
            variantId: source.isVariant ? source.id : undefined,
          }));
          allGeneratedImages.push(...newImages);
        }
      }

      if (allGeneratedImages.length > 0) {
        setGeneratedImages(prev => {
          const newMap = new Map(prev);
          newMap.set(currentProduct.id, allGeneratedImages);
          return newMap;
        });

        toast.success(
          language === 'fr' 
            ? `${allGeneratedImages.length} image(s) générée(s) pour ${totalSources} source(s)` 
            : `${allGeneratedImages.length} image(s) generated for ${totalSources} source(s)`,
          { id: toastId }
        );
      } else {
        throw new Error('No images generated');
      }
    } catch (error: any) {
      console.error('Error generating AI images:', error);
      toast.error(
        language === 'fr' 
          ? 'Erreur lors de la génération des images' 
          : 'Error generating images',
        { id: toastId, description: error.message }
      );
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setGeneratedImages(prev => {
      const newMap = new Map(prev);
      const images = newMap.get(currentProduct?.id) || [];
      const updatedImages = images.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      );
      newMap.set(currentProduct?.id, updatedImages);
      return newMap;
    });
  };

  const handleSaveSelected = async () => {
    const selectedImages = currentGeneratedImages.filter(img => img.selected);
    if (selectedImages.length === 0) {
      toast.error(language === 'fr' ? 'Aucune image sélectionnée' : 'No image selected');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(
      language === 'fr' 
        ? 'Sauvegarde des images...' 
        : 'Saving images...'
    );

    try {
      // Save each selected image to product_images table
      for (const img of selectedImages) {
        // First, upload the base64 image to storage if it's a data URL
        let imageUrl = img.url;
        
        if (img.url.startsWith('data:')) {
          const base64Data = img.url.split(',')[1];
          const filename = `ai_generated_${currentProduct.id}_${img.type}_${Date.now()}.png`;
          
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(filename, byteArray, { contentType: 'image/png' });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(filename);
          
          imageUrl = urlData.publicUrl;
        }

        // Get current max position
        const { data: existingImages } = await supabase
          .from('product_images')
          .select('position')
          .eq('product_id', currentProduct.id)
          .order('position', { ascending: false })
          .limit(1);

        const nextPosition = (existingImages?.[0]?.position || 0) + 1;

        // Insert into product_images
        const { data: newImage, error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: currentProduct.id,
            src: imageUrl,
            alt_text: `${currentProduct.title} - ${img.label}`,
            position: nextPosition,
            optimization_count: 1,
            is_ai_generated: true, // ✅ Mark as AI-generated to prevent re-export
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // ✅ Create history entry for this AI-generated image
        if (newImage) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            // Get next version number
            const { data: maxVersion } = await supabase.rpc('get_next_image_version', { 
              p_image_id: newImage.id 
            });
            
            await supabase.from('product_image_history').insert({
              product_id: currentProduct.id,
              image_id: newImage.id,
              user_id: userData.user.id,
              optimization_type: 'ai_background',
              original_url: img.url, // Source URL used for generation
              optimized_url: imageUrl,
              version_number: maxVersion || 1,
              is_current: true,
              ai_model: 'Lovable AI',
              ai_prompt: `AI-generated ${img.type} image for ${currentProduct.title}`,
            });
          }
        }
      }

      // 🆕 Auto-sync AI-generated images to Shopify
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-product-images-to-shopify', {
          body: {
            productId: currentProduct.id,
            allowCreateReplace: true, // 🔐 Explicit: Allow creating new images on Shopify
          },
        });
        
        if (syncError) {
          console.warn('⚠️ Auto-sync to Shopify failed:', syncError);
        } else {
          console.log(`✅ Auto-synced new AI images to Shopify for product ${currentProduct.id}`);
          toast.info(
            language === 'fr' 
              ? 'Images synchronisées avec Shopify' 
              : 'Images synced to Shopify'
          );
        }
      } catch (syncError) {
        console.warn('⚠️ Auto-sync to Shopify failed:', syncError);
        // Don't fail the save operation if sync fails
      }

      toast.success(
        language === 'fr' 
          ? `${selectedImages.length} image(s) sauvegardée(s)` 
          : `${selectedImages.length} image(s) saved`,
        { id: toastId }
      );

      // Move to next product or close
      if (currentProductIndex < selectedProducts.length - 1) {
        setCurrentProductIndex(prev => prev + 1);
      } else {
        onOpenChange(false);
        onComplete?.();
      }
    } catch (error: any) {
      console.error('Error saving images:', error);
      toast.error(
        language === 'fr' 
          ? 'Erreur lors de la sauvegarde' 
          : 'Error saving images',
        { id: toastId, description: error.message }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'front': return <Camera className="h-4 w-4" />;
      case 'profile':
      case 'back': return <RotateCcw className="h-4 w-4" />;
      case 'zoom_fabric':
      case 'zoom_legs':
      case 'zoom_detail': return <Focus className="h-4 w-4" />;
      case 'decor': return <Home className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'AI Images - Variantes Produit' : 'AI Images - Product Variants'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr' 
              ? 'Générez des variantes d\'images (angles, zooms, décor) à partir de votre image produit'
              : 'Generate image variants (angles, zooms, decor) from your product image'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Current Product Info */}
            {currentProduct && (
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  {currentProduct.image_url ? (
                    <img 
                      src={currentProduct.image_url} 
                      alt={currentProduct.title}
                      className="w-20 h-20 object-contain rounded-lg border bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium line-clamp-2">{currentProduct.title}</h3>
                    {currentProduct.vendor && (
                      <Badge variant="secondary" className="mt-1">{currentProduct.vendor}</Badge>
                    )}
                    {selectedProducts.length > 1 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'fr' ? 'Produit' : 'Product'} {currentProductIndex + 1}/{selectedProducts.length}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Image Types Selection */}
            {currentGeneratedImages.length === 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {language === 'fr' ? `Images fond blanc (${selectedImageTypes.size}/9)` : `White background images (${selectedImageTypes.size}/9)`}
                    <Badge variant="outline" className="text-xs">{language === 'fr' ? 'Min 2 - Max 9' : 'Min 2 - Max 9'}</Badge>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {IMAGE_TYPES.map(type => (
                      <Card
                        key={type.id}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedImageTypes.has(type.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleImageType(type.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={selectedImageTypes.has(type.id)}
                            onCheckedChange={() => toggleImageType(type.id)}
                          />
                          <type.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {language === 'fr' ? type.label : type.labelEn}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Decor Option */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-decor"
                      checked={includeDecor}
                      onCheckedChange={(checked) => setIncludeDecor(!!checked)}
                    />
                    <Label htmlFor="include-decor" className="text-sm font-medium cursor-pointer">
                      {language === 'fr' ? 'Ajouter 1 image en décor' : 'Add 1 decor image'}
                    </Label>
                  </div>
                  
                  {includeDecor && (
                    <div className="grid grid-cols-3 gap-2 ml-6">
                      {DECOR_TYPES.map(decor => (
                        <Card
                          key={decor.id}
                          className={`p-3 cursor-pointer transition-all ${
                            decorType === decor.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setDecorType(decor.id as any)}
                        >
                          <div className="flex items-center gap-2">
                            <decor.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {language === 'fr' ? decor.label : decor.labelEn}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variant Selection - Only show if variants with images exist */}
                {productVariants.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Box className="h-4 w-4 text-primary" />
                        {language === 'fr' 
                          ? `Variantes avec images (${selectedVariantIds.size}/${productVariants.length})` 
                          : `Variants with images (${selectedVariantIds.size}/${productVariants.length})`}
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllVariants}
                          className="text-xs h-7"
                        >
                          {language === 'fr' ? 'Tout' : 'All'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={deselectAllVariants}
                          className="text-xs h-7"
                        >
                          {language === 'fr' ? 'Aucun' : 'None'}
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? 'Les images sélectionnées seront générées pour chaque variante cochée ci-dessous.'
                        : 'Selected image types will be generated for each checked variant below.'}
                    </p>
                    
                    <ScrollArea className="max-h-[200px]">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {productVariants.map(variant => (
                          <Card
                            key={variant.id}
                            className={`p-2 cursor-pointer transition-all ${
                              selectedVariantIds.has(variant.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-muted-foreground/50 opacity-70'
                            }`}
                            onClick={() => toggleVariantSelection(variant.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={selectedVariantIds.has(variant.id)}
                                onCheckedChange={() => toggleVariantSelection(variant.id)}
                              />
                              {variant.image_url && (
                                <img 
                                  src={variant.image_url} 
                                  alt={getVariantLabel(variant)}
                                  className="w-8 h-8 object-contain rounded border bg-white"
                                />
                              )}
                              <span className="text-xs truncate flex-1">
                                {getVariantLabel(variant)}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {selectedVariantIds.size > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {language === 'fr' 
                          ? `${(selectedImageTypes.size + (includeDecor ? 1 : 0)) * (selectedVariantIds.size + 1)} images seront générées`
                          : `${(selectedImageTypes.size + (includeDecor ? 1 : 0)) * (selectedVariantIds.size + 1)} images will be generated`}
                      </Badge>
                    )}
                  </div>
                )}
                
                {isLoadingVariants && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === 'fr' ? 'Chargement des variantes...' : 'Loading variants...'}
                  </div>
                )}
              </>
            )}

            {/* Generated Images Preview */}
            {currentGeneratedImages.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {language === 'fr' 
                    ? `${currentGeneratedImages.length} image(s) générée(s) - Sélectionnez celles à sauvegarder`
                    : `${currentGeneratedImages.length} image(s) generated - Select ones to save`}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentGeneratedImages.map(img => (
                    <Card 
                      key={img.id}
                      className={`overflow-hidden cursor-pointer transition-all ${
                        img.selected ? 'ring-2 ring-primary' : 'opacity-60'
                      }`}
                      onClick={() => toggleImageSelection(img.id)}
                    >
                      <div className="aspect-square relative">
                        <img 
                          src={img.url} 
                          alt={img.label}
                          className="w-full h-full object-contain bg-white"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant={img.type === 'decor' ? 'default' : 'secondary'} className="text-xs">
                            {getTypeIcon(img.type)}
                            <span className="ml-1">{img.label}</span>
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          {img.selected ? (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center">
                              <X className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Progress - Style Google Shopping */}
            {isGenerating && (
              <div className="space-y-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Génération en cours...' : 'Generating...'}
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-3 sm:h-4" />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'fr' ? 'Fermer' : 'Close'}
          </Button>
          
          {currentGeneratedImages.length === 0 ? (
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || (!selectedImageTypes.size && !includeDecor)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'fr' ? 'Génération...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Générer les images' : 'Generate images'}
                </>
              )}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setGeneratedImages(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(currentProduct?.id);
                  return newMap;
                })}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Régénérer' : 'Regenerate'}
              </Button>
              <Button 
                onClick={handleSaveSelected} 
                disabled={isSaving || !currentGeneratedImages.some(img => img.selected)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'fr' ? 'Sauvegarde...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'fr' 
                      ? `Sauvegarder (${currentGeneratedImages.filter(i => i.selected).length})`
                      : `Save (${currentGeneratedImages.filter(i => i.selected).length})`}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
