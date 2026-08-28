import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
  Package,
  Save,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

type ShotPresetId =
  | "studio"
  | "lifestyle"
  | "interior"
  | "premium"
  | "detail"
  | "social"
  | "shopping"
  | "custom";

type Product = {
  id: string;
  title: string;
  image: string | null;
  product_type: string | null;
  description: string | null;
};

type GeneratedShot = {
  url: string;
  type: string;
  label: string;
  saved?: boolean;
  persistentUrl?: string;
};

type Preset = {
  id: ShotPresetId;
  fr: string;
  en: string;
  imageTypes: string[];
  decor?: "living_room" | "dining_room" | "bedroom" | "office";
};

const PRESETS: Preset[] = [
  { id: "studio", fr: "Studio clean", en: "Studio clean", imageTypes: ["front", "angle45", "profile"] },
  { id: "lifestyle", fr: "Lifestyle", en: "Lifestyle", imageTypes: ["angle45", "front"], decor: "living_room" },
  { id: "interior", fr: "Intérieur", en: "Interior", imageTypes: ["front", "profile"], decor: "living_room" },
  { id: "premium", fr: "Éditorial premium", en: "Premium editorial", imageTypes: ["angle45", "zoom_detail"], decor: "living_room" },
  { id: "detail", fr: "Détails", en: "Close-up / detail", imageTypes: ["zoom_detail", "zoom_fabric", "zoom_legs"] },
  { id: "social", fr: "Social carré", en: "Social square", imageTypes: ["front", "angle45"] },
  { id: "shopping", fr: "Google Shopping", en: "Google Shopping", imageTypes: ["front", "profile", "angle45"] },
  { id: "custom", fr: "Prompt libre", en: "Custom prompt", imageTypes: ["front", "angle45"] },
];

const VARIANT_COUNTS = [1, 2, 4, 6] as const;

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60) || "product";
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductShotStudio() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<ShotPresetId>>(new Set(["studio"]));
  const [variantCount, setVariantCount] = useState<(typeof VARIANT_COUNTS)[number]>(4);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [shots, setShots] = useState<GeneratedShot[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!selectedStore?.id) {
        setProducts([]);
        setSelectedProduct(null);
        return;
      }

      setLoadingProducts(true);
      try {
        const { data: productRows, error } = await supabase
          .from("shopify_products")
          .select("id, title, product_type, description")
          .eq("store_id", selectedStore.id)
          .order("title", { ascending: true })
          .limit(500);

        if (error) throw error;
        const ids = (productRows || []).map((row: any) => row.id);
        const imageMap = new Map<string, string>();

        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          if (!batch.length) continue;
          const { data: imageRows } = await supabase
            .from("product_images")
            .select("product_id, src, position")
            .in("product_id", batch)
            .order("position", { ascending: true });

          (imageRows || []).forEach((image: any) => {
            if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, image.src);
          });
        }

        setProducts((productRows || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          image: imageMap.get(row.id) || null,
          product_type: row.product_type || null,
          description: row.description || null,
        })));
      } catch (error) {
        console.error("[ProductShotStudio] products", error);
        toast.error(fr ? "Impossible de charger les produits" : "Could not load products");
      } finally {
        setLoadingProducts(false);
      }
    };

    load();
  }, [selectedStore?.id, fr]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products.slice(0, 24);
    return products.filter((product) => product.title.toLowerCase().includes(query)).slice(0, 24);
  }, [products, productSearch]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSourceImageUrl(product.image || "");
    setManualUrl("");
    setShots([]);
  };

  const togglePreset = (preset: ShotPresetId) => {
    setSelectedPresets((current) => {
      const next = new Set(current);
      if (next.has(preset)) {
        if (next.size > 1) next.delete(preset);
      } else {
        next.add(preset);
      }
      return next;
    });
  };

  const uploadSource = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(fr ? "Choisissez une image" : "Choose an image");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fallback = await fileToDataUrl(file);
      if (!user) {
        setSourceImageUrl(fallback);
        setSelectedProduct(null);
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `studio-sources/${user.id}/${Date.now()}-${safeFilename(file.name)}.${extension}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        console.warn("[ProductShotStudio] upload fallback", error);
        setSourceImageUrl(fallback);
      } else {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        setSourceImageUrl(data.publicUrl);
      }
      setSelectedProduct(null);
      setShots([]);
    } catch (error) {
      console.error("[ProductShotStudio] upload", error);
      toast.error(fr ? "Échec de l’upload" : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const useManualUrl = () => {
    const value = manualUrl.trim();
    if (!/^https?:\/\//i.test(value) && !value.startsWith("data:image")) {
      toast.error(fr ? "URL d’image invalide" : "Invalid image URL");
      return;
    }
    setSelectedProduct(null);
    setSourceImageUrl(value);
    setShots([]);
  };

  const buildGenerationPlan = () => {
    const presets = PRESETS.filter((preset) => selectedPresets.has(preset.id));
    const decorPreset = presets.find((preset) => preset.decor);
    const includeDecor = Boolean(decorPreset);
    const decorType = decorPreset?.decor || "living_room";
    const pool = presets.flatMap((preset) => preset.imageTypes);
    const unique = Array.from(new Set(pool.length ? pool : ["front"]));
    const requestedImageCount = Math.max(0, variantCount - (includeDecor ? 1 : 0));
    const imageTypes: string[] = [];

    for (let i = 0; i < requestedImageCount; i += 1) {
      imageTypes.push(unique[i % unique.length]);
    }

    return { imageTypes, includeDecor, decorType };
  };

  const generateShots = async () => {
    if (!sourceImageUrl) {
      toast.error(fr ? "Choisissez une image source" : "Choose a source image");
      return;
    }

    if (selectedPresets.has("custom") && !customPrompt.trim()) {
      toast.error(fr ? "Ajoutez votre prompt" : "Add your prompt");
      return;
    }

    setGenerating(true);
    setShots([]);
    try {
      let visionContext = "";
      try {
        const { data: vision } = await supabase.functions.invoke("analyze-image-with-vision", {
          body: {
            imageUrl: sourceImageUrl,
            productContext: {
              title: selectedProduct?.title || "Product",
              category: selectedProduct?.product_type || undefined,
            },
          },
        });

        if (vision?.success) {
          const attrs = vision.visualAttributes || {};
          visionContext = [
            attrs.primaryColor ? `color: ${attrs.primaryColor}` : "",
            Array.isArray(attrs.materials) && attrs.materials.length ? `materials: ${attrs.materials.join(", ")}` : "",
            Array.isArray(attrs.style) && attrs.style.length ? `style: ${attrs.style.join(", ")}` : "",
            attrs.finish ? `finish: ${attrs.finish}` : "",
          ].filter(Boolean).join("; ");
        }
      } catch (visionError) {
        console.warn("[ProductShotStudio] Kimi vision enrichment skipped", visionError);
      }

      const plan = buildGenerationPlan();
      const context = [selectedProduct?.description || "", visionContext, customPrompt.trim()]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1200);

      const { data, error } = await supabase.functions.invoke("generate-ai-product-images", {
        body: {
          productId: selectedProduct?.id || `studio-${Date.now()}`,
          productTitle: selectedProduct?.title || (fr ? "Produit" : "Product"),
          productType: selectedProduct?.product_type || "product",
          sourceImageUrl,
          imageTypes: plan.imageTypes,
          includeDecor: plan.includeDecor,
          decorType: plan.decorType,
          language: fr ? "fr" : "en",
          productDescription: context || undefined,
          galleryImages: [sourceImageUrl],
        },
      });

      if (error) throw error;
      if (!data?.success || !Array.isArray(data.images) || data.images.length === 0) {
        throw new Error(data?.error || (fr ? "Aucune image générée" : "No image generated"));
      }

      setShots(data.images.slice(0, variantCount).map((shot: any) => ({
        url: shot.url,
        type: shot.type || "shot",
        label: shot.label || "Product shot",
      })));
      toast.success(fr ? `${Math.min(data.images.length, variantCount)} visuel(s) créé(s)` : `${Math.min(data.images.length, variantCount)} shot(s) created`);
    } catch (error: any) {
      console.error("[ProductShotStudio] generation", error);
      toast.error(error?.message || (fr ? "Génération impossible" : "Generation failed"));
    } finally {
      setGenerating(false);
    }
  };

  const persistImage = async (url: string, index: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return url;
    if (!url.startsWith("data:image")) return url;

    const response = await fetch(url);
    const blob = await response.blob();
    const extension = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
    const productPart = safeFilename(selectedProduct?.title || "product-shot");
    const path = `studio-generated/${user.id}/${Date.now()}-${productPart}-${index}.${extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, blob, {
      contentType: blob.type || "image/png",
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const saveShot = async (index: number) => {
    const shot = shots[index];
    if (!shot || shot.saved) return;
    setSavingIndex(index);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fr ? "Connexion requise" : "Sign in required");

      const persistentUrl = await persistImage(shot.url, index);

      if (selectedProduct) {
        const { data: lastImage } = await supabase
          .from("product_images")
          .select("position")
          .eq("product_id", selectedProduct.id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: imageError } = await supabase.from("product_images").insert({
          product_id: selectedProduct.id,
          src: persistentUrl,
          alt_text: `${selectedProduct.title} - ${shot.label}`,
          position: (lastImage?.position || 0) + 1,
          optimization_count: 1,
          is_ai_generated: true,
        });
        if (imageError) throw imageError;
      }

      await supabase.from("creative_history").insert({
        user_id: user.id,
        store_id: selectedStore?.id || null,
        product_id: selectedProduct?.id || null,
        product_title: selectedProduct?.title || (fr ? "Image importée" : "Uploaded image"),
        template_id: "product-shot-ai",
        template_name: `Product Shot AI · ${shot.label}`,
        image_url: persistentUrl,
        generation_mode: "product-shot",
        caption: customPrompt.trim() || null,
      });

      setShots((current) => current.map((item, itemIndex) => itemIndex === index
        ? { ...item, saved: true, persistentUrl }
        : item));
      toast.success(fr ? "Ajouté à la galerie" : "Saved to gallery");
    } catch (error: any) {
      console.error("[ProductShotStudio] save", error);
      toast.error(error?.message || (fr ? "Sauvegarde impossible" : "Could not save"));
    } finally {
      setSavingIndex(null);
    }
  };

  const downloadShot = (shot: GeneratedShot, index: number) => {
    const link = document.createElement("a");
    link.href = shot.persistentUrl || shot.url;
    link.download = `${safeFilename(selectedProduct?.title || "product-shot")}-${index + 1}.png`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-slate-200 p-4 shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Package className="h-4 w-4" />
                {fr ? "Image source" : "Source image"}
              </div>
              {sourceImageUrl && <Check className="h-4 w-4 text-emerald-600" />}
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={fr ? "Rechercher un produit" : "Search products"}
                className="h-9 pl-9"
              />
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {loadingProducts ? (
                <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filteredProducts.length ? filteredProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => selectProduct(product)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                    selectedProduct?.id === product.id ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50",
                  )}
                >
                  {product.image ? (
                    <img src={product.image} alt="" className="h-10 w-10 rounded-md border object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-slate-50"><ImageIcon className="h-4 w-4 text-slate-400" /></div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{product.title}</span>
                </button>
              )) : <div className="py-6 text-center text-xs text-slate-500">{fr ? "Aucun produit" : "No products"}</div>}
            </div>

            <div className="my-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />{fr ? "ou" : "or"}<span className="h-px flex-1 bg-slate-200" />
            </div>

            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => uploadSource(event.target.files?.[0])} />
            <Button type="button" variant="outline" className="w-full" onClick={() => uploadRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {fr ? "Importer une image" : "Upload image"}
            </Button>

            <div className="mt-2 flex gap-2">
              <Input value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://…" className="h-9" />
              <Button type="button" variant="outline" size="sm" onClick={useManualUrl}>OK</Button>
            </div>

            {sourceImageUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border bg-slate-50">
                <img src={sourceImageUrl} alt="" className="aspect-square w-full object-contain" />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200 p-4 shadow-none">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{fr ? "Styles" : "Styles"}</h2>
                <p className="text-xs text-slate-500">{fr ? "Sélection multiple" : "Multi-select"}</p>
              </div>
              <div className="flex rounded-lg border bg-slate-50 p-0.5">
                {VARIANT_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setVariantCount(count)}
                    className={cn(
                      "h-7 min-w-8 rounded-md px-2 text-xs font-medium",
                      variantCount === count ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                    )}
                  >{count}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {PRESETS.map((preset) => {
                const selected = selectedPresets.has(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePreset(preset.id)}
                    className={cn(
                      "relative min-h-16 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selected ? "border-slate-900 bg-slate-50 font-medium" : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    {selected && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-emerald-600" />}
                    <span className="block pr-5">{fr ? preset.fr : preset.en}</span>
                  </button>
                );
              })}
            </div>

            {selectedPresets.has("custom") && (
              <Textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder={fr ? "Ex. salon parisien, moulures blanches, lumière naturelle…" : "e.g. Parisian room, white mouldings, natural light…"}
                className="mt-3 min-h-20 resize-none"
              />
            )}

            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={generateShots} disabled={generating || !sourceImageUrl} className="min-w-40 bg-slate-900 text-white hover:bg-slate-800">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {fr ? "Générer les shots" : "Generate shots"}
              </Button>
            </div>
          </Card>

          {shots.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shots.map((shot, index) => (
                <Card key={`${shot.type}-${index}`} className="overflow-hidden border-slate-200 shadow-none">
                  <div className="aspect-square bg-slate-50">
                    <img src={shot.persistentUrl || shot.url} alt={shot.label} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2 border-t p-2.5">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{shot.label}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadShot(shot, index)} title={fr ? "Télécharger" : "Download"}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant={shot.saved ? "secondary" : "outline"} size="sm" className="h-8 px-2 text-xs" onClick={() => saveShot(index)} disabled={shot.saved || savingIndex === index}>
                      {savingIndex === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : shot.saved ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
                      <span className="ml-1">{shot.saved ? (fr ? "Sauvé" : "Saved") : (fr ? "Galerie" : "Gallery")}</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
