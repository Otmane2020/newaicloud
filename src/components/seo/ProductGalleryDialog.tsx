import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GripVertical,
  Loader2,
  Save,
  Image as ImageIcon,
  X,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
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

export function ProductGalleryDialog({
  open,
  onOpenChange,
  product,
  storeId,
  onMainImageChange,
}: ProductGalleryDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Handle keyboard navigation in lightbox
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

  useEffect(() => {
    if (open && product?.id) {
      loadImages();
    } else if (!open) {
      setImages([]);
    }
  }, [open, product?.id]);

  const normalizeUrl = (url?: string | null) => {
    if (!url) return "";

    const withoutQuery = url.split("?")[0];

    // Prefer dedupe by filename so that the same image hosted on different domains
    // (e.g., generated-images storage vs Shopify CDN) is treated as identical.
    let filename = withoutQuery;
    try {
      filename = new URL(withoutQuery).pathname.split("/").pop() || withoutQuery;
    } catch {
      filename = withoutQuery.split("/").pop() || withoutQuery;
    }

    filename = decodeURIComponent(filename);

    // Shopify sometimes appends a UUID to filenames when duplicating uploads.
    filename = filename.replace(
      /_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$)/i,
      ""
    );

    // Shopify CDN variants often use _WIDTHxHEIGHT suffixes.
    filename = filename.replace(/_\d+x\d+(?=\.[a-zA-Z0-9]+$)/i, "");

    // Remove numeric suffixes like _1, _2, _3 etc. (Shopify duplicates)
    // e.g., FT204-CTEC_1.jpg -> FT204-CTEC.jpg
    filename = filename.replace(/_\d+(?=\.[a-zA-Z0-9]+$)/i, "");

    return filename.toLowerCase();
  };

  const loadImages = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, src, alt_text, position, shopify_image_id")
        .eq("product_id", product.id)
        .order("position", { ascending: true })
        .limit(50); // Limit to 50 images for performance

      if (error) throw error;
      
      // Deduplicate images by a normalized key (filename-based) to avoid visual duplicates
      // across different hosts (generated-images storage vs Shopify CDN).
      // Prefer the Shopify-backed entry (shopify_image_id) when both exist.
      const uniqueImages = data
        ? Object.values(
            data.reduce<Record<string, ProductImage>>((acc, img) => {
              const key = normalizeUrl(img.src);
              const existing = acc[key];

              if (!existing) {
                acc[key] = img;
                return acc;
              }

              // Prefer entries with Shopify id.
              if (!!img.shopify_image_id && !existing.shopify_image_id) {
                acc[key] = img;
                return acc;
              }
              if (!img.shopify_image_id && !!existing.shopify_image_id) {
                return acc;
              }

              // Otherwise prefer the lowest position (closer to main image).
              const existingPos = existing.position ?? 999;
              const imgPos = img.position ?? 999;
              if (imgPos < existingPos) acc[key] = img;

              return acc;
            }, {})
          ).sort((a, b) => (a.position || 999) - (b.position || 999))
        : [];

      setImages(uniqueImages);
    } catch (error) {
      console.error("Error loading images:", error);
      toast.error(t.toasts.error.loading || "Error loading images");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newImages = [...images];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, draggedItem);
      
      // Update positions
      const reorderedImages = newImages.map((img, idx) => ({
        ...img,
        position: idx + 1,
      }));
      
      setImages(reorderedImages);
      
      // Auto-save immediately
      await saveOrderToShopify(reorderedImages);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const saveOrderToShopify = async (imagesToSave: ProductImage[]) => {
    if (!product || !storeId) return;
    setSaving(true);
    try {
      // Update local database positions
      const updates = imagesToSave.map(img => 
        supabase
          .from("product_images")
          .update({ position: img.position })
          .eq("id", img.id)
      );
      
      await Promise.all(updates);

      // 🆕 FIX: Update shopify_products.image_url with new main image
      if (imagesToSave.length > 0) {
        const newMainImage = imagesToSave[0].src;
        console.log('[Gallery] Updating main image to:', newMainImage);
        
        await supabase
          .from('shopify_products')
          .update({ 
            image_url: newMainImage,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
        
        // Notify parent about main image change
        if (onMainImageChange) {
          onMainImageChange(product.id, newMainImage);
        }
      }

      // Sync to Shopify if connected
      if (product.shopify_id) {
        const shopifyImages = imagesToSave
          .filter(img => img.shopify_image_id)
          .map((img, idx) => ({
            id: img.shopify_image_id,
            shopify_image_id: img.shopify_image_id,
            position: idx + 1,
            src: img.src,
            alt: img.alt_text,
          }));
        
        console.log('[Gallery] Auto-saving order with', shopifyImages.length, 'images');
        
        const { error, data } = await supabase.functions.invoke("sync-product-images-to-shopify", {
          body: {
            productId: product.id,
            shopifyProductId: product.shopify_id,
            storeId,
            images: shopifyImages,
            isReorderOnly: true,
          },
        });
        
        if (error) {
          console.error("Shopify sync error:", error);
          toast.warning(t.toasts.success.saved);
        } else {
          toast.success(t.toasts.success.synchronized);
        }
      } else {
        toast.success(t.toasts.success.saved);
      }
      
      // 🆕 FIX: Invalidate all product-related queries to refresh ALL tabs
      await queryClient.invalidateQueries({ queryKey: ['product-images'] });
      await queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
      await queryClient.invalidateQueries({ queryKey: ['shopify-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error(t.toasts.error.saving);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imagePosition: number) => {
    if (!product || !storeId) return;
    
    setDeletingImageId(imageId);
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      
      // Delete from database FIRST (fast operation)
      const { error: dbError } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId);
      
      if (dbError) throw dbError;
      
      // Update positions of remaining images in a single batch call
      const remainingImages = images.filter(img => img.id !== imageId);
      const reorderedImages = remainingImages.map((img, idx) => ({
        ...img,
        position: idx + 1,
      }));
      
      // Batch update positions using Promise.all (parallel, not sequential)
      if (reorderedImages.length > 0) {
        await Promise.all(
          reorderedImages.map(img =>
            supabase
              .from("product_images")
              .update({ position: img.position })
              .eq("id", img.id)
          )
        );
      }
      
      setImages(reorderedImages);
      toast.success(t.toasts.success.deleted);
      
      // Delete from Shopify in background (non-blocking)
      if (product.shopify_id && imageToDelete?.shopify_image_id) {
        supabase.functions.invoke("sync-product-images-to-shopify", {
          body: {
            productId: product.id,
            shopifyProductId: product.shopify_id,
            storeId,
            deleteImageIds: [imageToDelete.shopify_image_id],
          },
        }).catch(err => console.error("Background Shopify delete error:", err));
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error(t.toasts.error.deleting);
    } finally {
      setDeletingImageId(null);
    }
  };

  // Remove hasChanges state since we auto-save now

  const hasVariants = product?.variants && product.variants.length > 1;
  const mainImageUrlSet = new Set(images.map((img) => normalizeUrl(img.src)).filter(Boolean));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t.productGallery?.title || "Gallery"} - <span data-no-translate>{product?.title}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t.productGallery?.noImages || "No images for this product"}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main product images */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    {t.productGallery?.mainImages || "Main images"}
                    <Badge variant="outline" className="text-xs">
                      {t.productGallery?.dragToReorder || "Drag to reorder"}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing
                          transition-all duration-200 group
                          ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                          ${dragOverIndex === index ? "border-primary ring-2 ring-primary/20" : "border-border"}
                          hover:border-primary/50
                        `}
                      >
                        <img
                          src={image.src}
                          alt={image.alt_text || `Image ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.img-error-fallback')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'img-error-fallback w-full h-full flex items-center justify-center bg-muted text-muted-foreground';
                              fallback.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          {index + 1}
                        </div>
                        {/* Zoom button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(index);
                          }}
                          className="absolute bottom-1 left-1 bg-black/60 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          title="Zoom"
                        >
                          <ZoomIn className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image.id, image.position || index + 1);
                          }}
                          disabled={deletingImageId === image.id}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 disabled:opacity-50"
                          title={t.productGallery?.deleteImage || "Delete image"}
                        >
                          {deletingImageId === image.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                          <GripVertical className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variant images section (only show variants not already in main images, ignoring ?v=...) */}
                {hasVariants && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-medium mb-3">{t.productGallery?.variantImages || "Variant images"}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Array.from(
                        new Map(
                          (product?.variants || [])
                            .filter(v => v.image_url)
                            .filter(v => !mainImageUrlSet.has(normalizeUrl(v.image_url)))
                            .map(v => [normalizeUrl(v.image_url!), v])
                        ).values()
                      ).map((variant) => (
                        <div
                          key={variant.id}
                          className="relative aspect-square rounded-lg overflow-hidden border border-border"
                        >
                          <img
                            src={variant.image_url!}
                            alt={variant.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-white text-xs truncate">
                              {variant.option1}
                              {variant.option2 && ` / ${variant.option2}`}
                            </p>
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

        {saving && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t shrink-0 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t.productGallery?.syncing || "Syncing..."}</span>
          </div>
        )}

      </DialogContent>

      {/* Lightbox - OUTSIDE DialogContent to avoid z-index conflicts */}
      {lightboxOpen && images[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center cursor-pointer"
          onClick={closeLightbox}
          style={{ margin: 0, padding: 0 }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-10 text-white hover:text-white/80 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-6 z-10 text-white hover:text-white/80 p-4 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Image container - dynamic size based on image */}
          <div 
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={lightboxIndex}
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt_text || `Image ${lightboxIndex + 1}`}
              className="block rounded-lg shadow-2xl"
              style={{
                maxWidth: 'calc(100vw - 160px)',
                maxHeight: 'calc(100vh - 120px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Navigation - Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-6 z-10 text-white hover:text-white/80 p-4 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          {/* Image counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-base bg-black/60 px-5 py-2.5 rounded-full font-medium">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </Dialog>
  );
}
