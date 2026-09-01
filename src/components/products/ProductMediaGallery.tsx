import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Images, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AIImagesDialog } from "@/components/seo/AIImagesDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProductImage = {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  shopify_image_id?: number | null;
  virtual?: boolean;
};

type GalleryProduct = {
  id: string;
  title: string;
  image_url: string | null;
  shopify_id?: number | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
};

type ProductMediaGalleryProps = {
  product: GalleryProduct;
  storeId?: string | null;
  fr: boolean;
  onMainImageChange?: (url: string | null) => void;
};

const normalizeUrl = (url?: string | null) => {
  if (!url) return "";
  const withoutQuery = url.split("?")[0];
  let filename = withoutQuery;
  try {
    filename = new URL(withoutQuery).pathname.split("/").pop() || withoutQuery;
  } catch {
    filename = withoutQuery.split("/").pop() || withoutQuery;
  }
  filename = decodeURIComponent(filename)
    .replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$)/i, "")
    .replace(/_\d+x\d+(?=\.[a-zA-Z0-9]+$)/i, "")
    .replace(/_\d+(?=\.[a-zA-Z0-9]+$)/i, "");
  return filename.toLowerCase();
};

export function ProductMediaGallery({ product, storeId, fr, onMainImageChange }: ProductMediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showStudio, setShowStudio] = useState(false);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) || images[0] || null,
    [images, selectedId],
  );

  const studioProduct = useMemo(
    () => selectedImage ? [{ ...product, image_url: selectedImage.src }] : [],
    [product, selectedImage],
  );

  const loadImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, src, alt_text, position, shopify_image_id")
        .eq("product_id", product.id)
        .order("position", { ascending: true })
        .limit(50);
      if (error) throw error;

      const deduped = Object.values(
        (data || []).reduce<Record<string, ProductImage>>((acc, image) => {
          const key = normalizeUrl(image.src) || image.id;
          const current = acc[key];
          if (!current || (!!image.shopify_image_id && !current.shopify_image_id) || ((image.position ?? 999) < (current.position ?? 999))) {
            acc[key] = image;
          }
          return acc;
        }, {}),
      ).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

      if (deduped.length === 0 && product.image_url) {
        deduped.push({
          id: "__catalog-main__",
          src: product.image_url,
          alt_text: product.title,
          position: 1,
          virtual: true,
        });
      }

      setImages(deduped);
      setSelectedId((current) => {
        if (current && deduped.some((image) => image.id === current)) return current;
        const mainKey = normalizeUrl(product.image_url);
        return deduped.find((image) => normalizeUrl(image.src) === mainKey)?.id || deduped[0]?.id || null;
      });
    } catch (error) {
      console.error("Failed to load product gallery:", error);
      toast.error(fr ? "Impossible de charger la galerie" : "Could not load gallery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.image_url]);

  const syncImages = async (deleteShopifyImageId?: number | null) => {
    try {
      if (deleteShopifyImageId && product.shopify_id && storeId) {
        const { error } = await supabase.functions.invoke("sync-product-images-to-shopify", {
          body: {
            productId: product.id,
            shopifyProductId: product.shopify_id,
            storeId,
            deleteImageIds: [deleteShopifyImageId],
          },
        });
        if (error) throw error;
        return;
      }

      const { error } = await supabase.functions.invoke("sync-product-images-to-shopify", {
        body: { productId: product.id, allowCreateReplace: true },
      });
      if (error) throw error;
    } catch (error) {
      console.warn("Gallery saved locally but Shopify image sync failed:", error);
      toast.warning(fr ? "Galerie enregistrée, synchronisation Shopify à vérifier" : "Gallery saved; Shopify sync should be checked");
    }
  };

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (selectedFiles.length === 0) {
      toast.error(fr ? "Sélectionnez des fichiers image" : "Select image files");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(fr ? "Import des images…" : "Importing images…");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fr ? "Session utilisateur introuvable" : "User session not found");

      const { data: lastImages } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", product.id)
        .order("position", { ascending: false })
        .limit(1);
      let nextPosition = (lastImages?.[0]?.position || 0) + 1;
      let firstImportedUrl: string | null = null;

      for (const file of selectedFiles) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(fr ? `${file.name} dépasse 15 Mo` : `${file.name} exceeds 15 MB`);
        }
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const unique = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `${user.id}/${product.id}/manual-${unique}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("generated-images")
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from("generated-images").getPublicUrl(path).data.publicUrl;
        firstImportedUrl ||= publicUrl;
        const { error: insertError } = await supabase.from("product_images").insert({
          product_id: product.id,
          src: publicUrl,
          alt_text: `${product.title} - ${fr ? "image produit" : "product image"}`,
          position: nextPosition,
          is_ai_generated: false,
        });
        if (insertError) throw insertError;
        nextPosition += 1;
      }

      if (!product.image_url && firstImportedUrl) {
        const { error: mainError } = await supabase
          .from("shopify_products")
          .update({ image_url: firstImportedUrl, updated_at: new Date().toISOString() })
          .eq("id", product.id);
        if (mainError) throw mainError;
        onMainImageChange?.(firstImportedUrl);
      }

      await loadImages();
      await syncImages();
      toast.success(fr ? `${selectedFiles.length} image(s) importée(s)` : `${selectedFiles.length} image(s) imported`, { id: toastId });
    } catch (error) {
      console.error("Image import failed:", error);
      toast.error(fr ? "Import impossible" : "Import failed", {
        id: toastId,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedImage || selectedImage.virtual) return;
    setDeletingId(selectedImage.id);
    const toastId = toast.loading(fr ? "Suppression de l’image…" : "Deleting image…");
    try {
      const { error } = await supabase.from("product_images").delete().eq("id", selectedImage.id);
      if (error) throw error;

      const remaining = images.filter((image) => image.id !== selectedImage.id && !image.virtual);
      await Promise.all(
        remaining.map((image, index) =>
          supabase.from("product_images").update({ position: index + 1 }).eq("id", image.id),
        ),
      );

      const deletingMain = normalizeUrl(product.image_url) === normalizeUrl(selectedImage.src) || (selectedImage.position ?? 999) === 1;
      if (deletingMain) {
        const nextMain = remaining[0]?.src || null;
        const { error: mainError } = await supabase
          .from("shopify_products")
          .update({ image_url: nextMain, updated_at: new Date().toISOString() })
          .eq("id", product.id);
        if (mainError) throw mainError;
        onMainImageChange?.(nextMain);
      }

      setImages(remaining);
      setSelectedId(remaining[0]?.id || null);
      await syncImages(selectedImage.shopify_image_id);
      toast.success(fr ? "Image supprimée" : "Image deleted", { id: toastId });
    } catch (error) {
      console.error("Image deletion failed:", error);
      toast.error(fr ? "Suppression impossible" : "Could not delete image", {
        id: toastId,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openStudio = () => {
    if (!selectedImage) return;
    setShowStudio(true);
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Images className="h-4 w-4" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-950">{fr ? "Galerie produit" : "Product gallery"}</h2>
                <Badge variant="secondary" className="rounded-full">{images.length}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {fr ? "Sélectionnez une image, appliquez le Studio, importez ou supprimez sans quitter le produit." : "Select an image, apply Studio, import or delete without leaving the product."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleImport(event.target.files)} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              {fr ? "Importer images" : "Import images"}
            </Button>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openStudio} disabled={!selectedImage}>
              <Sparkles className="mr-1.5 h-4 w-4" />Studio
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void handleDelete()} disabled={!selectedImage || selectedImage.virtual || deletingId === selectedImage.id} title={fr ? "Supprimer l’image sélectionnée" : "Delete selected image"}>
              {deletingId === selectedImage?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-52 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : images.length === 0 ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 grid min-h-52 w-full place-items-center rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-6 text-center transition hover:bg-violet-50/60">
            <div><Upload className="mx-auto h-7 w-7 text-violet-500" /><p className="mt-2 text-sm font-medium text-slate-700">{fr ? "Aucune image dans la galerie" : "No gallery images"}</p><p className="mt-1 text-xs text-slate-500">{fr ? "Importez les premières images produit." : "Import the first product images."}</p></div>
          </button>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]">
            <div className="grid max-h-[410px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              {images.map((image, index) => {
                const selected = selectedImage?.id === image.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedId(image.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-50 transition ${selected ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}
                  >
                    <img src={image.src} alt={image.alt_text || `${product.title} ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{index + 1}</span>
                    {selected && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-3 w-3" /></span>}
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white">
                {selectedImage && <img src={selectedImage.src} alt={selectedImage.alt_text || product.title} className="h-full w-full object-contain p-3" />}
              </div>
              <div className="border-t border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{fr ? "Image sélectionnée" : "Selected image"}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{selectedImage?.alt_text || product.title}</p>
                  </div>
                  <Button size="sm" className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openStudio} disabled={!selectedImage}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />{fr ? "Appliquer Studio" : "Apply Studio"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <AIImagesDialog
        open={showStudio}
        onOpenChange={setShowStudio}
        selectedProducts={studioProduct}
        onComplete={() => void loadImages()}
      />
    </>
  );
}
