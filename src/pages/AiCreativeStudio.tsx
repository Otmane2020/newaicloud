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
  Send, Link, Image as ImageIconLucide, FileText, History, Trash2, RotateCcw
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreativeTemplateGrid, CREATIVE_TEMPLATES, TemplateCategory, TemplateSize } from "@/components/social/creative/CreativeTemplateGrid";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface CreativeHistoryItem {
  id: string;
  product_title: string | null;
  template_name: string | null;
  image_url: string;
  created_at: string;
}

// Detect language from product title
const detectLanguage = (text: string): "fr" | "en" => {
  const frenchWords = ["canapé", "table", "chaise", "fauteuil", "bureau", "lit", "meuble", "armoire", "étagère", "commode", "lampe", "tapis", "miroir", "avec", "pour", "dans", "sans", "noir", "blanc", "bois", "moderne", "design"];
  const lowerText = text.toLowerCase();
  const matchCount = frenchWords.filter(word => lowerText.includes(word)).length;
  return matchCount >= 1 ? "fr" : "en";
};

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const [activeTab, setActiveTab] = useState("studio");
  
  // Studio state
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("all");
  const [sizeFilter, setSizeFilter] = useState<TemplateSize | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [whiteBgImage, setWhiteBgImage] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(true);
  
  // Social posting state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [postLength, setPostLength] = useState<PostLength>("short");
  const [postType, setPostType] = useState<PostType>("withLink");
  const [publishing, setPublishing] = useState(false);

  // History state
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
        .select("id, product_title, template_name, image_url, created_at")
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
      toast.success("Image supprimée");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erreur lors de la suppression");
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
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setWhiteBgImage(null);
  };

  const generateCreative = async () => {
    if (!selectedProduct || !selectedTemplate) {
      toast.error("Sélectionnez un template et un produit");
      return;
    }

    setGenerating(true);
    try {
      const templateData = CREATIVE_TEMPLATES.find(t => t.id === selectedTemplate);
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
          template: templateData,
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
        
        // Save to history
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("creative_history").insert({
            user_id: user.id,
            store_id: selectedStore?.id,
            product_id: selectedProduct.id,
            product_title: selectedProduct.title,
            template_id: selectedTemplate,
            template_name: templateData?.name,
            image_url: imageUrl,
            generation_mode: generationMode,
            caption
          });
        }
        
        toast.success("Créatif généré avec succès");
      }
    } catch (error: any) {
      console.error("Error generating creative:", error);
      toast.error(error.message || "Erreur lors de la génération");
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
    toast.success("Image téléchargée");
  };

  const publishToSocial = async () => {
    if (!generatedImage || selectedPlatforms.length === 0) {
      toast.error("Sélectionnez au moins une plateforme");
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .insert({
          user_id: user.id,
          store_id: selectedStore?.id,
          status: "pending",
          channels: selectedPlatforms,
          content: caption,
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

      const { error: publishError } = await supabase.functions.invoke('publish-social-post', {
        body: { postId: post.id, userId: user.id }
      });

      if (publishError) throw publishError;

      toast.success("Publication réussie");
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error.message || "Erreur lors de la publication");
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
  const isTemplateSelected = !!selectedTemplate;
  const isProductSelected = !!selectedProduct;
  const canGenerate = isProductSelected && isTemplateSelected;
  const canPublish = !!generatedImage && selectedPlatforms.length > 0;

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
                <h1 className="text-xl font-bold">Studio Créatif IA</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Créez des visuels professionnels pour vos réseaux sociaux
                </p>
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
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="space-y-6">
            {/* Template Selection - FIRST */}
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                <SelectionCheck selected={isTemplateSelected} />
                <div className="flex-1">
                  <h2 className="font-semibold">Choisissez un template</h2>
                  <p className="text-xs text-muted-foreground">Sélectionnez le style de votre créatif</p>
                </div>
                {selectedTemplateData && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
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

            {/* Product Selection - SECOND */}
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
                <SelectionCheck selected={isProductSelected} />
                <div className="flex-1">
                  <h2 className="font-semibold">Sélectionnez un produit</h2>
                  <p className="text-xs text-muted-foreground">Choisissez le produit à mettre en avant</p>
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
                    placeholder="Rechercher un produit..."
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

            {/* Options & Social - Combined */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generation Options */}
              <section className="bg-card rounded-xl border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h2 className="font-semibold">Options de génération</h2>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setGenerationMode("showcase")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          generationMode === "showcase" 
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">Vitrine</span>
                        {generationMode === "showcase" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => setGenerationMode("strengths")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          generationMode === "strengths" 
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Star className="h-4 w-4" />
                        <span className="text-sm">Points forts</span>
                        {generationMode === "strengths" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  {/* Price Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm">Afficher le prix</span>
                    <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                  </div>

                  {/* Caption */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texte d'accroche (optionnel)</label>
                    <Textarea
                      placeholder="Ex: Découvrez notre nouvelle collection..."
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
                  <h2 className="font-semibold">Publication sociale</h2>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Platforms */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plateformes</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => togglePlatform("facebook")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          selectedPlatforms.includes("facebook")
                            ? "border-blue-500 bg-blue-500/10" 
                            : "border-border hover:border-blue-500/50"
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
                          selectedPlatforms.includes("instagram")
                            ? "border-pink-500 bg-pink-500/10" 
                            : "border-border hover:border-pink-500/50"
                        )}
                      >
                        <Instagram className="h-4 w-4 text-pink-600" />
                        <span className="text-sm">Instagram</span>
                        {selectedPlatforms.includes("instagram") && <Check className="h-4 w-4 text-pink-500 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  {/* Post Length */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Longueur du post</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPostLength("short")}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 rounded-lg border transition-all",
                          postLength === "short"
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-sm font-medium">Court</span>
                          {postLength === "short" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground">4 lignes + hashtags</span>
                      </button>
                      <button
                        onClick={() => setPostLength("long")}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 rounded-lg border transition-all",
                          postLength === "long"
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-sm font-medium">Long</span>
                          {postLength === "long" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground">10 lignes détaillées</span>
                      </button>
                    </div>
                  </div>

                  {/* Post Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type de post</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPostType("image")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          postType === "image"
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <ImageIconLucide className="h-4 w-4" />
                        <span className="text-sm">Image seule</span>
                        {postType === "image" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => setPostType("withLink")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          postType === "withLink"
                            ? "border-green-500 bg-green-500/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Link className="h-4 w-4" />
                        <span className="text-sm">Avec lien</span>
                        {postType === "withLink" && <Check className="h-4 w-4 text-green-500 ml-auto" />}
                      </button>
                    </div>
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
                    <h2 className="font-semibold">Prêt à générer ?</h2>
                    <p className="text-sm text-muted-foreground">
                      {canGenerate ? "Template et produit sélectionnés" : "Sélectionnez un template et un produit"}
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
                  Générer le créatif
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
                    <h2 className="font-semibold">Résultat</h2>
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
                        Publier
                      </Button>
                      <Button size="sm" onClick={downloadImage} className="gap-2">
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  {generating ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">Génération en cours...</p>
                    </div>
                  ) : generatedImage && (
                    <div className="flex justify-center">
                      <img 
                        src={generatedImage} 
                        alt="Generated creative"
                        className="max-w-full max-h-[500px] rounded-xl shadow-2xl"
                      />
                    </div>
                  )}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="history">
            <section className="bg-card rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold">Historique des créatifs</h2>
                <Button variant="ghost" size="sm" onClick={loadHistory} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Actualiser
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
                    <p>Aucun créatif généré pour l'instant</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        className="relative group rounded-xl overflow-hidden border bg-muted/30"
                      >
                        <img 
                          src={item.image_url} 
                          alt={item.product_title || "Creative"}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-xs font-medium truncate">
                              {item.product_title || "Sans titre"}
                            </p>
                            <p className="text-white/70 text-[10px]">
                              {format(new Date(item.created_at), "d MMM yyyy", { locale: fr })}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="h-7 text-xs flex-1"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = item.image_url;
                                  link.download = `creative-${item.id}.png`;
                                  link.click();
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="h-7 w-7 p-0"
                                onClick={() => deleteHistoryItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
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