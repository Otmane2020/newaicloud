import { useState, useEffect, useRef } from 'react';
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
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Focus,
  Maximize2,
  Layers,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
}

interface ProductStatus {
  id: string;
  title: string;
  status: 'pending' | 'generating' | 'saving' | 'success' | 'error' | 'skipped';
  imagesGenerated?: number;
  error?: string;
}

interface BulkAIImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete?: () => void;
}

const IMAGE_TYPES = [
  { id: 'front', label: 'Vue de face', labelEn: 'Front view', icon: Camera },
  { id: 'angle45', label: 'Vue 45°', labelEn: '45° view', icon: RotateCcw },
  { id: 'profile', label: 'Vue de profil', labelEn: 'Profile view', icon: RotateCcw },
  { id: 'zoom_fabric', label: 'Zoom tissu/matière', labelEn: 'Fabric/material zoom', icon: Focus },
  { id: 'zoom_detail', label: 'Zoom détail', labelEn: 'Detail zoom', icon: Maximize2 },
];

const DECOR_TYPES = [
  { id: 'living_room', label: 'Salon', labelEn: 'Living room', icon: Sofa },
  { id: 'bedroom', label: 'Chambre', labelEn: 'Bedroom', icon: BedDouble },
  { id: 'office', label: 'Bureau', labelEn: 'Office', icon: Home },
];

export const BulkAIImagesDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: BulkAIImagesDialogProps) => {
  const { language } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [productStatuses, setProductStatuses] = useState<Map<string, ProductStatus>>(new Map());
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(new Set(['front', 'profile', 'zoom_detail']));
  const [includeDecor, setIncludeDecor] = useState(true);
  const [decorType, setDecorType] = useState<'living_room' | 'bedroom' | 'office'>('living_room');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cancelledRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter products with images
  const productsWithImages = selectedProducts.filter(p => p.image_url);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      cancelledRef.current = false;
      setIsGenerating(false);
      setSuccessCount(0);
      setErrorCount(0);
      setCurrentIndex(0);
      
      // Initialize product statuses
      const statuses = new Map<string, ProductStatus>();
      productsWithImages.forEach(p => {
        statuses.set(p.id, { id: p.id, title: p.title, status: 'pending' });
      });
      setProductStatuses(statuses);
    }
  }, [open, selectedProducts]);

  // Auto-scroll to current product
  useEffect(() => {
    if (isGenerating && productStatuses.size > 0) {
      const currentProduct = Array.from(productStatuses.values()).find(s => s.status === 'generating');
      if (currentProduct) {
        const el = document.getElementById(`bulk-ai-product-${currentProduct.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [productStatuses, isGenerating]);

  const toggleImageType = (typeId: string) => {
    const newSet = new Set(selectedImageTypes);
    if (newSet.has(typeId)) {
      newSet.delete(typeId);
    } else {
      if (newSet.size < 5) {
        newSet.add(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Maximum 5 images fond blanc' : 'Maximum 5 white background images');
      }
    }
    setSelectedImageTypes(newSet);
  };

  const updateProductStatus = (productId: string, updates: Partial<ProductStatus>) => {
    setProductStatuses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId);
      if (current) {
        newMap.set(productId, { ...current, ...updates });
      }
      return newMap;
    });
  };

  const handleGenerateAll = async () => {
    if (productsWithImages.length === 0) {
      toast.error(language === 'fr' ? 'Aucun produit avec image' : 'No products with images');
      return;
    }

    if (selectedImageTypes.size === 0 && !includeDecor) {
      toast.error(language === 'fr' ? 'Sélectionnez au moins un type d\'image' : 'Select at least one image type');
      return;
    }

    cancelledRef.current = false;
    setIsGenerating(true);
    setSuccessCount(0);
    setErrorCount(0);

    let localSuccess = 0;
    let localError = 0;

    for (let i = 0; i < productsWithImages.length; i++) {
      if (cancelledRef.current) break;

      const product = productsWithImages[i];
      setCurrentIndex(i);
      updateProductStatus(product.id, { status: 'generating' });

      try {
        // Call AI image generation
        const { data, error } = await supabase.functions.invoke('generate-ai-product-images', {
          body: {
            productId: product.id,
            productTitle: product.title,
            productType: product.product_type || 'furniture',
            sourceImageUrl: product.image_url,
            imageTypes: Array.from(selectedImageTypes),
            includeDecor,
            decorType,
            language,
          },
        });

        if (error) throw error;

        if (data?.images && data.images.length > 0) {
          updateProductStatus(product.id, { status: 'saving' });

          // Save images to database
          let savedCount = 0;
          for (const img of data.images) {
            try {
              let imageUrl = img.url;

              // Upload base64 to storage if needed
              if (img.url.startsWith('data:')) {
                const base64Data = img.url.split(',')[1];
                const filename = `ai_generated_${product.id}_${img.type}_${Date.now()}.png`;
                
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                  byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);

                const { error: uploadError } = await supabase.storage
                  .from('generated-images')
                  .upload(filename, byteArray, { contentType: 'image/png' });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(filename);
                  imageUrl = urlData.publicUrl;
                }
              }

              // Get max position
              const { data: existingImages } = await supabase
                .from('product_images')
                .select('position')
                .eq('product_id', product.id)
                .order('position', { ascending: false })
                .limit(1);

              const nextPosition = (existingImages?.[0]?.position || 0) + 1;

              // Insert image
              await supabase
                .from('product_images')
                .insert({
                  product_id: product.id,
                  src: imageUrl,
                  alt_text: `${product.title} - ${img.label}`,
                  position: nextPosition + savedCount,
                  optimization_count: 1,
                });

              savedCount++;
            } catch (imgError) {
              console.error('[BulkAI] Error saving image:', imgError);
            }
          }

          updateProductStatus(product.id, { status: 'success', imagesGenerated: savedCount });
          localSuccess++;
          setSuccessCount(localSuccess);
        } else {
          throw new Error('No images generated');
        }
      } catch (error: any) {
        console.error('[BulkAI] Error:', error);
        updateProductStatus(product.id, { status: 'error', error: error.message });
        localError++;
        setErrorCount(localError);
      }

      // Delay between products to avoid rate limits
      if (i < productsWithImages.length - 1 && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);

    if (localSuccess > 0) {
      toast.success(
        language === 'fr'
          ? `${localSuccess} produit(s) traité(s) avec succès`
          : `${localSuccess} product(s) processed successfully`
      );
    }

    if (localSuccess > 0 && localError === 0) {
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 1500);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsGenerating(false);
  };

  const progress = productsWithImages.length > 0
    ? Math.round(((successCount + errorCount) / productsWithImages.length) * 100)
    : 0;

  const getStatusIcon = (status: ProductStatus['status']) => {
    switch (status) {
      case 'generating':
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Square className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProductStatus['status']) => {
    switch (status) {
      case 'generating':
        return <Badge variant="secondary">{language === 'fr' ? 'Génération...' : 'Generating...'}</Badge>;
      case 'saving':
        return <Badge variant="secondary">{language === 'fr' ? 'Sauvegarde...' : 'Saving...'}</Badge>;
      case 'success':
        return <Badge className="bg-green-500">{language === 'fr' ? 'Succès' : 'Success'}</Badge>;
      case 'error':
        return <Badge variant="destructive">{language === 'fr' ? 'Erreur' : 'Error'}</Badge>;
      case 'skipped':
        return <Badge variant="outline">{language === 'fr' ? 'Ignoré' : 'Skipped'}</Badge>;
      default:
        return <Badge variant="outline">{language === 'fr' ? 'En attente' : 'Pending'}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'AI Images - Génération en masse' : 'AI Images - Bulk Generation'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? `Générer des variantes d'images IA pour ${productsWithImages.length} produit(s)`
              : `Generate AI image variants for ${productsWithImages.length} product(s)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{language === 'fr' ? 'Progression' : 'Progress'}</span>
                <span>{successCount + errorCount} / {productsWithImages.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Configuration (only before generation starts) */}
          {!isGenerating && successCount === 0 && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {language === 'fr' ? 'Types d\'images (2-5 max)' : 'Image types (2-5 max)'}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {IMAGE_TYPES.map(type => (
                    <Card
                      key={type.id}
                      className={`p-2 cursor-pointer transition-all ${
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
                        <type.icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
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
                    id="include-decor-bulk"
                    checked={includeDecor}
                    onCheckedChange={(checked) => setIncludeDecor(!!checked)}
                  />
                  <Label htmlFor="include-decor-bulk" className="text-sm cursor-pointer">
                    {language === 'fr' ? 'Ajouter 1 image en décor' : 'Add 1 decor image'}
                  </Label>
                </div>

                {includeDecor && (
                  <div className="grid grid-cols-3 gap-2 ml-6">
                    {DECOR_TYPES.map(decor => (
                      <Card
                        key={decor.id}
                        className={`p-2 cursor-pointer transition-all ${
                          decorType === decor.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setDecorType(decor.id as any)}
                      >
                        <div className="flex items-center gap-2">
                          <decor.icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">
                            {language === 'fr' ? decor.label : decor.labelEn}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Product List */}
          <ScrollArea className="h-[300px] border rounded-lg" ref={scrollRef}>
            <div className="p-2 space-y-1">
              {Array.from(productStatuses.values()).map(status => (
                <div
                  key={status.id}
                  id={`bulk-ai-product-${status.id}`}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    status.status === 'generating' || status.status === 'saving'
                      ? 'bg-primary/10'
                      : status.status === 'success'
                      ? 'bg-green-500/10'
                      : status.status === 'error'
                      ? 'bg-destructive/10'
                      : 'bg-muted/30'
                  }`}
                >
                  {getStatusIcon(status.status)}
                  <span className="flex-1 text-sm truncate">{status.title}</span>
                  {status.imagesGenerated && (
                    <span className="text-xs text-muted-foreground">
                      {status.imagesGenerated} img
                    </span>
                  )}
                  {getStatusBadge(status.status)}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {successCount} {language === 'fr' ? 'succès' : 'success'}
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                {errorCount} {language === 'fr' ? 'erreur(s)' : 'error(s)'}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          {isGenerating ? (
            <Button variant="destructive" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          ) : successCount > 0 ? (
            <Button onClick={() => { onOpenChange(false); onComplete?.(); }}>
              <Check className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={handleGenerateAll} disabled={productsWithImages.length === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                {language === 'fr' 
                  ? `Générer pour ${productsWithImages.length} produit(s)` 
                  : `Generate for ${productsWithImages.length} product(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
