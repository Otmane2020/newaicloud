import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Loader2, Wand2, Download, Search, Sparkles, 
  ImageIcon, Check, Facebook, Instagram, Eye, Star,
  Send, Link, Image as ImageIconLucide, History, Trash2, RefreshCw
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { CreativeStyleGrid } from "@/components/social/creative/CreativeStyleGrid";
import { type CreativeStyle } from "@/components/social/templates/creativeStyles";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

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

interface ConnectedPage {
  id: string;
  name: string;
  platform: "facebook" | "instagram";
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
  const frenchWords = ["canapé", "table", "chaise", "fauteuil", "bureau", "lit", "meuble", "armoire", "étagère", "commode", "lampe", "tapis", "miroir", "avec", "pour", "dans", "sans", "noir", "blanc", "bois", "moderne", "design"];
  const lowerText = text.toLowerCase();
  const matchCount = frenchWords.filter(word => lowerText.includes(word)).length;
  return matchCount >= 1 ? "fr" : "en";
};

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState("studio");
  
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CreativeStyle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [whiteBgImage, setWhiteBgImage] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(true);
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [postType, setPostType] = useState<PostType>("withLink");
  const [publishing, setPublishing] = useState(false);
  
  const [socialCaption, setSocialCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const [history, setHistory] = useState<CreativeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadShopifyProducts();
    loadConnectedPages();
  }, [selectedStore]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { error } = await supabase
        .from("creative_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success(t.toasts.success.deleted);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(t.toasts.error.deleting);
    }
  };

  const loadConnectedPages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pages: ConnectedPage[] = [];

      const { data: fbPages } = await supabase
        .from("facebook_page_connections")
        .select("page_id, page_name")
        .eq("user_id", user.id);
      
      (fbPages || []).forEach((p: any) => {
        pages.push({ id: p.page_id, name: p.page_name, platform: "facebook" });
      });

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
    setSocialCaption("");
  };

  const generateSocialCaption = async () => {
    if (!selectedProduct) {
      toast.error(t.creativeStudio.toast.selectProduct);
      return;
    }

    setGeneratingCaption(true);
    try {
      const productLanguage = detectLanguage(selectedProduct.title);
      
      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          productTitle: selectedProduct.title,
          productDescription: selectedProduct.product_type,
          productPrice: selectedProduct.price ? `${selectedProduct.price}€` : null,
          comparePrice: selectedProduct.compare_at_price ? `${selectedProduct.compare_at_price}€` : null,
          productType: selectedProduct.product_type,
          storeName: selectedStore?.store_name,
          language: productLanguage,
          tone: 'engaging',
          platform: selectedPlatforms.includes('instagram') ? 'instagram' : 'facebook'
        }
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
        image: whiteBgImage || selectedProduct.image,
        price: showPrice ? selectedProduct.price : null,
        compare_at_price: showPrice ? selectedProduct.compare_at_price : null,
        language: productLanguage,
      };

      const { data, error } = await supabase.functions.invoke('export-creative-image', {
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
          format: 'png',
          mode: generationMode,
          showPrice,
          language: productLanguage
        }
      });

      if (error) throw error;

      if (data.base64) {
        const imageUrl = `data:image/png;base64,${data.base64}`;
        setGeneratedImage(imageUrl);
        
        const { data: { user } } = await supabase.auth.getUser();
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
            caption
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

    if (!socialCaption.trim()) {
      toast.error(t.creativeStudio.steps.social.noPages);
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productLink = postType === "withLink" && selectedProduct?.handle 
        ? `https://${selectedStore?.public_domain || selectedStore?.store_url?.replace('https://', '') || ''}/products/${selectedProduct.handle}` 
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

  const isStyleSelected = !!selectedStyle;
  const isProductSelected = !!selectedProduct;
  const canGenerate = isProductSelected && isStyleSelected;
  const canPublish = !!generatedImage && selectedPlatforms.length > 0 && !!socialCaption.trim();

  const SelectionCheck = ({ selected }: { selected: boolean }) => (
    <div className={cn(
      "w-5 h-5 rounded-full flex items-center justify-center transition-all",
      selected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
    )}>
      <Check className="h-3 w-3" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t.creativeStudio.title}</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">{t.creativeStudio.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="studio" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Studio
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t.creativeStudio.result.title === "Résultat" ? "Historique" : "History"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="space-y-6">
            {/* Style Selection */}
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                <SelectionCheck selected={isStyleSelected} />
                <div className="flex-1">
                  <h2 className="font-semibold">{t.creativeStudio.steps.template.title}</h2>
                  <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.template.subtitle}</p>
                </div>
                {selectedStyle && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                    {selectedStyle.name}
                  </Badge>
                )}
              </div>
              
              <div className="p-4">
                <CreativeStyleGrid selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
              </div>
            </section>

            {/* Product Selection */}
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                <SelectionCheck selected={isProductSelected} />
                <div className="flex-1">
                  <h2 className="font-semibold">{t.creativeStudio.steps.product.title}</h2>
                  <p className="text-xs text-muted-foreground">{t.creativeStudio.steps.product.subtitle}</p>
                </div>
                {selectedProduct && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                    {selectedProduct.title.slice(0, 30)}...
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
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-center relative",
                            "hover:bg-muted/80",
                            selectedProduct?.id === product.id 
                              ? "ring-2 ring-green-500 bg-green-500/5" 
                              : "ring-1 ring-border"
                          )}
                        >
                          {selectedProduct?.id === product.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {product.image ? (
                            <img src={product.image} alt={product.title} className="w-14 h-14 object-cover rounded-lg" />
                          ) : (
                            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-xs font-medium truncate w-full">{product.title}</p>
                          {product.price && <span className="text-xs text-primary font-semibold">{product.price}€</span>}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </section>

            {/* Options & Social */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generation Options */}
              <section className="bg-card rounded-xl border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h2 className="font-semibold">{t.creativeStudio.steps.options.title}</h2>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.creativeStudio.steps.options.mode}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setGenerationMode("showcase")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          generationMode === "showcase" ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">{t.creativeStudio.steps.options.showcase}</span>
                        {generationMode === "showcase" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => setGenerationMode("strengths")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          generationMode === "strengths" ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <Star className="h-4 w-4" />
                        <span className="text-sm">{t.creativeStudio.steps.options.strengths}</span>
                        {generationMode === "strengths" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm">{t.creativeStudio.steps.options.showPrice}</span>
                    <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.creativeStudio.steps.caption.title}</label>
                    <Textarea
                      placeholder={t.creativeStudio.steps.caption.placeholder}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Social Posting */}
              <section className="bg-card rounded-xl border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h2 className="font-semibold">{t.creativeStudio.steps.social.title}</h2>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.creativeStudio.steps.social.platform}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => togglePlatform("facebook")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          selectedPlatforms.includes("facebook") ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
                        )}
                      >
                        <Facebook className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Facebook</span>
                        {selectedPlatforms.includes("facebook") && <Check className="h-4 w-4 text-blue-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => togglePlatform("instagram")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          selectedPlatforms.includes("instagram") ? "border-pink-500 bg-pink-500/10" : "border-border hover:border-pink-500/50"
                        )}
                      >
                        <Instagram className="h-4 w-4 text-pink-600" />
                        <span className="text-sm">Instagram</span>
                        {selectedPlatforms.includes("instagram") && <Check className="h-4 w-4 text-pink-500 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.creativeStudio.steps.social.postType}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPostType("image")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          postType === "image" ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <ImageIconLucide className="h-4 w-4" />
                        <span className="text-sm">{t.creativeStudio.steps.social.imageOnly}</span>
                        {postType === "image" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => setPostType("withLink")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          postType === "withLink" ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <Link className="h-4 w-4" />
                        <span className="text-sm">{t.creativeStudio.steps.social.withLink}</span>
                        {postType === "withLink" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">{t.creativeStudio.result.editableCaption}</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateSocialCaption}
                        disabled={!selectedProduct || generatingCaption}
                        className="h-7 text-xs gap-1"
                      >
                        {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {t.toasts.info.generating.replace('...', '')} IA
                      </Button>
                    </div>
                    <Textarea
                      placeholder={t.creativeStudio.steps.caption.placeholder}
                      value={socialCaption}
                      onChange={(e) => setSocialCaption(e.target.value)}
                      rows={4}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Generate Button */}
            <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-primary/20 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <Wand2 className="h-6 w-6 text-white" />
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
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {t.creativeStudio.generate.button}
                </Button>
              </div>
            </section>

            {/* Result */}
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
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                  {generating ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">{t.creativeStudio.generate.generating}</p>
                    </div>
                  ) : generatedImage && (
                    <div className="flex justify-center">
                      <img src={generatedImage} alt="Generated creative" className="max-w-full max-h-[500px] rounded-xl shadow-2xl" />
                    </div>
                  )}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="history">
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold">{t.creativeStudio.history.title}</h2>
                <Button variant="ghost" size="sm" onClick={loadHistory} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t.creativeStudio.history.refresh}
                </Button>
              </div>
              
              <div className="p-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t.creativeStudio.history.noCreatives}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {history.map((item) => (
                      <div key={item.id} className="group relative">
                        <img
                          src={item.image_url}
                          alt={item.product_title || 'Creative'}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 self-end"
                            onClick={() => deleteHistoryItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="text-white text-xs">
                            <p className="font-medium truncate">{item.product_title}</p>
                            <p className="opacity-70">{format(new Date(item.created_at), 'dd/MM/yyyy', { locale: language === 'fr' ? fr : enUS })}</p>
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
    </div>
  );
}
