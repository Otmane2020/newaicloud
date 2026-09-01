import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useImageOptimization } from "@/hooks/useImageOptimization";
import { useTranslation } from "@/lib/language";
import {
  Check,
  History,
  Images,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

type BackgroundTool = "ambiance" | "white";
type BackgroundFormat = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
type BackgroundStyle = "lifestyle" | "moderne" | "living_room" | "studio" | "nature" | "luxury_showroom";

type StudioProduct = {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  product_type?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
  product_images?: Array<{ id: string; src: string }> | null;
};

type SourceImage = {
  key: string;
  url: string;
  imageId?: string;
  position: number;
};

type GeneratedResult = {
  key: string;
  source: SourceImage;
  generatedUrl: string;
  tool: BackgroundTool;
  createdAt: string;
};

type HistoryItem = {
  id: string;
  optimized_url: string;
  original_url: string | null;
  created_at: string;
  optimization_type: string;
};

type Props = {
  products: StudioProduct[];
  isLoading?: boolean;
  onComplete?: () => void;
};

const FORMAT_TO_API: Record<BackgroundFormat, "square" | "portrait" | "landscape"> = {
  "1:1": "square",
  "4:3": "landscape",
  "3:4": "portrait",
  "16:9": "landscape",
  "9:16": "portrait",
};

const AMBIANCE_STYLES: Array<{ value: BackgroundStyle; fr: string; en: string }> = [
  { value: "lifestyle", fr: "Lifestyle", en: "Lifestyle" },
  { value: "moderne", fr: "Moderne", en: "Modern" },
  { value: "living_room", fr: "Salon", en: "Living room" },
  { value: "studio", fr: "Studio", en: "Studio" },
  { value: "nature", fr: "Nature", en: "Nature" },
  { value: "luxury_showroom", fr: "Showroom luxe", en: "Luxury showroom" },
];

export function BackgroundWorkspace({ products, isLoading = false, onComplete }: Props) {
  const { language } = useTranslation();
  const fr = language === "fr";
  const { generateWhiteBackground, applyOptimizedImage, saveToHistory } = useImageOptimization();

  const [tool, setTool] = useState<BackgroundTool>("ambiance");
  const [format, setFormat] = useState<BackgroundFormat>("1:1");
  const [style, setStyle] = useState<BackgroundStyle>("lifestyle");
  const [customPrompt, setCustomPrompt] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedImageKeys, setSelectedImageKeys] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState<GeneratedResult[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [historyApplyingId, setHistoryApplyingId] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(query),
    );
  }, [productSearch, products]);

  const galleryImages = useMemo<SourceImage[]>(() => {
    if (!selectedProduct) return [];
    const result: SourceImage[] = [];
    const seen = new Set<string>();

    (selectedProduct.product_images || []).forEach((image, index) => {
      if (!image.src || seen.has(image.src)) return;
      seen.add(image.src);
      result.push({
        key: image.id || image.src,
        url: image.src,
        imageId: image.id || undefined,
        position: index + 1,
      });
    });

    if (selectedProduct.image_url && !seen.has(selectedProduct.image_url)) {
      result.unshift({
        key: `main-${selectedProduct.id}`,
        url: selectedProduct.image_url,
        position: 1,
      });
    }

    return result.map((image, index) => ({ ...image, position: index + 1 }));
  }, [selectedProduct]);

  const selectedImages = useMemo(
    () => galleryImages.filter((image) => selectedImageKeys.has(image.key)),
    [galleryImages, selectedImageKeys],
  );

  useEffect(() => {
    setSelectedImageKeys(new Set());
    setGenerated([]);
    if (!selectedProductId) {
      setHistory([]);
      return;
    }
    void loadHistory(selectedProductId);
  }, [selectedProductId]);

  const loadHistory = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_image_history")
      .select("id, optimized_url, original_url, created_at, optimization_type")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[BackgroundWorkspace] History load failed", error);
      return;
    }
    setHistory((data || []) as HistoryItem[]);
  };

  const selectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setProductSearch("");
  };

  const toggleImage = (key: string) => {
    setSelectedImageKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setGenerated([]);
  };

  const selectAllImages = () => {
    setSelectedImageKeys(new Set(galleryImages.map((image) => image.key)));
    setGenerated([]);
  };

  const clearImages = () => {
    setSelectedImageKeys(new Set());
    setGenerated([]);
  };

  const handleGenerate = async () => {
    if (!selectedProduct || selectedImages.length === 0) {
      toast.error(fr ? "Sélectionnez un produit et au moins une image." : "Select a product and at least one image.");
      return;
    }

    setIsGenerating(true);
    setGenerated([]);

    try {
      const { data: details } = await supabase
        .from("shopify_products")
        .select("body_html, seo_description, serp_data, vision_attributes")
        .eq("id", selectedProduct.id)
        .maybeSingle();

      const nextResults: GeneratedResult[] = [];
      for (const source of selectedImages) {
        const result = await generateWhiteBackground.mutateAsync({
          imageUrl: source.url,
          productTitle: selectedProduct.title,
          resolution: "2000x2000",
          format: FORMAT_TO_API[format],
          mode: "google_shopping",
          product_id: selectedProduct.id,
          serpData: details?.serp_data || null,
          visionAiData: details?.vision_attributes || null,
          productDescription: details?.body_html || details?.seo_description || selectedProduct.body_html || selectedProduct.seo_description || undefined,
          backgroundStyle: tool === "ambiance" ? style : "shopping",
          customPrompt: tool === "ambiance" && customPrompt.trim() ? customPrompt.trim() : undefined,
          galleryImages: galleryImages.map((image) => image.url),
        });

        if (!result.imageUrl) throw new Error("Missing generated image URL");
        nextResults.push({
          key: `${source.key}-${Date.now()}-${nextResults.length}`,
          source,
          generatedUrl: result.imageUrl,
          tool,
          createdAt: new Date().toISOString(),
        });
        setGenerated([...nextResults]);
      }

      toast.success(
        fr
          ? `${nextResults.length} image(s) générée(s). Choisissez maintenant comment les appliquer.`
          : `${nextResults.length} image(s) generated. Choose how to apply them.`,
      );
    } catch (error) {
      console.error("[BackgroundWorkspace] Generation failed", error);
      toast.error(fr ? "La génération a échoué pour une image." : "Image generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const resolveSourceImageId = async (source: SourceImage) => {
    if (!selectedProduct) return null;
    if (source.imageId) return source.imageId;

    const { data: exact } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", selectedProduct.id)
      .eq("src", source.url)
      .limit(1)
      .maybeSingle();
    if (exact?.id) return exact.id;

    const { data: fallback } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", selectedProduct.id)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    return fallback?.id || null;
  };

  const ensurePublicUrl = async (url: string, suffix: string) => {
    if (!url.startsWith("data:image/")) return url;
    if (!selectedProduct) return url;

    const response = await fetch(url);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";
    const fileName = `background-gallery/${selectedProduct.id}/${Date.now()}-${suffix}.${extension}`;
    const { error } = await supabase.storage.from("generated-images").upload(fileName, blob, {
      contentType: blob.type || "image/png",
      upsert: true,
    });
    if (error) throw error;
    return supabase.storage.from("generated-images").getPublicUrl(fileName).data.publicUrl;
  };

  const addGeneratedToGallery = async (result: GeneratedResult | { source: SourceImage; generatedUrl: string; tool: BackgroundTool }) => {
    if (!selectedProduct) throw new Error("No product selected");
    const finalUrl = await ensurePublicUrl(result.generatedUrl, result.source.key.replace(/[^a-zA-Z0-9_-]/g, "-"));

    const { data: duplicate } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", selectedProduct.id)
      .eq("src", finalUrl)
      .limit(1)
      .maybeSingle();
    if (duplicate?.id) return duplicate.id;

    const sourceId = await resolveSourceImageId(result.source);
    let sourceRow: Record<string, unknown> | null = null;
    if (sourceId) {
      const { data } = await supabase
        .from("product_images")
        .select("*")
        .eq("id", sourceId)
        .maybeSingle();
      sourceRow = (data || null) as Record<string, unknown> | null;
    }

    if (!sourceRow) {
      const { data } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", selectedProduct.id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      sourceRow = (data || null) as Record<string, unknown> | null;
    }

    if (!sourceRow) throw new Error("No source image row available for gallery insertion");

    const { data: lastImage } = await supabase
      .from("product_images")
      .select("position")
      .eq("product_id", selectedProduct.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      product_id: selectedProduct.id,
      src: finalUrl,
      alt_text: sourceRow.alt_text || selectedProduct.title,
      position: (lastImage?.position || 0) + 1,
      shopify_image_id: null,
      optimization_count: 1,
      exported_to_shopify: false,
      exported_at: null,
    };

    for (const tenancyField of ["user_id", "seller_id", "store_id"] as const) {
      if (sourceRow[tenancyField] != null) payload[tenancyField] = sourceRow[tenancyField];
    }

    const { data: inserted, error: insertError } = await supabase
      .from("product_images")
      .insert(payload as never)
      .select("id")
      .single();
    if (insertError) throw insertError;

    await saveToHistory({
      productId: selectedProduct.id,
      imageId: inserted.id,
      optimizationType: result.tool === "white" ? "white_background" : "ai_background",
      originalUrl: result.source.url,
      optimizedUrl: finalUrl,
      aiModel: "gemini-2.5-flash-image-preview",
      aiPrompt: result.tool === "ambiance" ? customPrompt.trim() || style : "white background",
      resolution: "2000x2000",
      qualityScore: 95,
    });

    const { error: syncError } = await supabase.functions.invoke("sync-product-images-to-shopify", {
      body: { productId: selectedProduct.id, allowCreateReplace: true },
    });
    if (syncError) console.error("[BackgroundWorkspace] Shopify gallery sync failed", syncError);

    return inserted.id;
  };

  const applyToGallery = async () => {
    if (!selectedProduct || generated.length === 0) return;
    setIsApplying(true);
    let success = 0;
    try {
      for (const result of generated) {
        await addGeneratedToGallery(result);
        success += 1;
      }
      toast.success(
        fr
          ? `${success} image(s) ajoutée(s) à la galerie du produit.`
          : `${success} image(s) added to the product gallery.`,
      );
      await loadHistory(selectedProduct.id);
      onComplete?.();
    } catch (error) {
      console.error("[BackgroundWorkspace] Apply to gallery failed", error);
      toast.error(fr ? "Impossible d’ajouter toutes les images à la galerie." : "Could not add all images to the gallery.");
    } finally {
      setIsApplying(false);
    }
  };

  const replaceChosenImages = async () => {
    if (!selectedProduct || generated.length === 0) return;
    setIsApplying(true);
    let success = 0;
    try {
      for (const result of generated) {
        const imageId = await resolveSourceImageId(result.source);
        if (!imageId) throw new Error(`Missing image id for ${result.source.url}`);

        await applyOptimizedImage.mutateAsync({
          imageId,
          productId: selectedProduct.id,
          optimizedUrl: result.generatedUrl,
          originalUrl: result.source.url,
          optimizationType: result.tool === "white" ? "white_background" : "ai_background",
          aiModel: "gemini-2.5-flash-image-preview",
          aiPrompt: result.tool === "ambiance" ? customPrompt.trim() || style : "white background",
          resolution: "2000x2000",
          qualityScore: 95,
          applyAsMain: result.source.position === 1,
        });
        success += 1;
      }
      toast.success(
        fr
          ? `${success} image(s) source remplacée(s).`
          : `${success} selected source image(s) replaced.`,
      );
      await loadHistory(selectedProduct.id);
      onComplete?.();
    } catch (error) {
      console.error("[BackgroundWorkspace] Replace chosen images failed", error);
      toast.error(fr ? "Impossible de remplacer toutes les images choisies." : "Could not replace all selected images.");
    } finally {
      setIsApplying(false);
    }
  };

  const applyHistoryToProduct = async (item: HistoryItem) => {
    if (!selectedProduct || galleryImages.length === 0) return;
    setHistoryApplyingId(item.id);
    try {
      const source = selectedImages[0] || galleryImages[0];
      await addGeneratedToGallery({
        source,
        generatedUrl: item.optimized_url,
        tool: item.optimization_type === "white_background" ? "white" : "ambiance",
      });
      toast.success(fr ? "Image appliquée au produit." : "Image applied to product.");
      await loadHistory(selectedProduct.id);
      onComplete?.();
    } catch (error) {
      console.error("[BackgroundWorkspace] History apply failed", error);
      toast.error(fr ? "Impossible d’appliquer cette image au produit." : "Could not apply this image to the product.");
    } finally {
      setHistoryApplyingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">01 · {fr ? "Outil" : "Tool"}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{fr ? "Choisissez le type de background" : "Choose the background tool"}</h2>
            <p className="mt-1 text-sm text-slate-500">{fr ? "Deux parcours clairs : créer une ambiance ou obtenir un fond blanc e-commerce." : "Two clear workflows: create a scene or produce a clean e-commerce white background."}</p>
          </div>
          <Badge variant="secondary">{tool === "ambiance" ? "Ambiance Generator" : "White Background"}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => { setTool("ambiance"); setGenerated([]); }}
            className={`rounded-2xl border p-4 text-left transition ${tool === "ambiance" ? "border-violet-500 bg-violet-50/50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Palette className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold text-slate-950">Ambiance Generator</p>{tool === "ambiance" && <Check className="h-4 w-4 text-violet-700" />}</div>
                <p className="mt-1 text-sm leading-5 text-slate-500">{fr ? "Place le produit dans un décor lifestyle, studio, salon, nature ou showroom." : "Place the product in a lifestyle, studio, living room, nature or showroom scene."}</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setTool("white"); setGenerated([]); }}
            className={`rounded-2xl border p-4 text-left transition ${tool === "white" ? "border-violet-500 bg-violet-50/50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Square className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold text-slate-950">White Background</p>{tool === "white" && <Check className="h-4 w-4 text-violet-700" />}</div>
                <p className="mt-1 text-sm leading-5 text-slate-500">{fr ? "Nettoie le décor et crée un fond blanc propre pour catalogue et Shopping." : "Remove the scene and create a clean white background for catalog and Shopping."}</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="space-y-1.5">
            <Label>{fr ? "Format" : "Format"}</Label>
            <Select value={format} onValueChange={(value) => { setFormat(value as BackgroundFormat); setGenerated([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1 · Square</SelectItem>
                <SelectItem value="4:3">4:3 · Landscape</SelectItem>
                <SelectItem value="3:4">3:4 · Portrait</SelectItem>
                <SelectItem value="16:9">16:9 · Banner</SelectItem>
                <SelectItem value="9:16">9:16 · Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tool === "ambiance" && (
            <div className="space-y-1.5">
              <Label>{fr ? "Ambiance" : "Scene style"}</Label>
              <div className="flex flex-wrap gap-2">
                {AMBIANCE_STYLES.map((item) => (
                  <Button key={item.value} type="button" size="sm" variant={style === item.value ? "default" : "outline"} onClick={() => { setStyle(item.value); setGenerated([]); }}>
                    {fr ? item.fr : item.en}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {tool === "ambiance" && (
          <div className="mt-4 space-y-1.5">
            <Label>{fr ? "Instructions d’ambiance (optionnel)" : "Scene instructions (optional)"}</Label>
            <textarea
              value={customPrompt}
              onChange={(event) => { setCustomPrompt(event.target.value); setGenerated([]); }}
              placeholder={fr ? "Ex. salon parisien, lumière chaude, parquet chevrons, murs avec moulures…" : "E.g. Parisian living room, warm light, herringbone floor, wall mouldings…"}
              className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">02 · {fr ? "Produit" : "Product"}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedProduct ? selectedProduct.title : (fr ? "Sélectionnez un produit" : "Select a product")}</h2>
          </div>
          {selectedProduct && <Button variant="outline" size="sm" onClick={() => setSelectedProductId(null)}>{fr ? "Changer" : "Change"}</Button>}
        </div>

        {!selectedProduct && (
          <>
            <div className="relative mt-4 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder={fr ? "Rechercher un produit…" : "Search a product…"} className="pl-9" />
            </div>
            <div className="mt-4 max-h-[430px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="grid min-h-48 place-items-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{fr ? "Chargement du catalogue…" : "Loading catalog…"}</div>
              ) : filteredProducts.length === 0 ? (
                <div className="grid min-h-48 place-items-center text-sm text-slate-500">{fr ? "Aucun produit trouvé." : "No product found."}</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <button key={product.id} type="button" onClick={() => selectProduct(product.id)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-violet-300 hover:shadow-sm">
                      <div className="aspect-[4/3] bg-slate-50">
                        {product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-contain p-3" /> : <div className="grid h-full place-items-center"><Images className="h-8 w-8 text-slate-300" /></div>}
                      </div>
                      <div className="p-3"><p className="truncate text-sm font-semibold text-slate-950">{product.title}</p><p className="mt-1 truncate text-xs text-slate-500">{product.vendor || product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</p></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {selectedProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">03 · {fr ? "Galerie produit" : "Product gallery"}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{fr ? "Choisissez une ou plusieurs images" : "Choose one or more images"}</h2>
              <p className="mt-1 text-sm text-slate-500">{fr ? `${selectedImages.length} image(s) sélectionnée(s) sur ${galleryImages.length}` : `${selectedImages.length} selected of ${galleryImages.length}`}</p>
            </div>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={selectAllImages} disabled={galleryImages.length === 0}>{fr ? "Tout sélectionner" : "Select all"}</Button><Button variant="ghost" size="sm" onClick={clearImages} disabled={selectedImages.length === 0}>{fr ? "Effacer" : "Clear"}</Button></div>
          </div>

          {galleryImages.length === 0 ? (
            <div className="mt-4 grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500">{fr ? "Ce produit n’a aucune image disponible." : "This product has no available image."}</div>
          ) : (
            <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {galleryImages.map((image, index) => {
                const selected = selectedImageKeys.has(image.key);
                return (
                  <button key={image.key} type="button" onClick={() => toggleImage(image.key)} className={`overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}>
                    <div className="relative aspect-square bg-slate-50"><img src={image.url} alt={`${selectedProduct.title} ${index + 1}`} className="h-full w-full object-contain p-3" /><span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm">{index === 0 ? (fr ? "Principale" : "Main") : `${fr ? "Galerie" : "Gallery"} ${index + 1}`}</span><span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border shadow-sm ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-transparent"}`}><Check className="h-4 w-4" /></span></div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">04 · {fr ? "Génération" : "Generation"}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{tool === "ambiance" ? "Ambiance Generator" : "White Background"}</h2>
              <p className="mt-1 text-sm text-slate-500">{fr ? "La génération ne modifie pas encore votre produit. Vous choisissez l’action après prévisualisation." : "Generation does not change the product yet. You choose the action after previewing."}</p>
            </div>
            <Button size="lg" onClick={handleGenerate} disabled={selectedImages.length === 0 || isGenerating || isApplying}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isGenerating ? (fr ? "Génération…" : "Generating…") : (fr ? `Générer ${selectedImages.length || ""}` : `Generate ${selectedImages.length || ""}`)}
            </Button>
          </div>

          {generated.length > 0 && (
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              <div className="grid gap-4 lg:grid-cols-2">
                {generated.map((result, index) => (
                  <div key={result.key} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-2 bg-slate-50">
                      <div className="border-r border-slate-200 p-2"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{fr ? "Source" : "Source"} {index + 1}</p><div className="aspect-square overflow-hidden rounded-xl bg-white"><img src={result.source.url} alt="Source" className="h-full w-full object-contain p-2" /></div></div>
                      <div className="p-2"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Générée" : "Generated"}</p><div className="aspect-square overflow-hidden rounded-xl bg-white"><img src={result.generatedUrl} alt="Generated background" className="h-full w-full object-contain" /></div></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-sm font-semibold text-slate-950">{fr ? "Que voulez-vous faire de ces images ?" : "What do you want to do with these images?"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{fr ? "Ajouter à la galerie conserve vos images actuelles. Remplacer modifie uniquement les images sources que vous avez cochées." : "Add to gallery keeps current images. Replace changes only the source images you selected."}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={applyToGallery} disabled={isApplying}><Plus className="mr-2 h-4 w-4" />{fr ? "Apply to gallery" : "Apply to gallery"}</Button>
                  <Button variant="outline" onClick={replaceChosenImages} disabled={isApplying}><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Replace chosen image" : "Replace chosen image"}</Button>
                  {isApplying && <span className="flex items-center text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{fr ? "Synchronisation…" : "Syncing…"}</span>}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><History className="h-4 w-4" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "Historique" : "History"}</p><h2 className="text-lg font-semibold text-slate-950">{fr ? "Images générées pour ce produit" : "Generated images for this product"}</h2></div></div>

          {history.length === 0 ? (
            <div className="mt-4 grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">{fr ? "Aucun historique appliqué pour ce produit." : "No applied image history for this product."}</div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {history.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-square bg-slate-50"><img src={item.optimized_url} alt="Generated history" className="h-full w-full object-contain" /></div>
                  <div className="p-3"><div className="flex items-center justify-between gap-2"><Badge variant="secondary" className="text-[10px]">{item.optimization_type === "white_background" ? "White" : "Ambiance"}</Badge><span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}</span></div><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => applyHistoryToProduct(item)} disabled={historyApplyingId === item.id || isApplying}>{historyApplyingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}{fr ? "Apply to product" : "Apply to product"}</Button></div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}