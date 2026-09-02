import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { useQueryClient } from "@tanstack/react-query";

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  shopify_image_id?: number | null;
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_url?: string | null;
  sku?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
}

interface Product {
  id: string;
  title: string;
  shopify_id: number | null;
  variants?: ProductVariant[];
}

interface ProductGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  storeId: string | null;
  onMainImageChange?: (productId: string, newMainImageUrl: string) => void;
}

type ProcessingAction = "white" | "ambiance" | "delete" | "upload" | null;

export function ProductGalleryDialog({
  open,
  onOpenChange,
  product: controlledProduct,
  storeId,
  onMainImageChange,
}: ProductGalleryDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [autoProduct, setAutoProduct] = useState<Product | null>(null);
  const product = controlledProduct ?? autoProduct;

  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<ProcessingAction>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [ambianceTarget, setAmbianceTarget] = useState<ProductImage | null>(null);
  const [ambiancePrompt, setAmbiancePrompt] = useState(
    "Create a premium realistic lifestyle scene around the product. Preserve the product exactly: same shape, color, proportions, materials and details. Natural editorial lighting, elegant interior, ecommerce quality.",
  );

  const normalizeUrl = (url?: string | null) => {
    if (!url) return "";
    const withoutQuery = url.split("?")[0];
    let filename = withoutQuery;
    try {
      filename = new URL(withoutQuery).pathname.split("/").pop() || withoutQuery;
    } catch {
      filename = withoutQuery.split("/").pop() || withoutQuery;
    }
    filename = decodeURIComponent(filename);
    filename = filename.replace(
      /_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$)/i,
      "",
    );
    filename = filename.replace(/_\d+x\d+(?=\.[a-zA-Z0-9]+$)/i, "");
    filename = filename.replace(/_\d+(?=\.[a-zA-Z0-9]+$)/i, "");
    return filename.toLowerCase();
  };

  const invalidateProductQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["product-images"] }),
      queryClient.invalidateQueries({ queryKey: ["products-with-images"] }),
      queryClient.invalidateQueries({ queryKey: ["shopify-products"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };

  // The grid already opens the gallery directly. This capture listener makes the
  // thumbnail in the table view behave exactly the same way without triggering
  // the row-level product preview first.
  useEffect(() => {
    const handleTableThumbnailClick = async (event: MouseEvent) => {
      if (window.location.pathname !== "/products/title-description") return;

      const target = event.target as HTMLElement | null;
      const image = target?.closest("table img") as HTMLImageElement | null;
      if (!image) return;

      const source = image.getAttribute("src") || image.currentSrc || image.src;
      if (!source) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        let query = supabase
          .from("shopify_products")
          .select("id, title, shopify_id")
          .eq("image_url", source);

        if (storeId) query = query.eq("store_id", storeId);

        const { data, error } = await query.maybeSingle();
        if (error || !data) {
          console.warn("[Gallery] Could not resolve table thumbnail product", error);
          return;
        }

        setAutoProduct(data as Product);
        onOpenChange(true);
      } catch (error) {
        console.error("[Gallery] Failed to open gallery from table thumbnail", error);
      }
    };

    document.addEventListener("click", handleTableThumbnailClick, true);
    return () => document.removeEventListener("click", handleTableThumbnailClick, true);
  }, [onOpenChange, storeId]);

  const loadImages = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, src, alt_text, position, shopify_image_id")
        .eq("product_id", product.id)
        .order("position", { ascending: true })
        .limit(100);

      if (error) throw error;

      const uniqueImages = data
        ? Object.values(
            data.reduce<Record<string, ProductImage>>((acc, img) => {
              const key = normalizeUrl(img.src) || img.id;
              const existing = acc[key];
              if (!existing) {
                acc[key] = img;
                return acc;
              }
              if (!!img.shopify_image_id && !existing.shopify_image_id) {
                acc[key] = img;
                return acc;
              }
              if (!img.shopify_image_id && !!existing.shopify_image_id) return acc;
              if ((img.position ?? 999) < (existing.position ?? 999)) acc[key] = img;
              return acc;
            }, {}),
          ).sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        : [];

      setImages(uniqueImages);
    } catch (error) {
      console.error("Error loading images:", error);
      toast.error(t.toasts.error.loading || "Error loading images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && product?.id) {
      loadImages();
    } else if (!open) {
      setImages([]);
      setAmbianceTarget(null);
      setLightboxOpen(false);
      if (!controlledProduct) setAutoProduct(null);
    }
  }, [open, product?.id, controlledProduct]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const goToPrevious = () => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  const goToNext = () => setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, images.length]);

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
  };

  const saveOrderToShopify = async (imagesToSave: ProductImage[]) => {
    if (!product) return;
    setSaving(true);
    try {
      await Promise.all(
        imagesToSave.map((img) =>
          supabase.from("product_images").update({ position: img.position }).eq("id", img.id),
        ),
      );

      if (imagesToSave.length > 0) {
        const newMainImage = imagesToSave[0].src;
        await supabase
          .from("shopify_products")
          .update({ image_url: newMainImage, updated_at: new Date().toISOString() })
          .eq("id", product.id);
        onMainImageChange?.(product.id, newMainImage);
      }

      if (product.shopify_id) {
        const shopifyImages = imagesToSave
          .filter((img) => img.shopify_image_id)
          .map((img, idx) => ({
            id: img.shopify_image_id,
            shopify_image_id: img.shopify_image_id,
            position: idx + 1,
            src: img.src,
            alt: img.alt_text,
          }));

        if (shopifyImages.length > 1) {
          const { data, error } = await supabase.functions.invoke("sync-product-images-to-shopify", {
            body: {
              productId: product.id,
              shopifyProductId: product.shopify_id,
              storeId,
              images: shopifyImages,
              isReorderOnly: true,
            },
          });
          if (error || data?.error) throw new Error(data?.error || error?.message || "Shopify reorder failed");
        }
      }

      await invalidateProductQueries();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error(t.toasts.error.saving);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const reordered = [...images];
      const [draggedItem] = reordered.splice(draggedIndex, 1);
      reordered.splice(dragOverIndex, 0, draggedItem);
      const normalized = reordered.map((img, idx) => ({ ...img, position: idx + 1 }));
      setImages(normalized);
      await saveOrderToShopify(normalized);
      toast.success(t.toasts.success.synchronized || "Gallery order synchronized");
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const syncNewImageToShopify = async () => {
    if (!product?.shopify_id) return;
    const { data, error } = await supabase.functions.invoke("sync-product-images-to-shopify", {
      body: { productId: product.id, allowCreateReplace: true },
    });
    if (error || data?.error) {
      throw new Error(data?.error || error?.message || "Shopify image sync failed");
    }
  };

  const addImageToGallery = async (
    src: string,
    altText: string,
    isAiGenerated: boolean,
  ) => {
    if (!product) throw new Error("Product missing");
    const nextPosition = images.reduce((max, image) => Math.max(max, image.position || 0), 0) + 1;

    const { data, error } = await supabase
      .from("product_images")
      .insert({
        product_id: product.id,
        src,
        alt_text: altText,
        position: nextPosition,
        is_ai_generated: isAiGenerated,
      } as any)
      .select("id, src, alt_text, position, shopify_image_id")
      .single();

    if (error || !data) throw error || new Error("Could not save image");
    setImages((prev) => [...prev, data]);

    try {
      await syncNewImageToShopify();
      await loadImages();
      toast.success(product.shopify_id ? "Image ajoutée et synchronisée avec Shopify" : "Image ajoutée à la galerie");
    } catch (syncError: any) {
      console.error("Image saved locally but Shopify sync failed:", syncError);
      toast.warning("Image ajoutée à la galerie, mais la synchronisation Shopify a échoué", {
        description: syncError?.message,
      });
    }

    await invalidateProductQueries();
  };

  const handleGenerateWhiteBackground = async (image: ProductImage) => {
    if (!product) return;
    setProcessingImageId(image.id);
    setProcessingAction("white");
    const toastId = toast.loading("Génération du fond blanc...");

    try {
      const { data, error } = await supabase.functions.invoke("generate-white-background", {
        body: {
          imageUrl: image.src,
          productTitle: product.title,
          imageType: "secondary",
          product_id: product.id,
          format: "square",
          mode: "standard",
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.imageUrl) throw new Error(data?.error || "Aucune image générée");

      await addImageToGallery(data.imageUrl, `${product.title} - Fond blanc IA`, true);
      toast.success("Fond blanc généré", { id: toastId });
    } catch (error: any) {
      console.error("White background generation failed:", error);
      toast.error("Impossible de générer le fond blanc", { id: toastId, description: error?.message });
    } finally {
      setProcessingImageId(null);
      setProcessingAction(null);
    }
  };

  const handleGenerateAmbiance = async () => {
    if (!product || !ambianceTarget) return;
    if (!ambiancePrompt.trim()) {
      toast.error("Ajoutez une description d’ambiance");
      return;
    }

    const target = ambianceTarget;
    setProcessingImageId(target.id);
    setProcessingAction("ambiance");
    const toastId = toast.loading("Création de l’ambiance IA...");

    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-product-background", {
        body: {
          imageUrl: target.src,
          productTitle: product.title,
          productId: product.id,
          imageId: target.id,
          prompt: ambiancePrompt.trim(),
          enrichedPrompt: ambiancePrompt.trim(),
          style: "lifestyle",
          format: "square",
          targetType: "variant",
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.imageUrl) throw new Error(data?.error || data?.message || "Aucune image générée");

      await addImageToGallery(data.imageUrl, `${product.title} - Ambiance IA`, true);
      setAmbianceTarget(null);
      toast.success("Ambiance générée", { id: toastId });
    } catch (error: any) {
      console.error("AI ambiance generation failed:", error);
      toast.error("Impossible de générer l’ambiance", { id: toastId, description: error?.message });
    } finally {
      setProcessingImageId(null);
      setProcessingAction(null);
    }
  };

  const handleUpload = async (file?: File) => {
    if (!product || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sélectionnez un fichier image");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("L’image ne doit pas dépasser 12 Mo");
      return;
    }

    setProcessingAction("upload");
    const toastId = toast.loading("Upload de l’image...");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `manual-uploads/${product.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("generated-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("generated-images").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;
      if (!publicUrl) throw new Error("Public URL unavailable");

      await addImageToGallery(publicUrl, `${product.title} - ${safeName}`, false);
      toast.success("Image uploadée", { id: toastId });
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error("Upload impossible", { id: toastId, description: error?.message });
    } finally {
      setProcessingAction(null);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!product) return;
    const imageToDelete = images.find((img) => img.id === imageId);
    if (!imageToDelete) return;

    setProcessingImageId(imageId);
    setProcessingAction("delete");
    const toastId = toast.loading(product.shopify_id ? "Suppression dans Shopify..." : "Suppression de l’image...");

    try {
      // Shopify is always checked first when the product exists there. The Edge
      // Function can resolve the media either by shopify_image_id OR by URL, so
      // old rows with a missing local Shopify image ID are handled correctly too.
      if (product.shopify_id) {
        const { data, error } = await supabase.functions.invoke("delete-product-image-from-shopify", {
          body: {
            productId: product.id,
            shopifyImageId: imageToDelete.shopify_image_id ?? null,
            imageUrl: imageToDelete.src,
          },
        });

        const deletionConfirmed = data?.success && (data?.deletedCount === 1 || data?.alreadyAbsent === true);
        if (error || !deletionConfirmed) {
          throw new Error(data?.error || error?.message || "Shopify n’a pas confirmé la suppression");
        }
      }

      const { error: dbError } = await supabase.from("product_images").delete().eq("id", imageId);
      if (dbError) throw dbError;

      const remainingImages = images
        .filter((img) => img.id !== imageId)
        .map((img, idx) => ({ ...img, position: idx + 1 }));

      if (remainingImages.length > 0) {
        await Promise.all(
          remainingImages.map((img) =>
            supabase.from("product_images").update({ position: img.position }).eq("id", img.id),
          ),
        );

        const newMainImage = remainingImages[0].src;
        await supabase
          .from("shopify_products")
          .update({ image_url: newMainImage, updated_at: new Date().toISOString() })
          .eq("id", product.id);
        onMainImageChange?.(product.id, newMainImage);

        if (product.shopify_id) {
          const reorderImages = remainingImages
            .filter((img) => img.shopify_image_id)
            .map((img, idx) => ({
              id: img.shopify_image_id,
              shopify_image_id: img.shopify_image_id,
              position: idx + 1,
              src: img.src,
              alt: img.alt_text,
            }));

          if (reorderImages.length > 1) {
            const { data: reorderData, error: reorderError } = await supabase.functions.invoke(
              "sync-product-images-to-shopify",
              {
                body: {
                  productId: product.id,
                  storeId,
                  images: reorderImages,
                  isReorderOnly: true,
                },
              },
            );
            if (reorderError || reorderData?.error) {
              console.warn("Image deleted but reorder failed:", reorderData?.error || reorderError);
            }
          }
        }
      } else {
        await supabase
          .from("shopify_products")
          .update({ image_url: null, updated_at: new Date().toISOString() })
          .eq("id", product.id);
      }

      setImages(remainingImages);
      if (lightboxIndex >= remainingImages.length) setLightboxIndex(Math.max(0, remainingImages.length - 1));
      await invalidateProductQueries();
      toast.success(product.shopify_id
        ? "Image supprimée de Shopify et de la galerie"
        : "Image supprimée de la galerie", { id: toastId });
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error("Suppression annulée : l’image est conservée", {
        id: toastId,
        description: error?.message || t.toasts.error.deleting,
      });
    } finally {
      setProcessingImageId(null);
      setProcessingAction(null);
    }
  };

  const hasVariants = product?.variants && product.variants.length > 1;
  const mainImageUrlSet = new Set(images.map((img) => normalizeUrl(img.src)).filter(Boolean));
  const busy = processingAction !== null || saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-white px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-violet-600" />
                Galerie produit
              </DialogTitle>
              <p className="mt-1 max-w-2xl truncate text-sm text-muted-foreground" data-no-translate>
                {product?.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-lg px-2.5 py-1">
                {images.length} image{images.length > 1 ? "s" : ""}
              </Badge>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUpload(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => uploadInputRef.current?.click()}
                disabled={busy}
                className="gap-2"
              >
                {processingAction === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Uploader
              </Button>
            </div>
          </div>
        </DialogHeader>

        {ambianceTarget && (
          <div className="shrink-0 border-b bg-violet-50/60 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Générer une ambiance depuis l’image #{images.findIndex((img) => img.id === ambianceTarget.id) + 1}
                </div>
                <Textarea
                  value={ambiancePrompt}
                  onChange={(event) => setAmbiancePrompt(event.target.value)}
                  rows={2}
                  className="resize-none bg-white"
                  placeholder="Ex. salon parisien élégant, lumière naturelle, parquet chevrons..."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setAmbianceTarget(null)} disabled={processingAction === "ambiance"}>
                  Annuler
                </Button>
                <Button onClick={handleGenerateAmbiance} disabled={processingAction === "ambiance"} className="gap-2">
                  {processingAction === "ambiance" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Générer l’ambiance
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 bg-slate-50/70">
          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : images.length === 0 ? (
              <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Aucune image</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ajoutez une image pour démarrer la galerie produit.</p>
                <Button className="mt-4 gap-2" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Uploader une image
                </Button>
              </div>
            ) : (
              <div className="space-y-7">
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Toutes les images</h3>
                      <p className="text-xs text-slate-500">Cliquez sur une image pour l’agrandir. Glissez les cartes pour changer l’ordre.</p>
                    </div>
                    <Badge variant="secondary" className="font-normal">La première image est l’image principale</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {images.map((image, index) => {
                      const isProcessing = processingImageId === image.id;
                      return (
                        <div
                          key={image.id}
                          draggable={!busy}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                            draggedIndex === index ? "scale-[0.98] opacity-50" : ""
                          } ${dragOverIndex === index ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200 hover:border-violet-200 hover:shadow-md"}`}
                        >
                          <div className="relative aspect-square overflow-hidden bg-slate-100">
                            <button type="button" onClick={() => openLightbox(index)} className="h-full w-full" disabled={busy}>
                              <img
                                src={image.src}
                                alt={image.alt_text || `Image ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            </button>

                            <div className="absolute left-2 top-2 flex items-center gap-1.5">
                              <Badge className="bg-slate-950/80 text-white hover:bg-slate-950/80">#{index + 1}</Badge>
                              {index === 0 && <Badge className="bg-violet-600 text-white hover:bg-violet-600">Principale</Badge>}
                            </div>
                            {image.shopify_image_id && (
                              <Badge variant="secondary" className="absolute right-2 top-2 bg-white/90 text-[10px] shadow-sm backdrop-blur">
                                Shopify
                              </Badge>
                            )}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-700 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <ZoomIn className="h-4 w-4" />
                              </span>
                              <span className="grid h-8 w-8 cursor-grab place-items-center rounded-lg bg-white/90 text-slate-700 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <GripVertical className="h-4 w-4" />
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 p-2.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 px-2 text-xs"
                              disabled={busy}
                              onClick={() => handleGenerateWhiteBackground(image)}
                              title="Générer un fond blanc"
                            >
                              {isProcessing && processingAction === "white" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                              <span className="hidden 2xl:inline">Fond blanc</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 px-2 text-xs"
                              disabled={busy}
                              onClick={() => setAmbianceTarget(image)}
                              title="Générer une ambiance IA"
                            >
                              {isProcessing && processingAction === "ambiance" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-violet-600" />}
                              <span className="hidden 2xl:inline">Ambiance</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={busy}
                              onClick={() => handleDeleteImage(image.id)}
                              title="Supprimer l’image de Shopify et de la galerie"
                            >
                              {isProcessing && processingAction === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              <span className="hidden 2xl:inline">Supprimer</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {hasVariants && (
                  <div className="border-t pt-6">
                    <h3 className="mb-3 text-sm font-semibold">Images de variantes non présentes dans la galerie</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {Array.from(
                        new Map(
                          (product?.variants || [])
                            .filter((variant) => variant.image_url)
                            .filter((variant) => !mainImageUrlSet.has(normalizeUrl(variant.image_url)))
                            .map((variant) => [normalizeUrl(variant.image_url!), variant]),
                        ).values(),
                      ).map((variant) => (
                        <div key={variant.id} className="overflow-hidden rounded-xl border bg-white">
                          <div className="aspect-square overflow-hidden bg-slate-100">
                            <img src={variant.image_url!} alt={variant.title} className="h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-medium">{variant.option1 || variant.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {(saving || processingAction) && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t bg-white px-4 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {processingAction === "delete"
              ? "Synchronisation de la suppression avec Shopify..."
              : processingAction === "white"
                ? "Génération du fond blanc..."
                : processingAction === "ambiance"
                  ? "Génération de l’ambiance..."
                  : processingAction === "upload"
                    ? "Upload et synchronisation..."
                    : "Synchronisation de la galerie..."}
          </div>
        )}
      </DialogContent>

      {lightboxOpen && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-6 top-6 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-8 w-8" />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-6 z-10 rounded-full bg-black/50 p-4 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              key={lightboxIndex}
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt_text || `Image ${lightboxIndex + 1}`}
              className="block rounded-lg shadow-2xl"
              style={{
                maxWidth: "calc(100vw - 160px)",
                maxHeight: "calc(100vh - 120px)",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-6 z-10 rounded-full bg-black/50 p-4 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2.5 text-base font-medium text-white">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </Dialog>
  );
}
