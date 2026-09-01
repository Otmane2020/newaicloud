import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BedDouble,
  Camera,
  Check,
  Eye,
  Focus,
  Home,
  Image as ImageIcon,
  Images,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Save,
  Sofa,
  Sparkles,
  Star,
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
  body_html?: string | null;
  seo_description?: string | null;
}

interface GeneratedImage {
  id: string;
  url: string;
  type: string;
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
  { id: 'top', label: 'Vue du dessus', labelEn: 'Top view', icon: Eye },
  { id: 'low_angle', label: 'Contre-plongée', labelEn: 'Low angle', icon: Camera },
  { id: 'zoom_fabric', label: 'Zoom matière', labelEn: 'Material zoom', icon: Focus },
  { id: 'zoom_legs', label: 'Zoom structure', labelEn: 'Structure zoom', icon: Focus },
  { id: 'zoom_detail', label: 'Zoom détail', labelEn: 'Detail zoom', icon: Maximize2 },
];

const DECOR_TYPES = [
  { id: 'living_room', label: 'Salon', labelEn: 'Living room', icon: Sofa },
  { id: 'dining_room', label: 'Salle à manger', labelEn: 'Dining room', icon: Home },
  { id: 'bedroom', label: 'Chambre', labelEn: 'Bedroom', icon: BedDouble },
  { id: 'office', label: 'Bureau', labelEn: 'Office', icon: Home },
] as const;

export const AIImagesDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: AIImagesDialogProps) => {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [availableSourceImages, setAvailableSourceImages] = useState<string[]>([]);
  const [selectedSourceImages, setSelectedSourceImages] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(new Set(['front', 'angle45', 'profile']));
  const [includeDecor, setIncludeDecor] = useState(false);
  const [decorType, setDecorType] = useState<(typeof DECOR_TYPES)[number]['id']>('living_room');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<Map<string, GeneratedImage[]>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mainImageId, setMainImageId] = useState('keep');

  const currentProduct = selectedProducts[currentProductIndex];
  const currentGeneratedImages = generatedImages.get(currentProduct?.id) || [];
  const selectedGeneratedImages = currentGeneratedImages.filter((image) => image.selected);
  const generationCount = selectedImageTypes.size + (includeDecor ? 1 : 0);

  const selectedSourceOrder = useMemo(() => {
    const order = new Map<string, number>();
    selectedSourceImages.forEach((url, index) => order.set(url, index + 1));
    return order;
  }, [selectedSourceImages]);

  useEffect(() => {
    if (!open) return;
    setCurrentProductIndex(0);
    setGeneratedImages(new Map());
    setProgress(0);
    setMainImageId('keep');
    setCustomPrompt('');
  }, [open]);

  useEffect(() => {
    const loadSources = async () => {
      if (!open || !currentProduct?.id) {
        setAvailableSourceImages([]);
        setSelectedSourceImages([]);
        return;
      }

      setIsLoadingSources(true);
      try {
        const { data, error } = await supabase
          .from('product_images')
          .select('src, position')
          .eq('product_id', currentProduct.id)
          .order('position', { ascending: true })
          .limit(20);

        if (error) throw error;

        const urls = Array.from(new Set([
          currentProduct.image_url,
          ...(data || []).map((image) => image.src),
        ].filter((value): value is string => Boolean(value))));

        setAvailableSourceImages(urls);
        const initialSource = currentProduct.image_url && urls.includes(currentProduct.image_url)
          ? currentProduct.image_url
          : urls[0];
        setSelectedSourceImages(initialSource ? [initialSource] : []);
      } catch (error) {
        console.error('Failed to load Product Shot source images:', error);
        const fallback = currentProduct.image_url ? [currentProduct.image_url] : [];
        setAvailableSourceImages(fallback);
        setSelectedSourceImages(fallback);
      } finally {
        setIsLoadingSources(false);
      }
    };

    loadSources();
  }, [open, currentProduct?.id, currentProduct?.image_url]);

  const toggleSourceImage = (imageUrl: string) => {
    setSelectedSourceImages((current) => {
      if (current.includes(imageUrl)) {
        if (current.length === 1) {
          toast.warning(fr ? 'Gardez au moins une image source.' : 'Keep at least one source image.');
          return current;
        }
        return current.filter((url) => url !== imageUrl);
      }

      if (current.length >= 5) {
        toast.warning(fr ? 'Maximum 5 images de référence.' : 'Maximum 5 reference images.');
        return current;
      }

      return [...current, imageUrl];
    });
  };

  const makePrimarySource = (imageUrl: string) => {
    setSelectedSourceImages((current) => [imageUrl, ...current.filter((url) => url !== imageUrl)]);
  };

  const toggleImageType = (typeId: string) => {
    setSelectedImageTypes((current) => {
      const next = new Set(current);
      if (next.has(typeId)) {
        if (next.size === 1 && !includeDecor) {
          toast.warning(fr ? 'Sélectionnez au moins un rendu.' : 'Select at least one output.');
          return current;
        }
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!currentProduct?.id) return;
    if (selectedSourceImages.length === 0) {
      toast.error(fr ? 'Sélectionnez au moins une image source.' : 'Select at least one source image.');
      return;
    }
    if (generationCount === 0) {
      toast.error(fr ? 'Sélectionnez au moins un Product Shot.' : 'Select at least one Product Shot.');
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    const toastId = toast.loading(fr ? 'Génération des Product Shots…' : 'Generating Product Shots…');

    try {
      const primarySource = selectedSourceImages[0];
      const referenceImages = selectedSourceImages.slice(1);

      const { data, error } = await supabase.functions.invoke('generate-ai-product-images', {
        body: {
          productId: currentProduct.id,
          productTitle: currentProduct.title,
          productType: currentProduct.product_type || 'product',
          sourceImageUrl: primarySource,
          galleryImages: referenceImages,
          imageTypes: Array.from(selectedImageTypes),
          includeDecor,
          decorType,
          language,
          customPrompt: customPrompt.trim() || undefined,
          productDescription: currentProduct.body_html || currentProduct.seo_description || '',
        },
      });

      if (error) throw error;
      setProgress(88);

      if (!data?.images?.length) {
        throw new Error(data?.error || 'No images generated');
      }

      const now = Date.now();
      const images: GeneratedImage[] = data.images.map((image: { url: string; type: string; label: string }, index: number) => ({
        id: `${currentProduct.id}-${image.type}-${now}-${index}`,
        url: image.url,
        type: image.type,
        label: image.label,
        selected: true,
      }));

      setGeneratedImages((current) => {
        const next = new Map<string, GeneratedImage[]>(current);
        next.set(currentProduct.id, images);
        return next;
      });
      setMainImageId('keep');
      setProgress(100);
      toast.success(
        fr
          ? `${images.length} Product Shot(s) généré(s) à partir de ${selectedSourceImages.length} référence(s).`
          : `${images.length} Product Shot(s) generated from ${selectedSourceImages.length} reference image(s).`,
        { id: toastId },
      );
    } catch (error) {
      console.error('Product Shot generation failed:', error);
      toast.error(fr ? 'La génération Product Shot a échoué.' : 'Product Shot generation failed.', {
        id: toastId,
        description: error instanceof Error ? error.message : String(error),
      });
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGeneratedImage = (imageId: string) => {
    if (!currentProduct?.id) return;
    setGeneratedImages((current) => {
      const next = new Map<string, GeneratedImage[]>(current);
      next.set(
        currentProduct.id,
        (next.get(currentProduct.id) || []).map((image) =>
          image.id === imageId ? { ...image, selected: !image.selected } : image,
        ),
      );
      return next;
    });
  };

  const resetGeneration = () => {
    if (!currentProduct?.id) return;
    setGeneratedImages((current) => {
      const next = new Map<string, GeneratedImage[]>(current);
      next.delete(currentProduct.id);
      return next;
    });
    setProgress(0);
    setMainImageId('keep');
  };

  const uploadDataImage = async (image: GeneratedImage, userId: string) => {
    if (!image.url.startsWith('data:')) return image.url;

    const [header, payload] = image.url.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
    const extension = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const path = `${userId}/${currentProduct.id}/product-shot-${Date.now()}-${image.id}.${extension}`;

    const { error } = await supabase.storage
      .from('generated-images')
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (error) throw error;

    return supabase.storage.from('generated-images').getPublicUrl(path).data.publicUrl;
  };

  const handleSaveSelected = async () => {
    if (!currentProduct?.id || selectedGeneratedImages.length === 0) {
      toast.error(fr ? 'Sélectionnez au moins une image générée.' : 'Select at least one generated image.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(fr ? 'Sauvegarde dans le catalogue…' : 'Saving to catalog…');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fr ? 'Session utilisateur introuvable.' : 'User session not found.');

      const { data: existingImages } = await supabase
        .from('product_images')
        .select('position')
        .eq('product_id', currentProduct.id)
        .order('position', { ascending: false })
        .limit(1);

      let nextPosition = (existingImages?.[0]?.position || 0) + 1;
      const resolvedUrls = new Map<string, string>();

      for (const image of selectedGeneratedImages) {
        const imageUrl = await uploadDataImage(image, user.id);
        resolvedUrls.set(image.id, imageUrl);

        const { data: inserted, error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: currentProduct.id,
            src: imageUrl,
            alt_text: `${currentProduct.title} - ${image.label}`,
            position: nextPosition,
            optimization_count: 1,
            is_ai_generated: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        nextPosition += 1;

        if (inserted?.id) {
          const { data: version } = await supabase.rpc('get_next_image_version', {
            p_image_id: inserted.id,
          });

          await supabase.from('product_image_history').insert({
            product_id: currentProduct.id,
            image_id: inserted.id,
            user_id: user.id,
            optimization_type: 'ai_background',
            original_url: selectedSourceImages[0] || currentProduct.image_url || imageUrl,
            optimized_url: imageUrl,
            version_number: version || 1,
            is_current: true,
            ai_model: 'Gemini 2.5 Flash Image',
            ai_prompt: customPrompt.trim() || `Product Shot AI - ${image.type}`,
          });
        }
      }

      if (mainImageId !== 'keep') {
        const mainImage = selectedGeneratedImages.find((image) => image.id === mainImageId);
        if (mainImage) {
          const mainUrl = resolvedUrls.get(mainImage.id) || await uploadDataImage(mainImage, user.id);
          const { error: updateError } = await supabase
            .from('shopify_products')
            .update({ image_url: mainUrl, updated_at: new Date().toISOString() })
            .eq('id', currentProduct.id);
          if (updateError) throw updateError;
        }
      }

      try {
        const { error: syncError } = await supabase.functions.invoke('sync-product-images-to-shopify', {
          body: { productId: currentProduct.id, allowCreateReplace: true },
        });
        if (syncError) console.warn('Product Shot Shopify sync failed:', syncError);
      } catch (syncError) {
        console.warn('Product Shot Shopify sync failed:', syncError);
      }

      toast.success(
        fr
          ? `${selectedGeneratedImages.length} image(s) sauvegardée(s).`
          : `${selectedGeneratedImages.length} image(s) saved.`,
        { id: toastId },
      );

      if (currentProductIndex < selectedProducts.length - 1) {
        setCurrentProductIndex((index) => index + 1);
        setProgress(0);
        setMainImageId('keep');
        setCustomPrompt('');
      } else {
        onOpenChange(false);
        onComplete?.();
      }
    } catch (error) {
      console.error('Failed to save Product Shots:', error);
      toast.error(fr ? 'La sauvegarde a échoué.' : 'Saving failed.', {
        id: toastId,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Camera className="h-4 w-4" /></span>
                <Badge variant="secondary">Product Shot AI</Badge>
              </div>
              <DialogTitle className="text-xl">
                {fr ? 'Créez les nouvelles vues de votre produit' : 'Create new views of your product'}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl">
                {fr
                  ? 'Choisissez une ou plusieurs images source du même produit. La première est la référence principale, les autres aident l’IA à conserver la forme, les matières et les détails.'
                  : 'Choose one or more source images of the same product. The first is the primary reference; the others help the AI preserve shape, materials and details.'}
              </DialogDescription>
            </div>
            {selectedProducts.length > 1 && currentProduct && (
              <Badge variant="outline">{fr ? 'Produit' : 'Product'} {currentProductIndex + 1}/{selectedProducts.length}</Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh]">
          <div className="space-y-5 p-6">
            {currentProduct ? (
              <Card className="border-slate-200 p-4 shadow-none">
                <div className="flex items-center gap-4">
                  {currentProduct.image_url ? (
                    <img src={currentProduct.image_url} alt={currentProduct.title} className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain p-1" />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-xl bg-slate-100 text-slate-300"><ImageIcon className="h-7 w-7" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-950">{currentProduct.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentProduct.vendor && <Badge variant="secondary">{currentProduct.vendor}</Badge>}
                      <Badge variant="outline">{selectedSourceImages.length} {fr ? 'référence(s)' : 'reference(s)'}</Badge>
                      <Badge variant="outline">{generationCount} {fr ? 'sortie(s)' : 'output(s)'}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid min-h-64 place-items-center text-sm text-slate-500">
                {fr ? 'Aucun produit sélectionné.' : 'No product selected.'}
              </div>
            )}

            {currentProduct && currentGeneratedImages.length === 0 && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">1</span>
                        <h3 className="font-semibold text-slate-950">{fr ? 'Images source' : 'Source images'}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {fr
                          ? 'Sélectionnez jusqu’à 5 vues du produit. Utilisez plusieurs angles quand ils sont disponibles pour une meilleure fidélité.'
                          : 'Select up to 5 product views. Use multiple angles when available for better fidelity.'}
                      </p>
                    </div>
                    <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50">{selectedSourceImages.length}/5</Badge>
                  </div>

                  <div className="mt-4">
                    {isLoadingSources ? (
                      <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{fr ? 'Chargement des images…' : 'Loading images…'}</div>
                    ) : availableSourceImages.length === 0 ? (
                      <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                        {fr ? 'Aucune image disponible pour ce produit.' : 'No images available for this product.'}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {availableSourceImages.map((imageUrl, index) => {
                          const selectedPosition = selectedSourceOrder.get(imageUrl);
                          const selected = Boolean(selectedPosition);
                          const primary = selectedPosition === 1;
                          return (
                            <div key={imageUrl} className={`overflow-hidden rounded-xl border bg-white transition ${selected ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200'}`}>
                              <button type="button" onClick={() => toggleSourceImage(imageUrl)} className="relative block aspect-square w-full overflow-hidden bg-slate-50">
                                <img src={imageUrl} alt={`${currentProduct.title} ${index + 1}`} className="h-full w-full object-contain p-3" />
                                <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm">
                                  {index === 0 ? (fr ? 'Principale catalogue' : 'Catalog main') : `${fr ? 'Galerie' : 'Gallery'} ${index + 1}`}
                                </span>
                                {selected && (
                                  <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white shadow-sm">{selectedPosition}</span>
                                )}
                              </button>
                              <div className="flex items-center justify-between gap-2 p-2">
                                <span className={`text-[11px] font-semibold ${selected ? 'text-violet-700' : 'text-slate-500'}`}>
                                  {selected ? (primary ? (fr ? 'Référence principale' : 'Primary reference') : (fr ? 'Référence active' : 'Active reference')) : (fr ? 'Ajouter' : 'Add')}
                                </span>
                                {selected && !primary && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => makePrimarySource(imageUrl)}>
                                    <Star className="mr-1 h-3 w-3" />{fr ? 'Principal' : 'Primary'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">2</span>
                    <h3 className="font-semibold text-slate-950">{fr ? 'Product Shots à générer' : 'Product Shots to generate'}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {fr ? 'Choisissez uniquement les vues utiles pour ce produit.' : 'Choose only the views that are useful for this product.'}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {IMAGE_TYPES.map((type) => {
                      const selected = selectedImageTypes.has(type.id);
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleImageType(type.id)}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-violet-400 bg-violet-50/60' : 'border-slate-200 hover:border-violet-200'}`}
                        >
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {selected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </span>
                          <span className="text-sm font-medium text-slate-800">{fr ? type.label : type.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">3</span>
                    <h3 className="font-semibold text-slate-950">{fr ? 'Décor et instructions' : 'Decor and instructions'}</h3>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setIncludeDecor((value) => !value)}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{fr ? 'Ajouter une image lifestyle en décor' : 'Add one lifestyle decor image'}</p>
                        <p className="mt-1 text-xs text-slate-500">{fr ? 'Optionnel · générée avec les mêmes références produit.' : 'Optional · generated from the same product references.'}</p>
                      </div>
                      <span className={`grid h-7 w-7 place-items-center rounded-full border ${includeDecor ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-4 w-4" /></span>
                    </button>

                    {includeDecor && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {DECOR_TYPES.map((decor) => {
                          const Icon = decor.icon;
                          const selected = decorType === decor.id;
                          return (
                            <button
                              key={decor.id}
                              type="button"
                              onClick={() => setDecorType(decor.id)}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selected ? 'border-violet-400 bg-white text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              <Icon className="h-4 w-4" />{fr ? decor.label : decor.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="product-shot-instructions">{fr ? 'Instructions optionnelles' : 'Optional instructions'}</Label>
                    <Textarea
                      id="product-shot-instructions"
                      value={customPrompt}
                      onChange={(event) => setCustomPrompt(event.target.value)}
                      placeholder={fr ? 'Ex. conserver exactement les pieds en laiton, texture bouclée beige, aucune modification du design…' : 'E.g. keep the brass legs exactly, beige boucle texture, no design changes…'}
                      className="min-h-24 resize-none"
                      maxLength={1000}
                    />
                    <p className="text-right text-[11px] text-slate-400">{customPrompt.length}/1000</p>
                  </div>
                </section>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-violet-700" />
                    <div>
                      <p className="text-sm font-semibold text-violet-950">
                        {fr ? `${generationCount} rendu(s) · ${selectedSourceImages.length} image(s) de référence` : `${generationCount} output(s) · ${selectedSourceImages.length} reference image(s)`}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-violet-800/70">
                        {fr ? 'Les références supplémentaires sont réellement envoyées au modèle pour préserver la géométrie et les détails du produit.' : 'Additional references are actually sent to the model to preserve product geometry and details.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentProduct && currentGeneratedImages.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-violet-700" /><h3 className="font-semibold text-slate-950">{fr ? 'Résultats Product Shot' : 'Product Shot results'}</h3></div>
                    <p className="mt-1 text-sm text-slate-500">
                      {fr ? 'Décochez les images que vous ne souhaitez pas conserver.' : 'Uncheck images you do not want to keep.'}
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedGeneratedImages.length}/{currentGeneratedImages.length} {fr ? 'sélectionnée(s)' : 'selected'}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentGeneratedImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => toggleGeneratedImage(image.id)}
                      className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${image.selected ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200 opacity-60'}`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-50">
                        <img src={image.url} alt={image.label} className="h-full w-full object-contain" />
                        <span className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full shadow-sm ${image.selected ? 'bg-violet-600 text-white' : 'bg-white text-transparent'}`}><Check className="h-4 w-4" /></span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-slate-900">{image.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{image.type}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <Card className="border-slate-200 p-4 shadow-none">
                  <div className="grid gap-3 md:grid-cols-[1fr_320px] md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{fr ? 'Image principale du produit' : 'Product main image'}</p>
                      <p className="mt-1 text-xs text-slate-500">{fr ? 'Par défaut, l’image principale actuelle reste inchangée.' : 'By default, the current main image stays unchanged.'}</p>
                    </div>
                    <Select value={mainImageId} onValueChange={setMainImageId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">{fr ? 'Conserver l’image actuelle' : 'Keep current image'}</SelectItem>
                        {selectedGeneratedImages.map((image) => (
                          <SelectItem key={image.id} value={image.id}>{image.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              </section>
            )}

            {(isGenerating || progress > 0) && currentGeneratedImages.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-800">{isGenerating && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}{fr ? 'Génération en cours' : 'Generating'}</span>
                  <span className="text-slate-500">{progress}%</span>
                </div>
                <Progress value={progress} className="mt-3" />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4 sm:justify-between">
          {currentGeneratedImages.length > 0 ? (
            <>
              <Button variant="outline" onClick={resetGeneration} disabled={isSaving}>
                <RefreshCw className="mr-2 h-4 w-4" />{fr ? 'Modifier et régénérer' : 'Edit and regenerate'}
              </Button>
              <Button onClick={handleSaveSelected} disabled={isSaving || selectedGeneratedImages.length === 0}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {fr ? `Sauvegarder ${selectedGeneratedImages.length} image(s)` : `Save ${selectedGeneratedImages.length} image(s)`}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500"><Images className="h-4 w-4" />{fr ? `${selectedSourceImages.length} référence(s) sélectionnée(s)` : `${selectedSourceImages.length} reference(s) selected`}</div>
              <Button onClick={handleGenerate} disabled={isGenerating || !currentProduct || selectedSourceImages.length === 0 || generationCount === 0}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {fr ? `Générer ${generationCount} Product Shot(s)` : `Generate ${generationCount} Product Shot(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
