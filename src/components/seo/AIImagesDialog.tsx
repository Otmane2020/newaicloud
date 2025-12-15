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

interface GeneratedImage {
  id: string;
  url: string;
  type: 'front' | 'profile' | 'back' | 'zoom_fabric' | 'zoom_legs' | 'zoom_detail' | 'decor';
  label: string;
  selected: boolean;
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

  const currentProduct = selectedProducts[currentProductIndex];
  const currentGeneratedImages = generatedImages.get(currentProduct?.id) || [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentProductIndex(0);
      setGeneratedImages(new Map());
      setProgress(0);
    }
  }, [open]);

  const toggleImageType = (typeId: string) => {
    const newSet = new Set(selectedImageTypes);
    if (newSet.has(typeId)) {
      newSet.delete(typeId);
    } else {
      if (newSet.size < 6) { // Maximum 6 white background images
        newSet.add(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Maximum 6 images fond blanc' : 'Maximum 6 white background images');
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

    const toastId = toast.loading(
      language === 'fr' 
        ? `Génération des images IA pour ${currentProduct.title}...` 
        : `Generating AI images for ${currentProduct.title}...`
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-product-images', {
        body: {
          productId: currentProduct.id,
          productTitle: currentProduct.title,
          productType: currentProduct.product_type || 'furniture',
          sourceImageUrl: currentProduct.image_url,
          imageTypes: Array.from(selectedImageTypes),
          includeDecor,
          decorType,
          language,
        },
      });

      if (error) throw error;

      if (data?.images && data.images.length > 0) {
        const newImages: GeneratedImage[] = data.images.map((img: any, index: number) => ({
          id: `${currentProduct.id}-${img.type}-${index}`,
          url: img.url,
          type: img.type,
          label: img.label,
          selected: true,
        }));

        setGeneratedImages(prev => {
          const newMap = new Map(prev);
          newMap.set(currentProduct.id, newImages);
          return newMap;
        });

        toast.success(
          language === 'fr' 
            ? `${newImages.length} image(s) générée(s) avec succès` 
            : `${newImages.length} image(s) generated successfully`,
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
        const { error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: currentProduct.id,
            src: imageUrl,
            alt_text: `${currentProduct.title} - ${img.label}`,
            position: nextPosition,
            optimization_count: 1,
          });

        if (insertError) throw insertError;
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
                  <Label className="text-sm font-medium">
                    {language === 'fr' ? 'Images fond blanc (2-6 max)' : 'White background images (2-6 max)'}
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

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Génération en cours...' : 'Generating...'}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
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
