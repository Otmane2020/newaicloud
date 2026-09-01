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
  ChevronLeft,
  ChevronRight,
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
  Wand2,
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

type WizardStep = 1 | 2 | 3 | 4;

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
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
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

  const selectedViewLabels = useMemo(
    () => IMAGE_TYPES.filter((type) => selectedImageTypes.has(type.id)).map((type) => fr ? type.label : type.labelEn),
    [selectedImageTypes, fr],
  );

  const wizardSteps = useMemo(() => [
    { id: 1 as WizardStep, label: fr ? 'Références' : 'References', hint: fr ? 'Images source' : 'Source images' },
    { id: 2 as WizardStep, label: fr ? 'Vues' : 'Views', hint: fr ? 'Angles à créer' : 'Angles to create' },
    { id: 3 as WizardStep, label: fr ? 'Décor' : 'Lifestyle', hint: fr ? 'Décor & consignes' : 'Scene & instructions' },
    { id: 4 as WizardStep, label: fr ? 'Vérifier' : 'Review', hint: fr ? 'Résumé & génération' : 'Summary & generate' },
  ], [fr]);

  useEffect(() => {
    if (!open) return;
    setCurrentProductIndex(0);
    setCurrentStep(1);
    setGeneratedImages(new Map());
    setProgress(0);
    setMainImageId('keep');
    setCustomPrompt('');
    setSelectedImageTypes(new Set(['front', 'angle45', 'profile']));
    setIncludeDecor(false);
    setDecorType('living_room');
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
    setCurrentStep(4);
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
        setCurrentStep(1);
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

  const canContinue = currentStep === 1
    ? selectedSourceImages.length > 0
    : currentStep === 2
      ? selectedImageTypes.size > 0 || includeDecor
      : true;

  const nextStep = () => {
    if (!canContinue) return;
    setCurrentStep((step) => Math.min(4, step + 1) as WizardStep);
  };

  const previousStep = () => {
    setCurrentStep((step) => Math.max(1, step - 1) as WizardStep);
  };

  const StepHeader = ({ number, title, description }: { number: number; title: string; description: string }) => (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm">{number}</span>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] max-w-7xl flex-col overflow-hidden border-slate-200 p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 bg-white px-6 py-5 text-left">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Camera className="h-4 w-4" /></span>
                <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">Product Shot AI</Badge>
              </div>
              <DialogTitle className="text-xl font-semibold text-slate-950">
                {fr ? 'Créez de nouvelles vues de votre produit' : 'Create new views of your product'}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-sm leading-6">
                {fr
                  ? 'Un parcours guidé pour choisir les meilleures références, les angles utiles et un décor optionnel avant génération.'
                  : 'A guided workflow to choose the best references, useful angles and an optional lifestyle scene before generation.'}
              </DialogDescription>
            </div>
            {selectedProducts.length > 1 && currentProduct && (
              <Badge variant="outline" className="rounded-full">{fr ? 'Produit' : 'Product'} {currentProductIndex + 1}/{selectedProducts.length}</Badge>
            )}
          </div>

          {currentGeneratedImages.length === 0 && currentProduct && (
            <div className="mt-5 grid grid-cols-4 gap-2">
              {wizardSteps.map((step) => {
                const active = currentStep === step.id;
                const completed = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`group rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-violet-300 bg-violet-50 shadow-sm'
                        : completed
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                        active ? 'bg-violet-600 text-white' : completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {completed ? <Check className="h-3.5 w-3.5" /> : step.id}
                      </span>
                      <span className={`truncate text-xs font-semibold ${active ? 'text-violet-950' : 'text-slate-700'}`}>{step.label}</span>
                    </div>
                    <p className="mt-1 hidden truncate pl-8 text-[10px] text-slate-400 sm:block">{step.hint}</p>
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[72vh] bg-slate-50/50">
          <div className="p-5 sm:p-6">
            {!currentProduct ? (
              <div className="grid min-h-64 place-items-center text-sm text-slate-500">
                {fr ? 'Aucun produit sélectionné.' : 'No product selected.'}
              </div>
            ) : currentGeneratedImages.length > 0 ? (
              <section className="mx-auto max-w-5xl space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-violet-700" /><h3 className="font-semibold text-slate-950">{fr ? 'Résultats Product Shot' : 'Product Shot results'}</h3></div>
                    <p className="mt-1 text-sm text-slate-500">
                      {fr ? 'Sélectionnez les images à conserver, puis choisissez éventuellement une nouvelle image principale.' : 'Select the images to keep, then optionally choose a new main image.'}
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

                <Card className="border-slate-200 bg-white p-4 shadow-none">
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
            ) : (
              <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  {currentStep === 1 && (
                    <>
                      <StepHeader
                        number={1}
                        title={fr ? 'Choisissez les images de référence' : 'Choose source images'}
                        description={fr
                          ? 'Sélectionnez jusqu’à 5 vues du même produit. La première image devient la référence principale ; les autres aident l’IA à préserver forme, matières et détails.'
                          : 'Select up to 5 views of the same product. The first image is the primary reference; the others help AI preserve shape, materials and details.'}
                      />

                      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600"><Images className="h-4 w-4 text-violet-600" />{fr ? 'Références sélectionnées' : 'Selected references'}</div>
                        <Badge className="rounded-full bg-white text-violet-700 hover:bg-white">{selectedSourceImages.length}/5</Badge>
                      </div>

                      {isLoadingSources ? (
                        <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{fr ? 'Chargement des images…' : 'Loading images…'}</div>
                      ) : availableSourceImages.length === 0 ? (
                        <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                          {fr ? 'Aucune image disponible pour ce produit.' : 'No images available for this product.'}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {availableSourceImages.map((imageUrl, index) => {
                            const selectedPosition = selectedSourceOrder.get(imageUrl);
                            const selected = Boolean(selectedPosition);
                            const primary = selectedPosition === 1;
                            return (
                              <div key={imageUrl} className={`overflow-hidden rounded-2xl border bg-white transition ${selected ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 hover:border-slate-300'}`}>
                                <button type="button" onClick={() => toggleSourceImage(imageUrl)} className="relative block aspect-square w-full overflow-hidden bg-slate-50">
                                  <img src={imageUrl} alt={`${currentProduct.title} ${index + 1}`} className="h-full w-full object-contain p-3" />
                                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm">
                                    {index === 0 ? (fr ? 'Principale catalogue' : 'Catalog main') : `${fr ? 'Galerie' : 'Gallery'} ${index + 1}`}
                                  </span>
                                  {selected && (
                                    <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white shadow-sm">{selectedPosition}</span>
                                  )}
                                </button>
                                <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-2">
                                  <span className={`text-[11px] font-semibold ${selected ? 'text-violet-700' : 'text-slate-500'}`}>
                                    {selected ? (primary ? (fr ? 'Référence principale' : 'Primary reference') : (fr ? 'Référence active' : 'Active reference')) : (fr ? 'Ajouter comme référence' : 'Add as reference')}
                                  </span>
                                  {selected && !primary && (
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[10px]" onClick={() => makePrimarySource(imageUrl)}>
                                      <Star className="mr-1 h-3 w-3" />{fr ? 'Principal' : 'Primary'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      <StepHeader
                        number={2}
                        title={fr ? 'Choisissez les vues à générer' : 'Choose views to generate'}
                        description={fr
                          ? 'Sélectionnez uniquement les angles et gros plans utiles. Chaque sélection produit une nouvelle image.'
                          : 'Select only the useful angles and close-ups. Each selection creates one new image.'}
                      />
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {IMAGE_TYPES.map((type) => {
                          const selected = selectedImageTypes.has(type.id);
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => toggleImageType(type.id)}
                              className={`group flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50'}`}
                            >
                              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>
                                {selected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0">
                                <span className="block text-sm font-semibold text-slate-900">{fr ? type.label : type.labelEn}</span>
                                <span className="mt-1 block text-[11px] text-slate-400">{selected ? (fr ? 'Sera générée' : 'Will be generated') : (fr ? 'Cliquer pour ajouter' : 'Click to add')}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      <StepHeader
                        number={3}
                        title={fr ? 'Ajoutez un décor ou des consignes' : 'Add lifestyle scene or instructions'}
                        description={fr
                          ? 'Le décor lifestyle est optionnel. Vous pouvez aussi préciser les éléments que l’IA ne doit surtout pas modifier.'
                          : 'The lifestyle scene is optional. You can also specify details the AI must preserve exactly.'}
                      />

                      <button
                        type="button"
                        onClick={() => setIncludeDecor((value) => !value)}
                        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${includeDecor ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-slate-50/60 hover:border-violet-200'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${includeDecor ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 shadow-sm'}`}><Home className="h-4 w-4" /></span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{fr ? 'Ajouter une image lifestyle' : 'Add one lifestyle image'}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{fr ? 'Une sortie supplémentaire, générée à partir des mêmes références produit.' : 'One additional output generated from the same product references.'}</p>
                          </div>
                        </div>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${includeDecor ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-4 w-4" /></span>
                      </button>

                      {includeDecor && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {DECOR_TYPES.map((decor) => {
                            const Icon = decor.icon;
                            const selected = decorType === decor.id;
                            return (
                              <button
                                key={decor.id}
                                type="button"
                                onClick={() => setDecorType(decor.id)}
                                className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${selected ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'}`}
                              >
                                <span className={`grid h-8 w-8 place-items-center rounded-lg ${selected ? 'bg-white text-violet-700' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
                                {fr ? decor.label : decor.labelEn}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-6 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="product-shot-instructions">{fr ? 'Instructions optionnelles' : 'Optional instructions'}</Label>
                          <span className="text-[11px] text-slate-400">{customPrompt.length}/1000</span>
                        </div>
                        <Textarea
                          id="product-shot-instructions"
                          value={customPrompt}
                          onChange={(event) => setCustomPrompt(event.target.value)}
                          placeholder={fr ? 'Ex. conserver exactement les pieds, les rainures, les poignées et les proportions. Ne pas modifier les matériaux ni les couleurs.' : 'E.g. preserve the legs, grooves, handles and proportions exactly. Do not change materials or colors.'}
                          className="min-h-32 resize-none rounded-xl border-slate-200 bg-white"
                          maxLength={1000}
                        />
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(fr
                            ? ['Préserver les proportions', 'Ne pas modifier les couleurs', 'Conserver les matières', 'Fond propre et réaliste']
                            : ['Preserve proportions', 'Do not change colors', 'Keep materials', 'Clean realistic result']
                          ).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setCustomPrompt((value) => value ? `${value}\n${suggestion}.` : `${suggestion}.`)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {currentStep === 4 && (
                    <>
                      <StepHeader
                        number={4}
                        title={fr ? 'Vérifiez avant de générer' : 'Review before generating'}
                        description={fr
                          ? 'Tout est prêt. Vérifiez les références, les sorties demandées et les consignes avant de lancer Product Shot AI.'
                          : 'Everything is ready. Review references, requested outputs and instructions before launching Product Shot AI.'}
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Card className="border-slate-200 p-4 shadow-none">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Images className="h-4 w-4" /></span>
                            <div><p className="text-xs text-slate-500">{fr ? 'Références' : 'References'}</p><p className="text-base font-semibold text-slate-950">{selectedSourceImages.length}/5</p></div>
                          </div>
                        </Card>
                        <Card className="border-slate-200 p-4 shadow-none">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Sparkles className="h-4 w-4" /></span>
                            <div><p className="text-xs text-slate-500">{fr ? 'Sorties' : 'Outputs'}</p><p className="text-base font-semibold text-slate-950">{generationCount}</p></div>
                          </div>
                        </Card>
                      </div>

                      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                          <div><p className="text-xs font-medium text-slate-500">{fr ? 'Vues sélectionnées' : 'Selected views'}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{selectedViewLabels.join(' · ') || '—'}</p></div>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>{fr ? 'Modifier' : 'Edit'}</Button>
                        </div>
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                          <div><p className="text-xs font-medium text-slate-500">Lifestyle</p><p className="mt-1 text-sm font-semibold text-slate-900">{includeDecor ? (fr ? DECOR_TYPES.find((item) => item.id === decorType)?.label : DECOR_TYPES.find((item) => item.id === decorType)?.labelEn) : (fr ? 'Non' : 'No')}</p></div>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>{fr ? 'Modifier' : 'Edit'}</Button>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{fr ? 'Consignes' : 'Instructions'}</p><p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">{customPrompt.trim() || (fr ? 'Aucune consigne supplémentaire.' : 'No extra instructions.')}</p></div>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>{fr ? 'Modifier' : 'Edit'}</Button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                        <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
                        <div>
                          <p className="text-sm font-semibold text-violet-950">{fr ? 'Fidélité produit prioritaire' : 'Product fidelity first'}</p>
                          <p className="mt-1 text-xs leading-5 text-violet-800/75">{fr ? 'Toutes les références sélectionnées sont envoyées au modèle pour préserver la géométrie, les matières, les couleurs et les détails.' : 'All selected references are sent to the model to preserve geometry, materials, colors and details.'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                    <div className="aspect-[4/3] bg-slate-50 p-4">
                      {currentProduct.image_url ? (
                        <img src={currentProduct.image_url} alt={currentProduct.title} className="h-full w-full rounded-xl object-contain" />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-300"><ImageIcon className="h-8 w-8" /></div>
                      )}
                    </div>
                    <div className="border-t border-slate-100 p-4">
                      <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{currentProduct.title}</p>
                      {currentProduct.vendor && <p className="mt-1 text-xs text-slate-500">{currentProduct.vendor}</p>}
                    </div>
                  </Card>

                  <Card className="border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{fr ? 'Résumé' : 'Summary'}</p>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{fr ? 'Références' : 'References'}</span><strong className="text-slate-900">{selectedSourceImages.length}</strong></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{fr ? 'Vues' : 'Views'}</span><strong className="text-slate-900">{selectedImageTypes.size}</strong></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Lifestyle</span><strong className="text-slate-900">{includeDecor ? (fr ? 'Oui' : 'Yes') : (fr ? 'Non' : 'No')}</strong></div>
                      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-3"><span className="font-medium text-slate-700">{fr ? 'Total sorties' : 'Total outputs'}</span><Badge className="rounded-full bg-violet-600">{generationCount}</Badge></div>
                    </div>
                  </Card>
                </aside>
              </div>
            )}

            {(isGenerating || progress > 0) && currentGeneratedImages.length === 0 && (
              <div className="mx-auto mt-5 max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-800">{isGenerating && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}{fr ? 'Génération en cours' : 'Generating'}</span>
                  <span className="text-slate-500">{progress}%</span>
                </div>
                <Progress value={progress} className="mt-3" />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6 sm:justify-between">
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
              <div className="flex min-h-10 items-center gap-2 text-xs text-slate-500">
                <Images className="h-4 w-4" />
                {fr ? `${selectedSourceImages.length} référence(s) · ${generationCount} sortie(s)` : `${selectedSourceImages.length} reference(s) · ${generationCount} output(s)`}
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={previousStep} disabled={isGenerating} className="flex-1 sm:flex-none">
                    <ChevronLeft className="mr-1 h-4 w-4" />{fr ? 'Retour' : 'Back'}
                  </Button>
                )}
                {currentStep < 4 ? (
                  <Button onClick={nextStep} disabled={!canContinue || isGenerating} className="flex-1 sm:min-w-32 sm:flex-none">
                    {fr ? 'Continuer' : 'Continue'}<ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleGenerate} disabled={isGenerating || !currentProduct || selectedSourceImages.length === 0 || generationCount === 0} className="flex-1 sm:min-w-48 sm:flex-none">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {fr ? `Générer ${generationCount} Product Shot(s)` : `Generate ${generationCount} Product Shot(s)`}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
