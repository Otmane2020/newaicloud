import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Eye,
  Facebook,
  History,
  Image as ImageIcon,
  ImageIcon as ImageIconLucide,
  Instagram,
  Link,
  Loader2,
  RefreshCw,
  Search,
  Send,
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
import { fr as frLocale, enUS } from "date-fns/locale";

type GenerationMode = "showcase" | "strengths";
type PostType = "image" | "withLink";
type SocialPlatform = "facebook" | "instagram";
type WizardStep = 1 | 2 | 3 | 4;

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

const WIZARD_STEPS = [
  { id: 1 as const, label: "Product" },
  { id: 2 as const, label: "Creative setup" },
  { id: 3 as const, label: "Preview" },
  { id: 4 as const, label: "Validation" },
];

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

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState("studio");

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CreativeStyle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [caption, setCaption] = useState("");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [postType, setPostType] = useState<PostType>("withLink");
  const [socialCaption, setSocialCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [history, setHistory] = useState<CreativeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewImage, setPreviewImage] = useState<CreativeHistoryItem | null>(null);

  useEffect(() => {
    loadShopifyProducts();
  }, [selectedStore]);

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

      for (let i = 0; i < productIds.length; i += batchSize) {
        const batchIds = productIds.slice(i, i + batchSize);

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
      toast.success("Creative deleted");
    } catch (error) {
      console.error("Error deleting creative:", error);
      toast.error("Unable to delete this creative");
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const openTemplateWizard = (style: CreativeStyle) => {
    setSelectedStyle(style);
    setSelectedProduct(null);
    setSearchQuery("");
    setCaption("");
    setSocialCaption("");
    setGeneratedImage(null);
    setGenerationMode("showcase");
    setShowPrice(true);
    setSelectedPlatforms([]);
    setPostType("withLink");
    setWizardStep(1);
    setWizardOpen(true);
  };

  const selectProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setSocialCaption("");
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  };

  const generateSocialCaption = async () => {
    if (!selectedProduct) {
      toast.error("Select a product first");
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
      if (data?.caption) setSocialCaption(data.caption);
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error("Unable to generate the social caption");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const generateCreative = async () => {
    if (!selectedProduct || !selectedStyle) {
      toast.error("Select a template and a product first");
      return false;
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
      if (!data?.base64) throw new Error("The generator did not return an image");

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

      setWizardStep(3);
      toast.success("Preview generated");
      return true;
    } catch (error: any) {
      console.error("Error generating creative:", error);
      toast.error(error?.message || "Creative generation failed");
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const publishToSocial = async () => {
    if (!generatedImage || selectedPlatforms.length === 0) {
      toast.error("Choose at least one social platform");
      return false;
    }
    if (!socialCaption.trim()) {
      toast.error("Add or generate a social caption before publishing");
      return false;
    }

    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

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

      toast.success("Creative published");
      setWizardOpen(false);
      setActiveTab("history");
      return true;
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error?.message || "Publishing failed");
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const downloadImage = (image = generatedImage, fileName?: string) => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = fileName || `${selectedProduct?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creative"}.png`;
    link.click();
  };

  const approveCreative = () => {
    toast.success("Creative approved");
    setWizardOpen(false);
    setActiveTab("history");
  };

  const canMoveFromProduct = Boolean(selectedProduct);
  const canPublish = Boolean(generatedImage && selectedPlatforms.length > 0 && socialCaption.trim());

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 p-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Creative Studio</h1>
              <p className="text-sm text-muted-foreground">Choose a template, then complete the creative in a guided wizard.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="studio" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="studio">
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b bg-muted/30 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Ad creatives</p>
                <h2 className="mt-1 text-lg font-semibold">Choose a template</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Clicking a template opens the full Product → Creative setup → Preview → Validation flow.
                </p>
              </div>
              <div className="p-4">
                <CreativeStyleGrid selectedStyle={selectedStyle} onSelectStyle={openTemplateWizard} />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="history">
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <div>
                  <h2 className="font-semibold">Creative history</h2>
                  <p className="text-xs text-muted-foreground">Previously generated and approved visuals.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={loadHistory} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="p-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No creatives yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {history.map((item) => (
                      <div key={item.id} className="group relative cursor-pointer" onClick={() => setPreviewImage(item)}>
                        <img
                          src={item.image_url}
                          alt={item.product_title || "Creative"}
                          className="aspect-square w-full rounded-lg object-cover transition-transform group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 flex flex-col justify-between rounded-lg bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex justify-between">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 bg-white/20 hover:bg-white/40"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreviewImage(item);
                              }}
                            >
                              <ZoomIn className="h-4 w-4 text-white" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteHistoryItem(item.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="text-xs text-white">
                            <p className="truncate font-medium">{item.product_title}</p>
                            <p className="opacity-70">
                              {format(new Date(item.created_at), "dd/MM/yyyy", {
                                locale: language === "fr" ? frLocale : enUS,
                              })}
                            </p>
                          </div>
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

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="flex h-[88vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Ad creative wizard</DialogTitle>

          <div className="border-b bg-white px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">{selectedStyle?.name}</Badge>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Ad creative wizard</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Build and validate your creative</h2>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {WIZARD_STEPS.map((step, index) => {
                  const active = wizardStep === step.id;
                  const done = wizardStep > step.id;
                  return (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          className={cn(
                            "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold",
                            active && "border-violet-600 bg-violet-600 text-white",
                            done && "border-emerald-500 bg-emerald-500 text-white",
                            !active && !done && "border-slate-200 bg-white text-slate-500",
                          )}
                        >
                          {done ? <Check className="h-4 w-4" /> : step.id}
                        </span>
                        <span className={cn("text-xs font-semibold", active ? "text-slate-950" : "text-slate-500")}>{step.label}</span>
                      </div>
                      {index < WIZARD_STEPS.length - 1 && <div className="h-px w-6 bg-slate-200" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6">
            {wizardStep === 1 && (
              <div className="mx-auto max-w-5xl space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Step 1</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">Select a product</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose the Shopify product that will be placed into this template.</p>
                </div>

                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products by name, brand or type…"
                    className="h-11 bg-white pl-9"
                  />
                </div>

                {loadingProducts ? (
                  <div className="grid min-h-72 place-items-center rounded-2xl border bg-white">
                    <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                  </div>
                ) : (
                  <ScrollArea className="h-[48vh] rounded-2xl border bg-white p-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {filteredProducts.map((product) => {
                        const active = selectedProduct?.id === product.id;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md",
                              active ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200",
                            )}
                          >
                            <div className="aspect-[4/3] bg-slate-50 p-3">
                              {product.image ? (
                                <img src={product.image} alt={product.title} className="h-full w-full object-contain" />
                              ) : (
                                <div className="grid h-full place-items-center text-slate-300">
                                  <ImageIcon className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="line-clamp-2 text-sm font-semibold text-slate-950">{product.title}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{product.vendor || product.product_type || "Catalog product"}</p>
                            </div>
                            {active && (
                              <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white shadow-lg">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Step 2</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950">Creative setup</h3>
                  <p className="mt-1 text-sm text-slate-500">Configure the generation before creating the preview.</p>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-800">Generation mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGenerationMode("showcase")}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                            generationMode === "showcase" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200",
                          )}
                        >
                          <Eye className="h-4 w-4" /> Showcase
                          {generationMode === "showcase" && <Check className="ml-auto h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenerationMode("strengths")}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                            generationMode === "strengths" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200",
                          )}
                        >
                          <Star className="h-4 w-4" /> Strengths
                          {generationMode === "strengths" && <Check className="ml-auto h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Show price</p>
                        <p className="text-xs text-slate-500">Optional price inside the generated creative.</p>
                      </div>
                      <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-800">Creative tagline / instruction</label>
                      <Textarea
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        placeholder="Example: Limited offer · premium collection · minimalist headline…"
                        rows={4}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Publishing setup</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950">Social options</h3>
                  <p className="mt-1 text-sm text-slate-500">Prepare the final caption and channels now; publishing still requires validation.</p>

                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlatform("facebook")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                          selectedPlatforms.includes("facebook") ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200",
                        )}
                      >
                        <Facebook className="h-4 w-4" /> Facebook
                        {selectedPlatforms.includes("facebook") && <Check className="ml-auto h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlatform("instagram")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                          selectedPlatforms.includes("instagram") ? "border-pink-500 bg-pink-50 text-pink-800" : "border-slate-200",
                        )}
                      >
                        <Instagram className="h-4 w-4" /> Instagram
                        {selectedPlatforms.includes("instagram") && <Check className="ml-auto h-4 w-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPostType("image")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                          postType === "image" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200",
                        )}
                      >
                        <ImageIconLucide className="h-4 w-4" /> Image only
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostType("withLink")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium",
                          postType === "withLink" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200",
                        )}
                      >
                        <Link className="h-4 w-4" /> With link
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-slate-800">Social caption</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateSocialCaption}
                          disabled={generatingCaption}
                          className="h-8 gap-1 text-xs"
                        >
                          {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Generate with AI
                        </Button>
                      </div>
                      <Textarea
                        value={socialCaption}
                        onChange={(event) => setSocialCaption(event.target.value)}
                        placeholder="Write or generate the caption used when you publish."
                        rows={6}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="mx-auto max-w-5xl">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Step 3</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">Preview</h3>
                  <p className="mt-1 text-sm text-slate-500">Review the generated visual before final validation.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <section className="grid min-h-[480px] place-items-center overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
                    {generating ? (
                      <div className="text-center">
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
                        <p className="mt-3 text-sm text-slate-500">Generating your preview…</p>
                      </div>
                    ) : generatedImage ? (
                      <img src={generatedImage} alt="Generated ad creative" className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-xl" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="mx-auto h-12 w-12" />
                        <p className="mt-3 text-sm">No preview generated yet.</p>
                      </div>
                    )}
                  </section>

                  <aside className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Creative summary</p>
                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Template</p>
                        <p className="font-semibold text-slate-950">{selectedStyle?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Product</p>
                        <p className="font-semibold text-slate-950">{selectedProduct?.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Mode</p>
                        <p className="font-semibold capitalize text-slate-950">{generationMode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Price</p>
                        <p className="font-semibold text-slate-950">{showPrice ? "Visible" : "Hidden"}</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <Button variant="outline" className="w-full gap-2" onClick={() => setWizardStep(2)}>
                        <ArrowLeft className="h-4 w-4" /> Edit setup
                      </Button>
                      <Button className="w-full gap-2" onClick={generateCreative} disabled={generating}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Regenerate preview
                      </Button>
                    </div>
                  </aside>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="mx-auto max-w-5xl">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Step 4</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">Validation</h3>
                  <p className="mt-1 text-sm text-slate-500">Approve the creative, download it, or publish it to the selected channels.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="grid min-h-[460px] place-items-center overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
                    {generatedImage && <img src={generatedImage} alt="Creative ready for validation" className="max-h-[58vh] max-w-full rounded-xl object-contain shadow-xl" />}
                  </section>

                  <aside className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-800">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Ready for validation</p>
                        <p className="text-xs text-emerald-700">Nothing is published until you confirm.</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4 border-b pb-3">
                        <span className="text-slate-500">Template</span>
                        <strong className="text-right text-slate-950">{selectedStyle?.name}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b pb-3">
                        <span className="text-slate-500">Product</span>
                        <strong className="max-w-[220px] truncate text-right text-slate-950">{selectedProduct?.title}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b pb-3">
                        <span className="text-slate-500">Channels</span>
                        <strong className="text-right capitalize text-slate-950">{selectedPlatforms.length ? selectedPlatforms.join(" · ") : "None"}</strong>
                      </div>
                      <div>
                        <p className="text-slate-500">Caption</p>
                        <p className="mt-1 max-h-28 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                          {socialCaption || "No publishing caption configured."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={approveCreative}>
                        <Check className="h-4 w-4" /> Approve creative
                      </Button>
                      <Button variant="outline" className="w-full gap-2" onClick={() => downloadImage()}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                      <Button className="w-full gap-2" onClick={publishToSocial} disabled={!canPublish || publishing}>
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Publish now
                      </Button>
                      {!canPublish && (
                        <p className="text-center text-[11px] leading-4 text-slate-400">To publish, choose a channel and add a social caption in step 2.</p>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-white px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (wizardStep === 1) setWizardOpen(false);
                else setWizardStep((wizardStep - 1) as WizardStep);
              }}
              disabled={generating || publishing}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-2">
              {wizardStep === 1 && (
                <Button onClick={() => setWizardStep(2)} disabled={!canMoveFromProduct} className="gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {wizardStep === 2 && (
                <Button onClick={generateCreative} disabled={generating || !selectedProduct} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate preview
                </Button>
              )}
              {wizardStep === 3 && (
                <Button onClick={() => setWizardStep(4)} disabled={!generatedImage || generating} className="gap-2">
                  Continue to validation <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none bg-black/95 p-0">
          <DialogTitle className="sr-only">{previewImage?.product_title || "Creative preview"}</DialogTitle>
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 text-white">
                    <p className="truncate text-lg font-semibold">{previewImage.product_title}</p>
                    <p className="text-sm opacity-70">
                      {previewImage.template_name} · {format(new Date(previewImage.created_at), "dd MMMM yyyy", { locale: language === "fr" ? frLocale : enUS })}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => downloadImage(previewImage.image_url, `creative-${previewImage.id}.png`)}
                  >
                    <Download className="h-4 w-4" /> Download
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
