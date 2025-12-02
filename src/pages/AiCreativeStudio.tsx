import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2, Wand2, Download, Search, Sparkles, 
  ImageIcon, Check, Facebook, Instagram, Eraser, Eye, Star, Edit2,
  DollarSign, Send, Link, Image as ImageIconLucide, Hash, FileText
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreativeTemplateGrid, CREATIVE_TEMPLATES, TemplateCategory, TemplateSize } from "@/components/social/creative/CreativeTemplateGrid";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language";

type GenerationMode = "showcase" | "strengths";
type PostLength = "short" | "long";
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

interface ConnectedPage {
  id: string;
  name: string;
  platform: "facebook" | "instagram";
}

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const { t } = useTranslation();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("promo-fire");
  const [category, setCategory] = useState<TemplateCategory>("all");
  const [sizeFilter, setSizeFilter] = useState<TemplateSize | "all">("square");
  const [searchQuery, setSearchQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [applyingWhiteBg, setApplyingWhiteBg] = useState(false);
  const [whiteBgImage, setWhiteBgImage] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("showcase");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  
  // Social posting state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [postLength, setPostLength] = useState<PostLength>("short");
  const [postType, setPostType] = useState<PostType>("withLink");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadShopifyProducts();
    loadConnectedPages();
  }, [selectedStore]);

  const loadConnectedPages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pages: ConnectedPage[] = [];

      // Load Facebook pages
      const { data: fbPages } = await supabase
        .from("facebook_page_connections")
        .select("page_id, page_name")
        .eq("user_id", user.id);
      
      (fbPages || []).forEach((p: any) => {
        pages.push({ id: p.page_id, name: p.page_name, platform: "facebook" });
      });

      // Load Instagram accounts
      const { data: igAccounts } = await supabase
        .from("instagram_account_connections")
        .select("account_id, account_name")
        .eq("user_id", user.id);
      
      (igAccounts || []).forEach((a: any) => {
        pages.push({ id: a.account_id, name: a.account_name || "Instagram", platform: "instagram" });
      });

      setConnectedPages(pages);
    } catch (error) {
      console.error("Error loading connected pages:", error);
    }
  };

  const loadShopifyProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData, error: productsError } = await (supabase.from("shopify_products") as any)
        .select("id, title, vendor, product_type, vision_attributes, handle")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true });

      if (productsError) throw productsError;
      if (!productsData?.length) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      const productIds = productsData.map((p: any) => p.id);
      const imageMap = new Map<string, string>();
      const variantMap = new Map<string, { price: number | null; compare_at_price: number | null }>();
      const batchSize = 50;

      for (let i = 0; i < productIds.length; i += batchSize) {
        const batchIds = productIds.slice(i, i + batchSize);
        const { data: imagesData } = await (supabase.from("product_images") as any)
          .select("product_id, src")
          .in("product_id", batchIds)
          .order("position", { ascending: true });

        (imagesData || []).forEach((img: any) => {
          if (!imageMap.has(img.product_id)) {
            imageMap.set(img.product_id, img.src);
          }
        });

        const { data: variantsData } = await (supabase.from("product_variants") as any)
          .select("product_id, price, compare_at_price")
          .in("product_id", batchIds)
          .order("position", { ascending: true });

        (variantsData || []).forEach((v: any) => {
          if (!variantMap.has(v.product_id)) {
            variantMap.set(v.product_id, { price: v.price, compare_at_price: v.compare_at_price });
          }
        });
      }

      setProducts(
        productsData.map((p: any): ShopifyProduct => {
          const variant = variantMap.get(p.id);
          return {
            id: p.id,
            title: p.title,
            image: imageMap.get(p.id) || null,
            price: variant?.price?.toString() || null,
            compare_at_price: variant?.compare_at_price?.toString() || null,
            vendor: p.vendor,
            product_type: p.product_type,
            handle: p.handle,
            vision_attributes: p.vision_attributes,
          };
        })
      );
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error(t.toasts.error.loading);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setWhiteBgImage(null);
    setGeneratedCaption("");
    setIsEditingCaption(false);
  };

  const applyWhiteBackground = async () => {
    if (!selectedProduct?.image) {
      toast.error(t.creativeStudio.toast.noImage);
      return;
    }

    setApplyingWhiteBg(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: { 
          imageUrl: selectedProduct.image,
          productTitle: selectedProduct.title
        }
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setWhiteBgImage(data.imageUrl);
        toast.success(t.creativeStudio.toast.whiteBackgroundApplied);
      } else {
        throw new Error(data.error || t.creativeStudio.toast.whiteBackgroundError);
      }
    } catch (error: any) {
      console.error("Error applying white background:", error);
      toast.error(error.message || t.creativeStudio.toast.whiteBackgroundError);
    } finally {
      setApplyingWhiteBg(false);
    }
  };

  const generateCreative = async () => {
    if (!selectedProduct) {
      toast.error(t.creativeStudio.toast.selectProduct);
      return;
    }

    setGenerating(true);
    try {
      const templateData = CREATIVE_TEMPLATES.find(t => t.id === selectedTemplate);
      
      const productForGeneration = {
        ...selectedProduct,
        image: whiteBgImage || selectedProduct.image,
        price: showPrice ? selectedProduct.price : null,
        compare_at_price: showPrice ? selectedProduct.compare_at_price : null,
      };

      const { data, error } = await supabase.functions.invoke('export-creative-image', {
        body: { 
          product: productForGeneration,
          template: templateData,
          caption,
          format: 'png',
          mode: generationMode,
          showPrice
        }
      });

      if (error) throw error;

      if (data.base64) {
        setGeneratedImage(`data:image/png;base64,${data.base64}`);
        const autoCaption = generationMode === "showcase" 
          ? `✨ ${selectedProduct.title}${showPrice && selectedProduct.price ? ` - ${selectedProduct.price}€` : ''}`
          : `💪 ${t.creativeStudio.steps.options.strengths}: ${selectedProduct.vision_attributes?.material || 'Premium'} • ${selectedProduct.vision_attributes?.style || 'Design'}`;
        setGeneratedCaption(caption || autoCaption);
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
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `${selectedProduct?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'creative'}.png`;
    link.click();
    toast.success(t.creativeStudio.toast.downloaded);
  };

  const publishToSocial = async () => {
    if (!generatedImage || selectedPlatforms.length === 0) {
      toast.error(t.creativeStudio.toast.selectPlatform);
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the post in social_posts table
      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .insert({
          user_id: user.id,
          store_id: selectedStore?.id,
          status: "pending",
          channels: selectedPlatforms,
          content: generatedCaption,
          image_url: generatedImage,
          product_id: selectedProduct?.id,
          product_link: postType === "withLink" && selectedProduct?.handle 
            ? `https://${selectedStore?.public_domain || selectedStore?.store_url?.replace('https://', '') || ''}/products/${selectedProduct.handle}` 
            : null,
          template_style: selectedTemplate,
          credits_consumed: 10,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Publish the post
      const { error: publishError } = await supabase.functions.invoke('publish-social-post', {
        body: { postId: post.id, userId: user.id }
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
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTemplateData = CREATIVE_TEMPLATES.find(t => t.id === selectedTemplate);

  // Check completion status
  const isProductSelected = !!selectedProduct;
  const isTemplateSelected = !!selectedTemplate;
  const canGenerate = isProductSelected && isTemplateSelected;
  const canPublish = !!generatedImage && selectedPlatforms.length > 0;

  // Step check indicator component
  const StepIndicator = ({ completed }: { completed: boolean }) => (
    <div className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
      completed ? "bg-green-500 text-white" : "bg-primary/20 text-primary"
    )}>
      <Check className="h-3.5 w-3.5" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.creativeStudio.title}</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {t.creativeStudio.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Product Selection */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <StepIndicator completed={isProductSelected} />
            <div className="flex-1">
              <h2 className="font-semibold">{t.creativeStudio.steps.product.title}</h2>
              <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.product.subtitle}</p>
            </div>
            {selectedProduct && (
              <Badge variant="secondary" className="gap-2">
                <Check className="h-3 w-3" />
                {selectedProduct.title.slice(0, 25)}...
              </Badge>
            )}
          </div>
          
          <div className="p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.creativeStudio.steps.product.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg transition-all text-center relative",
                        "hover:bg-muted/80 border-2",
                        selectedProduct?.id === product.id 
                          ? "border-green-500 bg-green-500/5" 
                          : "border-transparent bg-muted/30"
                      )}
                    >
                      {selectedProduct?.id === product.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {product.image ? (
                        <img 
                          src={product.image}
                          alt={product.title}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs font-medium truncate w-full">{product.title}</p>
                      {product.price && (
                        <span className="text-xs text-primary font-semibold">{product.price}€</span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </section>

        {/* Template Selection */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <StepIndicator completed={isTemplateSelected} />
            <div className="flex-1">
              <h2 className="font-semibold">{t.creativeStudio.steps.template.title}</h2>
              <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.template.subtitle}</p>
            </div>
            {selectedTemplateData && (
              <Badge variant="secondary" className="gap-2">
                <Check className="h-3 w-3" />
                {selectedTemplateData.name}
              </Badge>
            )}
          </div>
          
          <div className="p-4">
            <CreativeTemplateGrid
              selected={selectedTemplate}
              onSelect={setSelectedTemplate}
              category={category}
              onCategoryChange={setCategory}
              sizeFilter={sizeFilter}
              onSizeChange={setSizeFilter}
              product={selectedProduct}
              whiteBgImage={whiteBgImage}
            />
          </div>
        </section>

        {/* Generation Options */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <StepIndicator completed={isProductSelected && isTemplateSelected} />
            <div className="flex-1">
              <h2 className="font-semibold">{t.creativeStudio.steps.options.title}</h2>
              <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.options.subtitle}</p>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.options.mode}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGenerationMode("showcase")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      generationMode === "showcase" 
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {generationMode === "showcase" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <Eye className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.options.showcase}</span>
                  </button>
                  <button
                    onClick={() => setGenerationMode("strengths")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      generationMode === "strengths" 
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Star className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.options.strengths}</span>
                  </button>
                </div>
              </div>

              {/* Price & Background */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.options.display}</Label>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t.creativeStudio.steps.options.showPrice}</span>
                  </div>
                  <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                </div>
                
                {selectedProduct?.image && (
                  <Button 
                    variant={whiteBgImage ? "secondary" : "outline"}
                    size="sm" 
                    onClick={whiteBgImage ? () => setWhiteBgImage(null) : applyWhiteBackground}
                    disabled={applyingWhiteBg}
                    className="w-full gap-2"
                  >
                    {applyingWhiteBg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eraser className="h-4 w-4" />
                    )}
                    {whiteBgImage ? t.creativeStudio.steps.options.resetBackground : t.creativeStudio.steps.options.whiteBackground}
                  </Button>
                )}
              </div>

              {/* Product Data */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.options.productData}</Label>
                {selectedProduct?.vision_attributes ? (
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {selectedProduct.vision_attributes.color && (
                        <Badge variant="secondary" className="text-xs">{selectedProduct.vision_attributes.color}</Badge>
                      )}
                      {selectedProduct.vision_attributes.material && (
                        <Badge variant="secondary" className="text-xs">{selectedProduct.vision_attributes.material}</Badge>
                      )}
                      {selectedProduct.vision_attributes.style && (
                        <Badge variant="secondary" className="text-xs">{selectedProduct.vision_attributes.style}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t.creativeStudio.steps.options.dataEnrichment}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct ? t.creativeStudio.steps.options.noEnrichedData : t.creativeStudio.steps.options.selectProduct}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Caption */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <StepIndicator completed={!!caption} />
            <div className="flex-1">
              <h2 className="font-semibold">{t.creativeStudio.steps.caption.title}</h2>
              <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.caption.subtitle}</p>
            </div>
          </div>
          
          <div className="p-4">
            <Textarea
              placeholder={t.creativeStudio.steps.caption.placeholder}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </section>

        {/* Social Posting */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <StepIndicator completed={selectedPlatforms.length > 0} />
            <div className="flex-1">
              <h2 className="font-semibold">{t.creativeStudio.steps.social.title}</h2>
              <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.social.subtitle}</p>
            </div>
            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
              <Sparkles className="h-3 w-3" />
              {t.creativeStudio.steps.social.cost}
            </Badge>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Platform Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.social.platform}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => togglePlatform("facebook")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all relative",
                      selectedPlatforms.includes("facebook")
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-blue-500/50"
                    )}
                  >
                    {selectedPlatforms.includes("facebook") && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <Facebook className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Facebook</span>
                  </button>
                  <button
                    onClick={() => togglePlatform("instagram")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all relative",
                      selectedPlatforms.includes("instagram")
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-pink-500/50"
                    )}
                  >
                    {selectedPlatforms.includes("instagram") && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <Instagram className="h-5 w-5 text-pink-600" />
                    <span className="text-xs font-medium">Instagram</span>
                  </button>
                </div>
                {connectedPages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">{t.creativeStudio.steps.social.noPages}</p>
                )}
              </div>

              {/* Post Length */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.social.postLength}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPostLength("short")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all relative",
                      postLength === "short"
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {postLength === "short" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <Hash className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.social.short}</span>
                    <span className="text-[10px] text-muted-foreground">{t.creativeStudio.steps.social.shortDesc}</span>
                  </button>
                  <button
                    onClick={() => setPostLength("long")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all relative",
                      postLength === "long"
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {postLength === "long" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <FileText className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.social.long}</span>
                    <span className="text-[10px] text-muted-foreground">{t.creativeStudio.steps.social.longDesc}</span>
                  </button>
                </div>
              </div>

              {/* Post Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.creativeStudio.steps.social.postType}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPostType("image")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all relative",
                      postType === "image"
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {postType === "image" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <ImageIconLucide className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.social.imageOnly}</span>
                    <span className="text-[10px] text-muted-foreground">{t.creativeStudio.steps.social.imageOnlyDesc}</span>
                  </button>
                  <button
                    onClick={() => setPostType("withLink")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all relative",
                      postType === "withLink"
                        ? "border-green-500 bg-green-500/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {postType === "withLink" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <Link className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.creativeStudio.steps.social.withLink}</span>
                    <span className="text-[10px] text-muted-foreground">{t.creativeStudio.steps.social.withLinkDesc}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <section className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border border-primary/20 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">{t.creativeStudio.generate.ready}</h2>
                <p className="text-sm text-muted-foreground">
                  {canGenerate ? t.creativeStudio.generate.configured : t.creativeStudio.generate.incomplete}
                </p>
              </div>
            </div>
            
            <Button 
              size="lg"
              onClick={generateCreative}
              disabled={!canGenerate || generating}
              className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 px-8"
            >
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {t.creativeStudio.generate.button}
            </Button>
          </div>
        </section>

        {/* Preview Section */}
        {(generatedImage || generating) && (
          <section className="bg-card rounded-xl border overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-semibold">{t.creativeStudio.result.title}</h2>
              </div>
              
              {generatedImage && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={publishToSocial}
                    disabled={!canPublish || publishing}
                    className="gap-2"
                  >
                    {publishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t.creativeStudio.result.publish}
                  </Button>
                  <Button size="sm" onClick={downloadImage} className="gap-2">
                    <Download className="h-4 w-4" />
                    {t.creativeStudio.result.download}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generated Image */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t.creativeStudio.result.generatedImage}</p>
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                    {generating ? (
                      <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{t.creativeStudio.generate.generating}</p>
                      </div>
                    ) : generatedImage ? (
                      <img src={generatedImage} alt="Generated creative" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                </div>

                {/* Editable Caption */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{t.creativeStudio.result.editableCaption}</p>
                    {generatedImage && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingCaption(!isEditingCaption)}
                        className="h-7 px-2 gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        {isEditingCaption ? t.creativeStudio.result.close : t.creativeStudio.result.edit}
                      </Button>
                    )}
                  </div>
                  
                  {generatedImage && (
                    <div className="bg-muted/30 rounded-xl p-4 h-full min-h-[200px]">
                      {isEditingCaption ? (
                        <Textarea
                          value={generatedCaption}
                          onChange={(e) => setGeneratedCaption(e.target.value)}
                          rows={8}
                          className="resize-none h-full"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{generatedCaption || t.creativeStudio.result.noCaption}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
