import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, Wand2, Megaphone, Image, FileText, Sparkles, Download, Eye,
  ImageIcon, Tags, Video, Share2, Check, Copy, Palette
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreativeTemplateSelector } from "@/components/social/creative/CreativeTemplateSelector";
import { CreativePreview } from "@/components/social/creative/CreativePreview";
import { CreativeExportDialog } from "@/components/social/creative/CreativeExportDialog";

interface ShopifyProduct {
  id: string;
  title: string;
  image: string | null;
  description: string;
  price: string | null;
  compare_at_price: string | null;
  vendor: string | null;
}

interface GeneratedContent {
  title?: string;
  description?: string;
  bulletPoints?: string[];
  caption?: string;
  hashtags?: string[];
  videoScript?: string;
  adCopy?: string;
  imagePrompt?: string;
  generatedImageUrl?: string;
  visionAnalysis?: {
    materials?: string[];
    style?: string;
    colors?: string[];
    dimensions?: string;
    usps?: string[];
  };
}

type CreativeMode = 'showcase' | 'promo' | 'info' | 'enrich';
type TemplateStyle = 'gold' | 'red-promo' | 'minimal' | 'tech' | 'black-friday' | 'story';

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('minimal');
  const [customCaption, setCustomCaption] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeMode, setActiveMode] = useState<CreativeMode>('showcase');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadShopifyProducts();
  }, [selectedStore]);

  const loadShopifyProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("shopify_products")
      .select("id, title, seo_description")
      .eq("seller_id", user.id)
      .eq("store_id", selectedStore.id)
      .order("title", { ascending: true }) as { data: { id: string; title: string; seo_description: string | null }[] | null; error: any };

    if (error) {
      console.error("Error loading products:", error);
      toast.error("Erreur lors du chargement des produits");
    } else if (data) {
      // Get first variant for price
      const productIds = data.map(p => p.id);
      const { data: variants } = await supabase
        .from("product_variants")
        .select("product_id, price, compare_at_price")
        .in("product_id", productIds)
        .eq("position", 1) as { data: { product_id: string; price: number | null; compare_at_price: number | null }[] | null };

      const variantMap = new Map(variants?.map(v => [v.product_id, v]) || []);

      // Fetch images separately
      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, src, position")
        .in("product_id", productIds)
        .eq("position", 1) as { data: { product_id: string; src: string; position: number }[] | null };

      const imageMap = new Map(images?.map(img => [img.product_id, img.src]) || []);

      setProducts(
        data.map((p) => {
          const variant = variantMap.get(p.id);
          return {
            id: p.id,
            title: p.title,
            image: imageMap.get(p.id) || null,
            description: p.seo_description || "",
            price: variant?.price?.toString() || null,
            compare_at_price: variant?.compare_at_price?.toString() || null,
            vendor: null
          };
        })
      );
    }
    setLoadingProducts(false);
  };

  const handleSelectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    setGenerated(null);
    setCustomCaption("");
  };

  const generateContent = async (mode: CreativeMode) => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    setLoading(true);
    setActiveMode(mode);

    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-content', {
        body: { 
          mode, 
          product: selectedProduct,
          template: selectedTemplate
        }
      });

      if (error) throw error;

      setGenerated(data);
      if (data.caption) {
        setCustomCaption(data.caption);
      }
      toast.success("Contenu généré avec succès!");
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers!");
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          AI Creative Studio
        </h1>
        <p className="text-muted-foreground">
          Générez automatiquement des visuels, titres, descriptions et contenus professionnels pour vos réseaux sociaux.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Product Selection & Modes */}
        <div className="lg:col-span-1 space-y-4">
          {/* Product Picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Produit Shopify
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedProduct?.id === p.id 
                            ? "bg-primary/10 border border-primary" 
                            : "hover:bg-muted border border-transparent"
                        }`}
                      >
                        {p.image ? (
                          <img 
                            src={p.image}
                            alt={p.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          {p.price && (
                            <p className="text-xs text-muted-foreground">{p.price}€</p>
                          )}
                        </div>
                        {selectedProduct?.id === p.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Selected Product Preview */}
          {selectedProduct && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  {selectedProduct.image && (
                    <img 
                      src={selectedProduct.image}
                      alt={selectedProduct.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{selectedProduct.title}</h3>
                    {selectedProduct.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {selectedProduct.description.replace(/<[^>]*>?/gm, "").slice(0, 100)}...
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {selectedProduct.compare_at_price && (
                        <span className="text-sm line-through text-muted-foreground">
                          {selectedProduct.compare_at_price}€
                        </span>
                      )}
                      {selectedProduct.price && (
                        <Badge variant="secondary" className="font-bold">
                          {selectedProduct.price}€
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Template Visuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreativeTemplateSelector 
                selected={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - AI Modes */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Modes IA</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="showcase" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="showcase" className="text-xs">
                    <Image className="h-3 w-3 mr-1" /> Showcase
                  </TabsTrigger>
                  <TabsTrigger value="promo" className="text-xs">
                    <Megaphone className="h-3 w-3 mr-1" /> Promo
                  </TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="info" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" /> Info
                  </TabsTrigger>
                  <TabsTrigger value="enrich" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" /> Vision
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="showcase" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Product Showcase</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ Image produit haute qualité</li>
                      <li>✓ Titre SEO optimisé</li>
                      <li>✓ Description premium</li>
                      <li>✓ Points forts produit</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full"
                    disabled={!selectedProduct || loading}
                    onClick={() => generateContent("showcase")}
                  >
                    {loading && activeMode === 'showcase' ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2"/>
                    )}
                    Générer Showcase
                  </Button>
                </TabsContent>

                <TabsContent value="promo" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Promotional Ads</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ Pub carrée + story</li>
                      <li>✓ Accroche percutante</li>
                      <li>✓ CTA optimisé</li>
                      <li>✓ Script vidéo 10s</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full"
                    variant="destructive"
                    disabled={!selectedProduct || loading}
                    onClick={() => generateContent("promo")}
                  >
                    {loading && activeMode === 'promo' ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                    ) : (
                      <Megaphone className="h-4 w-4 mr-2"/>
                    )}
                    Générer Promo
                  </Button>
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Informative Carousel</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ Carousel Instagram</li>
                      <li>✓ Storytelling produit</li>
                      <li>✓ Multi-posts cohérents</li>
                      <li>✓ Hashtags pertinents</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full"
                    variant="secondary"
                    disabled={!selectedProduct || loading}
                    onClick={() => generateContent("info")}
                  >
                    {loading && activeMode === 'info' ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                    ) : (
                      <FileText className="h-4 w-4 mr-2"/>
                    )}
                    Générer Carousel
                  </Button>
                </TabsContent>

                <TabsContent value="enrich" className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Vision AI Enrich</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ Analyse matériaux</li>
                      <li>✓ Détection style/couleurs</li>
                      <li>✓ USP automatiques</li>
                      <li>✓ Tags produit enrichis</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    disabled={!selectedProduct || loading}
                    onClick={() => generateContent("enrich")}
                  >
                    {loading && activeMode === 'enrich' ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2"/>
                    )}
                    Analyser avec Vision
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Preview & Results */}
        <div className="lg:col-span-1 space-y-4">
          {/* Creative Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Aperçu
                </CardTitle>
                {generated && (
                  <Button size="sm" variant="outline" onClick={() => setShowExportDialog(true)}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CreativePreview 
                product={selectedProduct}
                template={selectedTemplate}
                caption={customCaption}
                generated={generated}
              />
            </CardContent>
          </Card>

          {/* Generated Content */}
          {generated && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contenu Généré</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {generated.title && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Titre</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <p className="text-sm font-medium flex-1">{generated.title}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(generated.title!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {generated.caption && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Caption</Label>
                    <Textarea 
                      value={customCaption}
                      onChange={(e) => setCustomCaption(e.target.value)}
                      rows={3}
                      className="mt-1 text-sm"
                    />
                    <Button size="sm" variant="ghost" className="mt-1" onClick={() => copyToClipboard(customCaption)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copier
                    </Button>
                  </div>
                )}

                {generated.bulletPoints && generated.bulletPoints.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Points Forts</Label>
                    <ul className="mt-1 space-y-1">
                      {generated.bulletPoints.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generated.hashtags && generated.hashtags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Hashtags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generated.hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {generated.videoScript && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Script Vidéo
                    </Label>
                    <Textarea 
                      value={generated.videoScript}
                      readOnly
                      rows={3}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                )}

                {generated.visionAnalysis && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Analyse Vision AI
                    </Label>
                    {generated.visionAnalysis.materials && (
                      <div>
                        <span className="text-xs font-medium">Matériaux:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generated.visionAnalysis.materials.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {generated.visionAnalysis.style && (
                      <div>
                        <span className="text-xs font-medium">Style:</span>
                        <span className="text-xs ml-1">{generated.visionAnalysis.style}</span>
                      </div>
                    )}
                    {generated.visionAnalysis.colors && (
                      <div>
                        <span className="text-xs font-medium">Couleurs:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generated.visionAnalysis.colors.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <CreativeExportDialog 
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        product={selectedProduct}
        template={selectedTemplate}
        caption={customCaption}
      />
    </div>
  );
}
