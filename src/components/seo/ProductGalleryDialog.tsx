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
} from "lucide-react";
import { useTranslation } from "@/lib/language";

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
}

export function ProductGalleryDialog({
  open,
  onOpenChange,
  product,
  storeId,
}: ProductGalleryDialogProps) {
  const { t } = useTranslation();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadImages();
    }
  }, [open, product?.id]);

  const loadImages = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, src, alt_text, position, shopify_image_id")
        .eq("product_id", product.id)
        .order("position", { ascending: true });

      if (error) throw error;
      setImages(data || []);
      setHasChanges(false);
    } catch (error) {
      console.error("Error loading images:", error);
      toast.error("Erreur lors du chargement des images");
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

  const handleDragEnd = () => {
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
      setHasChanges(true);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveOrder = async () => {
    if (!product || !storeId) return;
    setSaving(true);
    try {
      // Update local database positions
      for (const img of images) {
        await supabase
          .from("product_images")
          .update({ position: img.position })
          .eq("id", img.id);
      }

      // Sync to Shopify if connected
      if (product.shopify_id) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.functions.invoke("sync-product-images-to-shopify", {
            body: {
              productId: product.id,
              shopifyProductId: product.shopify_id,
              storeId,
              images: images.map((img, idx) => ({
                id: img.shopify_image_id,
                position: idx + 1,
                src: img.src,
                alt: img.alt_text,
              })),
            },
          });
          if (error) {
            console.error("Shopify sync error:", error);
            toast.warning("Ordre sauvegardé localement, erreur de sync Shopify");
          } else {
            toast.success("Ordre des images mis à jour et synchronisé");
          }
        }
      } else {
        toast.success("Ordre des images mis à jour localement");
      }
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const hasVariants = product?.variants && product.variants.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Galerie - {product?.title}
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
                Aucune image pour ce produit
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main product images */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    Images principales
                    <Badge variant="outline" className="text-xs">
                      Glisser pour réorganiser
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
                          transition-all duration-200
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
                        />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          {index + 1}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                          <GripVertical className="h-6 w-6 text-white opacity-0 hover:opacity-100 drop-shadow-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variant images section */}
                {hasVariants && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-medium mb-3">Images des variantes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {product?.variants?.filter(v => v.image_url).map((variant) => (
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

        {hasChanges && (
          <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => loadImages()}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveOrder} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder l'ordre
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
