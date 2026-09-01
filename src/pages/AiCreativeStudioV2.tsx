import { useEffect, useMemo, useState } from "react";
import { Download, History, Image as ImageIcon, Loader2, RefreshCw, Trash2, X, ZoomIn } from "lucide-react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativeStyleGrid } from "@/components/social/creative/CreativeStyleGrid";
import {
  AdCreativeWizard,
  type AdCreativeWizardStep,
  type AdGenerationMode,
  type AdPostType,
  type AdWizardProduct,
} from "@/components/social/creative/AdCreativeWizard";
import type { CreativeStyle } from "@/components/social/templates/creativeStyles";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

type ShopifyProduct = AdWizardProduct & {
  vision_attributes?: {
    color?: string;
    material?: string;
    style?: string;
    shape?: string;
    features?: string[];
  } | null;
};

interface CreativeHistoryItem {
  id: string;
  product_title: string | null;
  template_name: string | null;
  image_url: string;
  created_at: string;
  caption?: string | null;
}

const detectLanguage = (text: string): "fr" | "en" => {
  const frenchWords = ["canapé", "table", "chaise", "fauteuil", "bureau", "lit", "meuble", "armoire", "étagère", "commode", "miroir", "avec", "pour", "noir", "blanc", "bois"];
  const lowerText = text.toLowerCase();
  return frenchWords.some((word) => lowerText.includes(word)) ? "fr" : "en";
};

const resolveGeneratedImage = (payload: any): string | null => {
  const direct = [payload?.imageUrl, payload?.image_url, payload?.url].find((value) => typeof value === "string" && value.trim());
  if (direct) return direct;

  const raw = [payload?.base64, payload?.base64Data, payload?.imageBase64].find((value) => typeof value === "string" && value.trim());
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:${payload?.mimeType || "image/png"};base64,${raw}`;
};

const readFunctionError = async (error: any): Promise<string> => {
  let message = error?.message || "Creative generation failed";
  const context = error?.context;
  if (!context || typeof context.clone !== "function") return message;

  try {
    const payload = await context.clone().json();
    if (payload?.error) message = payload.error;
  } catch {
    // Keep the original Supabase error message when the response is not JSON.
  }
  return message;
};

export default function AiCreativeStudioV2() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();

  const [activeTab, setActiveTab] = useState("studio");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<CreativeStyle | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<AdCreativeWizardStep>(1);
  const [generationMode, setGenerationMode] = useState<AdGenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(true);
  const [tagline, setTagline] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postType, setPostType] = useState<AdPostType>("withLink");
  const [socialCaption, setSocialCaption] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [history, setHistory] = useState<CreativeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewImage, setPreviewImage] = useState<CreativeHistoryItem | null>(null);

  useEffect(() => {
    void loadShopifyProducts();
  }, [selectedStore?.id]);

  useEffect(() => {
    if (activeTab === "history") void loadHistory();
  }, [activeTab]);

  const loadShopifyProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData, error: productsError } = await (supabase.from("shopify_products") as any)
        .select("id, title, vendor, product_type, vision_attributes, handle, image_url")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true });

      if (productsError) throw productsError;
      if (!productsData?.length) {
        setProducts([]);
        return;
      }

      const productIds = productsData.map((product: any) => product.id);
      const imageMap = new Map<string, string>();
      const variantMap = new Map<string, { price: number | null; compare_at_price: number | null }>();
      const batchSize = 50;

      for (let index = 0; index < productIds.length; index += batchSize) {
        const batchIds = productIds.slice(index, index + batchSize);
        const [{ data: imagesData }, { data: variantsData }] = await Promise.all([
          (supabase.from("product_images") as any)
            .select("product_id, src")
            .in("product_id", batchIds)
            .order("position", { ascending: true }),
          (supabase.from("product_variants") as any)
            .select("product_id, price, compare_at_price")
            .in("product_id", batchIds)
            .order("position", { ascending: true }),
        ]);

        (imagesData || []).forEach((image: any) => {
          if (!imageMap.has(image.product_id) && image.src) imageMap.set(image.product_id, image.src);
        });
        (variantsData || []).forEach((variant: any) => {
          if (!variantMap.has(variant.product_id)) {
            variantMap.set(variant.product_id, { price: variant.price, compare_at_price: variant.compare_at_price });
          }
        });
      }

      setProducts(productsData.map((product: any): ShopifyProduct => {
        const variant = variantMap.get(product.id);
        return {
          id: product.id,
          title: product.title,
          image: imageMap.get(product.id) || product.image_url || null,
          price: variant?.price?.toString() || null,
          compare_at_price: variant?.compare_at_price?.toString() || null,
          vendor: product.vendor,
          product_type: product.product_type,
          handle: product.handle,
          vision_attributes: product.vision_attributes,
        };
      }));
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Unable to load Shopify products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("creative_history")
        .select("id, product_title, template_name, image_url, created_at, caption")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedStore?.id) query = query.eq("store_id", selectedStore.id);
      const { data, error } = await query;
      if (error) throw error;
      setHistory((data || []) as CreativeHistoryItem[]);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Unable to load creative history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectStyle = (style: CreativeStyle) => {
    setSelectedStyle(style);
    setSelectedProduct(null);
    setGeneratedImage(null);
    setSocialCaption("");
    setTagline("");
    setSelectedPlatforms([]);
    setGenerationMode("showcase");
    setShowPrice(true);
    setWizardStep(1);
    setSearchQuery("");
    setWizardOpen(true);
  };

  const handleSelectProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setSocialCaption("");
  };

  const invalidateGeneratedCreative = () => setGeneratedImage(null);

  const changeGenerationMode = (mode: AdGenerationMode) => {
    setGenerationMode(mode);
    invalidateGeneratedCreative();
  };

  const changeShowPrice = (checked: boolean) => {
    setShowPrice(checked);
    invalidateGeneratedCreative();
  };

  const changeTagline = (value: string) => {
    setTagline(value);
    invalidateGeneratedCreative();
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  };

  const generateSocialCaption = async () => {
    if (!selectedProduct) {
      toast.error("Select a product first.");
      return;
    }

    setGeneratingCaption(true);
    try {
      const productLanguage = detectLanguage(selectedProduct.title);
      const { data, error } = await supabase.functions.invoke("generate-social-caption", {
        body: {
          productTitle: selectedProduct.title,
          productDescription: selectedProduct.product_type,
          productPrice: selectedProduct.price ? `${selectedProduct.price}€` : null,
          comparePrice: selectedProduct.compare_at_price ? `${selectedProduct.compare_at_price}€` : null,
          productType: selectedProduct.product_type,
          storeName: selectedStore?.store_name,
          language: productLanguage,
          tone: "engaging",
          platform: selectedPlatforms.includes("instagram") ? "instagram" : "facebook",
        },
      });
      if (error) throw new Error(await readFunctionError(error));
      if (!data?.caption) throw new Error("The caption service returned no text.");
      setSocialCaption(data.caption);
      toast.success("Caption generated.");
    } catch (error: any) {
      console.error("Error generating caption:", error);
      toast.error(error?.message || "Caption generation failed.");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const generateCreative = async (): Promise<string | null> => {
    if (!selectedProduct || !selectedStyle) {
      toast.error("Select a template and a product first.");
      return null;
    }
    if (!selectedProduct.image) {
      toast.error("This product has no usable source image. Choose another product or add a product image first.");
      return null;
    }

    setGenerating(true);
    try {
      const productLanguage = detectLanguage(selectedProduct.title);
      const { data, error } = await supabase.functions.invoke("export-creative-image", {
        body: {
          product: {
            ...selectedProduct,
            price: showPrice ? selectedProduct.price : null,
            compare_at_price: showPrice ? selectedProduct.compare_at_price : null,
            language: productLanguage,
          },
          template: {
            id: selectedStyle.id,
            name: selectedStyle.name,
            size: selectedStyle.size,
            category: selectedStyle.category,
            aiPromptStyle: selectedStyle.aiPromptStyle,
            accentColor: selectedStyle.accentColor,
          },
          caption: tagline,
          format: "png",
          mode: generationMode,
          showPrice,
          language: productLanguage,
        },
      });

      if (error) throw new Error(await readFunctionError(error));
      if (data?.error) throw new Error(data.error);

      const imageUrl = resolveGeneratedImage(data);
      if (!imageUrl) throw new Error("The AI service finished without returning an image. Please try again.");
      setGeneratedImage(imageUrl);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: historyError } = await supabase.from("creative_history").insert({
          user_id: user.id,
          store_id: selectedStore?.id,
          product_id: selectedProduct.id,
          product_title: selectedProduct.title,
          template_id: selectedStyle.id,
          template_name: selectedStyle.name,
          image_url: imageUrl,
          generation_mode: generationMode,
          caption: tagline,
        });
        if (historyError) console.warn("Creative generated but history save failed:", historyError);
      }

      toast.success("Creative generated successfully.");
      return imageUrl;
    } catch (error: any) {
      console.error("Error generating creative:", error);
      toast.error(error?.message || "Creative generation failed.");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${selectedProduct?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creative"}.png`;
    link.click();
    toast.success("Creative downloaded.");
  };

  const publishToSocial = async () => {
    if (!generatedImage || selectedPlatforms.length === 0 || !socialCaption.trim()) {
      toast.error("Select a platform and add a caption before publishing.");
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");

      const rawDomain = selectedStore?.public_domain || selectedStore?.store_url || "";
      const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const productLink = postType === "withLink" && selectedProduct?.handle && domain
        ? `https://${domain}/products/${selectedProduct.handle}`
        : null;

      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .insert({
          user_id: user.id,
          store_id: selectedStore?.id,
          status: "pending",
          channels: selectedPlatforms,
          caption: socialCaption,
          image_url: generatedImage,
          product_id: selectedProduct?.id,
          link_url: productLink,
          template_style: selectedStyle?.id || null,
        })
        .select()
        .single();

      if (postError) throw postError;
      const { error: publishError } = await supabase.functions.invoke("publish-social-post", {
        body: { postId: post.id, userId: user.id },
      });
      if (publishError) throw new Error(await readFunctionError(publishError));
      toast.success("Creative published.");
    } catch (error: any) {
      console.error("Error publishing creative:", error);
      toast.error(error?.message || "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from("creative_history").delete().eq("id", id);
      if (error) throw error;
      setHistory((current) => current.filter((item) => item.id !== id));
      toast.success("Creative deleted.");
    } catch (error) {
      console.error("Error deleting history item:", error);
      toast.error("Unable to delete this creative.");
    }
  };

  const canPublish = Boolean(generatedImage && selectedPlatforms.length > 0 && socialCaption.trim());
  const gallerySubtitle = useMemo(() => "Choose a premium template, then configure the product in a guided wizard.", []);

  return (
    <div className="min-h-screen bg-slate-50/40">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Studio · Ads creatives</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">AI Creative Studio</h1>
          <p className="mt-1 text-sm text-slate-500">{gallerySubtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="studio" className="rounded-lg">Studio</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg"><History className="h-4 w-4" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="mt-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
              <CreativeStyleGrid selectedStyle={selectedStyle} onSelectStyle={handleSelectStyle} />
            </section>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
                <div><h2 className="font-bold text-slate-950">Creative history</h2><p className="mt-0.5 text-xs text-slate-500">Your latest generated ads for this store.</p></div>
                <Button variant="ghost" size="sm" onClick={() => void loadHistory()} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
              </div>
              <div className="p-4 sm:p-5">
                {loadingHistory ? (
                  <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
                ) : history.length === 0 ? (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-sm text-slate-500"><div><ImageIcon className="mx-auto mb-3 h-9 w-9 text-slate-300" />No creatives yet.</div></div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {history.map((item) => (
                      <div key={item.id} className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50" onClick={() => setPreviewImage(item)}>
                        <img src={item.image_url} alt={item.product_title || "Creative"} loading="lazy" className="aspect-square w-full object-cover" />
                        <div className="absolute inset-0 flex flex-col justify-between bg-black/55 p-2 opacity-0 transition group-hover:opacity-100">
                          <div className="flex justify-between"><Button variant="secondary" size="icon" className="h-7 w-7 bg-white/20 text-white hover:bg-white/30" onClick={(event) => { event.stopPropagation(); setPreviewImage(item); }}><ZoomIn className="h-4 w-4" /></Button><Button variant="destructive" size="icon" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); void deleteHistoryItem(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                          <div className="text-white"><p className="truncate text-xs font-semibold">{item.product_title}</p><p className="mt-0.5 text-[10px] text-white/70">{format(new Date(item.created_at), "dd/MM/yyyy", { locale: language === "fr" ? fr : enUS })}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <AdCreativeWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        step={wizardStep}
        setStep={setWizardStep}
        selectedStyle={selectedStyle}
        selectedProduct={selectedProduct}
        products={products}
        loadingProducts={loadingProducts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectProduct={handleSelectProduct}
        generationMode={generationMode}
        onGenerationModeChange={changeGenerationMode}
        showPrice={showPrice}
        onShowPriceChange={changeShowPrice}
        tagline={tagline}
        onTaglineChange={changeTagline}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        postType={postType}
        setPostType={setPostType}
        socialCaption={socialCaption}
        setSocialCaption={setSocialCaption}
        generateSocialCaption={() => void generateSocialCaption()}
        generatingCaption={generatingCaption}
        generatedImage={generatedImage}
        generating={generating}
        generateCreative={generateCreative}
        publishToSocial={publishToSocial}
        publishing={publishing}
        canPublish={canPublish}
        downloadImage={downloadImage}
      />

      <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none bg-black/95 p-0">
          <DialogTitle className="sr-only">{previewImage?.product_title || "Creative preview"}</DialogTitle>
          {previewImage && (
            <div className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10 rounded-full text-white hover:bg-white/20" onClick={() => setPreviewImage(null)}><X className="h-5 w-5" /></Button>
              <img src={previewImage.image_url} alt={previewImage.product_title || "Creative"} className="max-h-[82vh] w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/85 to-transparent p-4 pt-14">
                <div className="min-w-0 text-white"><p className="truncate font-semibold">{previewImage.product_title}</p><p className="mt-0.5 text-xs text-white/70">{previewImage.template_name}</p></div>
                <Button variant="secondary" size="sm" className="shrink-0 gap-2" onClick={() => { const link = document.createElement("a"); link.href = previewImage.image_url; link.download = `creative-${previewImage.id}.png`; link.click(); }}><Download className="h-4 w-4" />Download</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
