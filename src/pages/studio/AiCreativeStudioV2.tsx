import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  Facebook,
  History,
  Image as ImageIconLucide,
  ImageIcon,
  Instagram,
  Link,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { CreativeStyleGrid } from "@/components/social/creative/CreativeStyleGrid";
import { type CreativeStyle } from "@/components/social/templates/creativeStyles";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

type GenerationMode = "showcase" | "strengths";
type PostType = "image" | "withLink";

interface ShopifyProduct {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
  vendor?: string | null;
  product_type?: string | null;
  handle?: string | null;
  vision_attributes?: {
    color?: string;
    material?: string;
    style?: string;
    shape?: string;
    features?: string[];
  } | null;
}

interface CreativeHistoryItem {
  id: string;
  product_title: string | null;
  template_name: string | null;
  image_url: string;
  created_at: string;
  caption?: string | null;
}

const detectLanguage = (text: string): "fr" | "en" => {
  const frenchWords = [
    "canapé",
    "table",
    "chaise",
    "fauteuil",
    "bureau",
    "lit",
    "meuble",
    "armoire",
    "étagère",
    "commode",
    "lampe",
    "tapis",
    "miroir",
    "avec",
    "pour",
    "dans",
    "sans",
    "noir",
    "blanc",
    "bois",
    "moderne",
    "design",
  ];
  const lowerText = text.toLowerCase();
  const matchCount = frenchWords.filter((word) => lowerText.includes(word)).length;
  return matchCount >= 1 ? "fr" : "en";
};

const getFormatLabel = (size?: CreativeStyle["size"]) => {
  if (size === "story") return "9:16";
  if (size === "landscape") return "16:9";
  if (size === "square") return "1:1";
  return "—";
};

export default function AiCreativeStudioV2() {
  const { selectedStore } = useStore();
  const { t, language } = useTranslation();
  const isFr = language === "fr";

  const [activeTab, setActiveTab] = useState("studio");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<CreativeStyle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);

  const [generationMode, setGenerationMode] = useState<GenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(true);
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postType, setPostType] = useState<PostType>("withLink");
  const [socialCaption, setSocialCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [history, setHistory] = useState<CreativeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewImage, setPreviewImage] = useState<CreativeHistoryItem | null>(null);

  useEffect(() => {
    loadShopifyProducts();
  }, [selectedStore?.id]);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

  const loadShopifyProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData, error: productsError } = await (supabase.from("shopify_products") as any)
        .select("id, title, vendor, product_type, vision_attributes, handle")
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
        const { data: imagesData } = await (supabase.from("product_images") as any)
          .select("product_id, src")
          .in("product_id", batchIds)
          .order("position", { ascending: true });

        (imagesData || []).forEach((image: any) => {
          if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, image.src);
        });

        const { data: variantsData } = await (supabase.from("product_variants") as any)
          .select("product_id, price, compare_at_price")
          .in("product_id", batchIds)
          .order("position", { ascending: true });

        (variantsData || []).forEach((variant: any) => {
          if (!variantMap.has(variant.product_id)) {
            variantMap.set(variant.product_id, {
              price: variant.price,
              compare_at_price: variant.compare_at_price,
            });
          }
        });
      }

      setProducts(
        productsData.map((product: any): ShopifyProduct => {
          const variant = variantMap.get(product.id);
          return {
            id: product.id,
            title: product.title,
            image: imageMap.get(product.id) || null,
            price: variant?.price?.toString() || null,
            compare_at_price: variant?.compare_at_price?.toString() || null,
            vendor: product.vendor,
            product_type: product.product_type,
            handle: product.handle,
            vision_attributes: product.vision_attributes,
          };
        }),
      );
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error(t.toasts.error.loading);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("creative_history")
        .select("id, product_title, template_name, image_url, created_at, caption")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from("creative_history").delete().eq("id", id);
      if (error) throw error;
      setHistory((current) => current.filter((item) => item.id !== id));
      toast.success(t.toasts.success.deleted);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(t.toasts.error.deleting);
    }
  };

  const handleSelectProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setSocialCaption("");
    setProductPickerOpen(false);
  };

  const handleSelectStyle = (style: CreativeStyle) => {
    setSelectedStyle(style);
    setGeneratedImage(null);
    setStylePickerOpen(false);
  };

  const generateSocialCaption = async () => {
    if (!selectedProduct) {
      toast.error(t.creativeStudio.toast.selectProduct);
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

      if (error) throw error;
      if (data?.caption) {
        setSocialCaption(data.caption);
        toast.success(t.toasts.success.created);
      }
    } catch (error: any) {
      console.error("Error generating caption:", error);
      toast.error(t.creativeStudio.toast.generationError);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const generateCreative = async () => {
    if (!selectedProduct || !selectedStyle) {
      toast.error(t.creativeStudio.toast.selectProduct);
      return;
    }

    setGenerating(true);
    try {
      const productLanguage = detectLanguage(selectedProduct.title);
      const productForGeneration = {
        ...selectedProduct,
        price: showPrice ? selectedProduct.price : null,
        compare_at_price: showPrice ? selectedProduct.compare_at_price : null,
        language: productLanguage,
      };

      const { data, error } = await supabase.functions.invoke("export-creative-image", {
        body: {
          product: productForGeneration,
          template: {
            id: selectedStyle.id,
            name: selectedStyle.name,
            size: selectedStyle.size,
            category: selectedStyle.category,
            aiPromptStyle: selectedStyle.aiPromptStyle,
            accentColor: selectedStyle.accentColor,
          },
          caption,
          format: "png",
          mode: generationMode,
          showPrice,
          language: productLanguage,
        },
      });

      if (error) throw error;
      if (data?.base64) {
        const imageUrl = `data:image/png;base64,${data.base64}`;
        setGeneratedImage(imageUrl);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("creative_history").insert({
            user_id: user.id,
            store_id: selectedStore?.id,
            product_id: selectedProduct.id,
            product_title: selectedProduct.title,
            template_id: selectedStyle.id,
            template_name: selectedStyle.name,
            image_url: imageUrl,
            generation_mode: generationMode,
            caption,
          });
        }

        toast.success(t.creativeStudio.toast.generated);
      }
    } catch (error: any) {
      console.error("Error generating creative:", error);
      toast.error(error.message || t.creativeStudio.toast.generationError);
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const anchor = document.createElement("a");
    anchor.href = generatedImage;
    anchor.download = `${selectedProduct?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creative"}.png`;
    anchor.click();
    toast.success(t.creativeStudio.toast.downloaded);
  };

  const publishToSocial = async () => {
    if (!generatedImage || selectedPlatforms.length === 0) {
      toast.error(t.creativeStudio.toast.selectPlatform);
      return;
    }

    if (!socialCaption.trim()) {
      toast.error(t.creativeStudio.steps.social.noPages);
      return;
    }

    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const productLink =
        postType === "withLink" && selectedProduct?.handle
          ? `https://${selectedStore?.public_domain || selectedStore?.store_url?.replace("https://", "") || ""}/products/${selectedProduct.handle}`
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
      if (publishError) throw publishError;

      toast.success(t.creativeStudio.toast.published);
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error.message || t.creativeStudio.toast.publishError);
    } finally {
      setPublishing(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const canGenerate = Boolean(selectedProduct && selectedStyle);
  const canPublish = Boolean(generatedImage && selectedPlatforms.length > 0 && socialCaption.trim());
  const completion = Number(Boolean(selectedProduct)) + Number(Boolean(selectedStyle)) + 1;
  const previewUrl = generatedImage || selectedProduct?.image || null;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">{isFr ? "Creative Studio" : "Creative Studio"}</p>
              <p className="text-xs text-slate-500">
                {isFr ? "Un brief court, puis une génération." : "A short brief, then generation."}
              </p>
            </div>
          </div>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="studio" className="gap-2">
              <Wand2 className="h-4 w-4" />Studio
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />{isFr ? "Historique" : "History"}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="studio" className="mt-4 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-4">
              <FlowStatus
                number="1"
                title={isFr ? "Produit" : "Product"}
                text={selectedProduct ? selectedProduct.title : isFr ? "À choisir" : "Choose"}
                complete={Boolean(selectedProduct)}
              />
              <FlowStatus
                number="2"
                title={isFr ? "Direction" : "Direction"}
                text={selectedStyle?.name || (isFr ? "À choisir" : "Choose")}
                complete={Boolean(selectedStyle)}
              />
              <FlowStatus
                number="3"
                title={isFr ? "Réglages" : "Settings"}
                text={`${generationMode === "showcase" ? (isFr ? "Mise en scène" : "Showcase") : isFr ? "Points forts" : "Strengths"} · ${showPrice ? (isFr ? "prix" : "price") : isFr ? "sans prix" : "no price"}`}
                complete
              />
              <FlowStatus
                number="4"
                title={isFr ? "Générer" : "Generate"}
                text={canGenerate ? (isFr ? "Prêt" : "Ready") : `${completion}/3`}
                complete={canGenerate}
              />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  icon={Package}
                  eyebrow={isFr ? "Étape 1" : "Step 1"}
                  title={isFr ? "Choisissez le produit" : "Choose the product"}
                  description={isFr ? "Le produit devient la référence visuelle du brief." : "The product becomes the visual reference for the brief."}
                  complete={Boolean(selectedProduct)}
                />
                <div className="p-4 sm:p-5">
                  {selectedProduct ? (
                    <div className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50/30 p-3 sm:flex-row sm:items-center">
                      <div className="grid h-24 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-white sm:w-28">
                        {selectedProduct.image ? (
                          <img src={selectedProduct.image} alt={selectedProduct.title} className="h-full w-full object-contain p-2" />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{selectedProduct.vendor || selectedProduct.product_type || (isFr ? "Catalogue" : "Catalog")}</Badge>
                          {selectedProduct.price && <Badge variant="outline">{selectedProduct.price}€</Badge>}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-slate-950">{selectedProduct.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedProduct.vision_attributes?.material || selectedProduct.product_type || (isFr ? "Image principale du catalogue" : "Main catalog image")}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setProductPickerOpen(true)} className="shrink-0">
                        {isFr ? "Changer" : "Change"}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProductPickerOpen(true)}
                      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-left transition hover:border-violet-300 hover:bg-violet-50/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                          <Search className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{isFr ? "Ouvrir le catalogue" : "Open catalog"}</p>
                          <p className="mt-1 text-xs text-slate-500">{isFr ? "Recherche par nom, marque ou type de produit." : "Search by name, brand or product type."}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  icon={Palette}
                  eyebrow={isFr ? "Étape 2" : "Step 2"}
                  title={isFr ? "Choisissez la direction créative" : "Choose the creative direction"}
                  description={isFr ? "Les catégories et formats restent disponibles, mais hors du flux principal." : "Categories and formats remain available, without cluttering the main flow."}
                  complete={Boolean(selectedStyle)}
                />
                <div className="p-4 sm:p-5">
                  {selectedStyle ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="relative min-h-32 p-5" style={{ background: selectedStyle.previewGradient }}>
                          <span className="text-4xl">{selectedStyle.previewIcon}</span>
                          <Badge className="absolute bottom-3 left-3 bg-slate-950/80 text-white hover:bg-slate-950/80">
                            {getFormatLabel(selectedStyle.size)}
                          </Badge>
                        </div>
                        <div className="flex flex-col justify-between gap-4 p-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{selectedStyle.category}</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950">{selectedStyle.name}</h3>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{selectedStyle.moodKeywords.slice(0, 4).join(" · ")}</p>
                          </div>
                          <Button variant="outline" size="sm" className="w-fit" onClick={() => setStylePickerOpen(true)}>
                            {isFr ? "Changer le style" : "Change style"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStylePickerOpen(true)}
                      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-left transition hover:border-violet-300 hover:bg-violet-50/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                          <Palette className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{isFr ? "Parcourir les styles" : "Browse styles"}</p>
                          <p className="mt-1 text-xs text-slate-500">{isFr ? "Luxe, lifestyle, minimal, éditorial, saisonnier…" : "Luxury, lifestyle, minimal, editorial, seasonal…"}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  icon={SlidersHorizontal}
                  eyebrow={isFr ? "Étape 3" : "Step 3"}
                  title={isFr ? "Affinez le rendu" : "Refine the output"}
                  description={isFr ? "Quelques réglages utiles, sans formulaire interminable." : "Only the useful settings, without a long form."}
                  complete
                />
                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-800">{t.creativeStudio.steps.options.mode}</p>
                    <button
                      type="button"
                      onClick={() => setGenerationMode("showcase")}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                        generationMode === "showcase" ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <Eye className="h-4 w-4 text-violet-700" />
                      <span className="flex-1 text-sm font-medium">{t.creativeStudio.steps.options.showcase}</span>
                      {generationMode === "showcase" && <Check className="h-4 w-4 text-violet-700" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationMode("strengths")}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                        generationMode === "strengths" ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <Star className="h-4 w-4 text-violet-700" />
                      <span className="flex-1 text-sm font-medium">{t.creativeStudio.steps.options.strengths}</span>
                      {generationMode === "strengths" && <Check className="h-4 w-4 text-violet-700" />}
                    </button>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <span className="text-sm text-slate-700">{t.creativeStudio.steps.options.showPrice}</span>
                      <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">{t.creativeStudio.steps.caption.title}</label>
                    <Textarea
                      placeholder={t.creativeStudio.steps.caption.placeholder}
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      rows={7}
                      className="resize-none"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {isFr ? "Optionnel : ajoutez une accroche ou une instruction visuelle courte." : "Optional: add a short hook or visual instruction."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader
                  icon={Share2}
                  eyebrow={isFr ? "Optionnel" : "Optional"}
                  title={isFr ? "Préparer la publication sociale" : "Prepare social publishing"}
                  description={isFr ? "La génération du visuel reste indépendante de la publication." : "Creative generation stays independent from publishing."}
                  complete={selectedPlatforms.length > 0 && Boolean(socialCaption.trim())}
                />
                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-800">{t.creativeStudio.steps.social.platform}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlatform("facebook")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm transition",
                          selectedPlatforms.includes("facebook") ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300",
                        )}
                      >
                        <Facebook className="h-4 w-4 text-blue-600" />Facebook
                        {selectedPlatforms.includes("facebook") && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlatform("instagram")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm transition",
                          selectedPlatforms.includes("instagram") ? "border-pink-300 bg-pink-50" : "border-slate-200 hover:border-slate-300",
                        )}
                      >
                        <Instagram className="h-4 w-4 text-pink-600" />Instagram
                        {selectedPlatforms.includes("instagram") && <Check className="ml-auto h-4 w-4 text-pink-600" />}
                      </button>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{t.creativeStudio.steps.social.postType}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPostType("image")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm transition",
                          postType === "image" ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                        )}
                      >
                        <ImageIconLucide className="h-4 w-4" />{t.creativeStudio.steps.social.imageOnly}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostType("withLink")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm transition",
                          postType === "withLink" ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                        )}
                      >
                        <Link className="h-4 w-4" />{t.creativeStudio.steps.social.withLink}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-slate-800">{t.creativeStudio.result.editableCaption}</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateSocialCaption}
                        disabled={!selectedProduct || generatingCaption}
                        className="h-8 gap-1 text-xs"
                      >
                        {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {isFr ? "Générer avec IA" : "Generate with AI"}
                      </Button>
                    </div>
                    <Textarea
                      placeholder={t.creativeStudio.steps.caption.placeholder}
                      value={socialCaption}
                      onChange={(event) => setSocialCaption(event.target.value)}
                      rows={7}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-3 xl:sticky xl:top-[72px] xl:self-start">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{isFr ? "Aperçu" : "Preview"}</p>
                      <h2 className="mt-1 text-base font-semibold text-slate-950">{isFr ? "Votre créatif" : "Your creative"}</h2>
                    </div>
                    {selectedStyle && <Badge variant="secondary">{getFormatLabel(selectedStyle.size)}</Badge>}
                  </div>
                </div>

                <div className="p-3">
                  <div
                    className="relative grid min-h-[360px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    style={
                      !generatedImage && selectedStyle
                        ? { background: selectedStyle.previewGradient }
                        : undefined
                    }
                  >
                    {generating ? (
                      <div className="text-center">
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
                        <p className="mt-3 text-sm font-medium text-slate-700">{t.creativeStudio.generate.generating}</p>
                      </div>
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={selectedProduct?.title || "Creative preview"}
                        className={cn(
                          "max-h-[430px] w-full",
                          generatedImage ? "object-contain" : "object-contain p-8 drop-shadow-xl",
                        )}
                      />
                    ) : (
                      <div className="max-w-[240px] text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                          <ImageIcon className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-slate-800">{isFr ? "L’aperçu se construit ici" : "Your preview appears here"}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{isFr ? "Choisissez d’abord un produit puis une direction créative." : "Choose a product and a creative direction first."}</p>
                      </div>
                    )}
                    {!generatedImage && selectedStyle && (
                      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-950/75 p-3 text-white backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{selectedStyle.name}</p>
                            <p className="text-[11px] text-white/70">{selectedStyle.moodKeywords.slice(0, 3).join(" · ")}</p>
                          </div>
                          <span className="text-xl">{selectedStyle.previewIcon}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 p-4">
                  <SummaryRow label={isFr ? "Produit" : "Product"} value={selectedProduct?.title || (isFr ? "Non sélectionné" : "Not selected")} />
                  <SummaryRow label={isFr ? "Style" : "Style"} value={selectedStyle?.name || (isFr ? "Non sélectionné" : "Not selected")} />
                  <SummaryRow label={isFr ? "Format" : "Format"} value={getFormatLabel(selectedStyle?.size)} />

                  <Button
                    size="lg"
                    onClick={generateCreative}
                    disabled={!canGenerate || generating}
                    className="mt-3 w-full"
                  >
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {t.creativeStudio.generate.button}
                  </Button>
                  {!canGenerate && (
                    <p className="text-center text-xs text-slate-500">{isFr ? "Produit + style requis pour générer." : "Product + style required to generate."}</p>
                  )}
                </div>
              </section>

              {generatedImage && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="h-4 w-4" />
                    <p className="text-sm font-semibold">{isFr ? "Créatif généré" : "Creative generated"}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={downloadImage} className="bg-white">
                      <Download className="mr-2 h-4 w-4" />{t.creativeStudio.result.download}
                    </Button>
                    <Button onClick={publishToSocial} disabled={!canPublish || publishing}>
                      {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {t.creativeStudio.result.publish}
                    </Button>
                  </div>
                  {!canPublish && (
                    <p className="mt-2 text-xs leading-5 text-emerald-900/60">
                      {isFr ? "Pour publier : choisissez un réseau et ajoutez une légende." : "To publish: choose a network and add a caption."}
                    </p>
                  )}
                </section>
              )}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{isFr ? "Bibliothèque" : "Library"}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">{t.creativeStudio.history.title}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory}>
                <RefreshCw className="mr-2 h-4 w-4" />{t.creativeStudio.history.refresh}
              </Button>
            </div>
            <div className="p-5">
              {loadingHistory ? (
                <div className="grid min-h-72 place-items-center">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-200 text-center">
                  <div>
                    <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">{t.creativeStudio.history.noCreatives}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-violet-300 hover:shadow-md"
                      onClick={() => setPreviewImage(item)}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-50">
                        <img src={item.image_url} alt={item.product_title || "Creative"} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                        <div className="absolute inset-x-2 top-2 flex justify-between opacity-0 transition group-hover:opacity-100">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950/75 text-white"><ZoomIn className="h-4 w-4" /></span>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.product_title || (isFr ? "Créatif" : "Creative")}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.template_name || "—"}</p>
                        <p className="mt-2 text-[11px] text-slate-400">{format(new Date(item.created_at), "dd/MM/yyyy", { locale: isFr ? fr : enUS })}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-h-[88vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle>{isFr ? "Choisir un produit" : "Choose a product"}</DialogTitle>
            <DialogDescription>
              {isFr ? "Le catalogue reste disponible sans envahir l’espace de création." : "Your catalog stays available without taking over the creative workspace."}
            </DialogDescription>
          </DialogHeader>
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isFr ? "Rechercher nom, marque ou type…" : "Search name, brand or type…"}
                className="pl-9"
              />
            </div>
          </div>
          <div className="max-h-[62vh] overflow-y-auto p-6">
            {loadingProducts ? (
              <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="grid min-h-72 place-items-center text-sm text-slate-500">{isFr ? "Aucun produit trouvé." : "No products found."}</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const selected = selectedProduct?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className={cn(
                        "group overflow-hidden rounded-2xl border bg-white text-left transition",
                        selected ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:shadow-sm",
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="h-full w-full object-contain p-3 transition group-hover:scale-[1.02]" />
                        ) : (
                          <div className="grid h-full place-items-center"><ImageIcon className="h-8 w-8 text-slate-300" /></div>
                        )}
                        {selected && <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-4 w-4" /></span>}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{product.title}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="truncate">{product.vendor || product.product_type || (isFr ? "Catalogue" : "Catalog")}</span>
                          {product.price && <span className="shrink-0 font-semibold text-slate-800">{product.price}€</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stylePickerOpen} onOpenChange={setStylePickerOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle>{isFr ? "Choisir une direction créative" : "Choose a creative direction"}</DialogTitle>
            <DialogDescription>
              {isFr ? "Filtrez par univers et format, puis choisissez un seul style." : "Filter by visual universe and format, then choose one style."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[72vh] overflow-y-auto p-5 sm:p-6">
            <CreativeStyleGrid selectedStyle={selectedStyle} onSelectStyle={handleSelectStyle} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none bg-black/95 p-0">
          <DialogTitle className="sr-only">{previewImage?.product_title || "Creative Preview"}</DialogTitle>
          {previewImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 rounded-full text-white hover:bg-white/20"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <img src={previewImage.image_url} alt={previewImage.product_title || "Creative"} className="max-h-[80vh] w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0 text-white">
                    <p className="truncate text-lg font-semibold">{previewImage.product_title}</p>
                    <p className="mt-1 text-sm text-white/70">
                      {previewImage.template_name} · {format(new Date(previewImage.created_at), "dd MMMM yyyy", { locale: isFr ? fr : enUS })}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const anchor = document.createElement("a");
                      anchor.href = previewImage.image_url;
                      anchor.download = `creative-${previewImage.id}.png`;
                      anchor.click();
                      toast.success(t.creativeStudio.toast.downloaded);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />{t.creativeStudio.result.download}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowStatus({
  number,
  title,
  text,
  complete,
}: {
  number: string;
  title: string;
  text: string;
  complete: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-xl px-3 py-2", complete ? "bg-emerald-50/70" : "bg-slate-50")}>
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold", complete ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>
        {complete ? <Check className="h-3.5 w-3.5" /> : number}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-900">{title}</p>
        <p className="truncate text-[11px] text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  complete,
}: {
  icon: typeof Package;
  eyebrow: string;
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600">{eyebrow}</p>
          {complete && <Badge variant="secondary" className="h-5 bg-emerald-50 px-2 text-[10px] text-emerald-700">OK</Badge>}
        </div>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="line-clamp-1 text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
