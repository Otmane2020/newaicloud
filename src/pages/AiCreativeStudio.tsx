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
  ImageIcon, Check, X,
  Facebook, Instagram, Eraser, Eye, Star, Edit2,
  DollarSign, ChevronRight
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreativeTemplateGrid, CREATIVE_TEMPLATES, TemplateCategory, TemplateSize } from "@/components/social/creative/CreativeTemplateGrid";
import { cn } from "@/lib/utils";

type GenerationMode = "showcase" | "strengths";

interface ShopifyProduct {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
  vendor?: string | null;
  product_type?: string | null;
  vision_attributes?: {
    color?: string;
    material?: string;
    style?: string;
    shape?: string;
    features?: string[];
  } | null;
}

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
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

  useEffect(() => {
    loadShopifyProducts();
  }, [selectedStore]);

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
        .select("id, title, vendor, product_type, vision_attributes")
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
    setGeneratedCaption("");
    setIsEditingCaption(false);
  };

  const applyWhiteBackground = async () => {
    if (!selectedProduct?.image) {
      toast.error("Ce produit n'a pas d'image");
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
        toast.success("Fond blanc appliqué !");
      } else {
        throw new Error(data.error || "Échec de la génération");
      }
    } catch (error: any) {
      console.error("Error applying white background:", error);
      toast.error(error.message || "Erreur lors de l'application du fond blanc");
    } finally {
      setApplyingWhiteBg(false);
    }
  };

  const generateCreative = async () => {
    if (!selectedProduct) {
      toast.error("Sélectionnez un produit");
      return;
    }

    setGenerating(true);
    try {
      const templateData = CREATIVE_TEMPLATES.find(t => t.id === selectedTemplate);
      
      const productForGeneration = {
        ...selectedProduct,
        image: whiteBgImage || selectedProduct.image,
        // Include price only if showPrice is enabled
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
          : `💪 Points forts: ${selectedProduct.vision_attributes?.material || 'Qualité premium'} • ${selectedProduct.vision_attributes?.style || 'Design moderne'}`;
        setGeneratedCaption(caption || autoCaption);
        toast.success("Créatif généré avec succès !");
      } else if (data.html) {
        toast.info("Génération en mode fallback - HTML disponible");
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
    toast.success("Image téléchargée !");
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTemplateData = CREATIVE_TEMPLATES.find(t => t.id === selectedTemplate);

  // Check completion status
  const isStep1Complete = !!selectedProduct;
  const isStep2Complete = !!selectedTemplate;
  const canGenerate = isStep1Complete && isStep2Complete;

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
              <h1 className="text-xl font-bold">Ad Library</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Créez des visuels professionnels en 5 étapes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* STEP 1 - Select Product */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              isStep1Complete ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
            )}>
              {isStep1Complete ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Sélectionnez un produit</h2>
              <p className="text-xs text-muted-foreground">Choisissez le produit à mettre en avant</p>
            </div>
            {selectedProduct && (
              <Badge variant="secondary" className="gap-2">
                <Check className="h-3 w-3" />
                {selectedProduct.title.slice(0, 30)}...
              </Badge>
            )}
          </div>
          
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Product Grid */}
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
                        "flex flex-col items-center gap-2 p-3 rounded-lg transition-all text-center",
                        "hover:bg-muted/80 border-2",
                        selectedProduct?.id === product.id 
                          ? "border-primary bg-primary/5" 
                          : "border-transparent bg-muted/30"
                      )}
                    >
                      {product.image ? (
                        <img 
                          src={product.image}
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
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

        {/* STEP 2 - Choose Template */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              isStep2Complete ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {isStep2Complete ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Choisissez un template</h2>
              <p className="text-xs text-muted-foreground">Sélectionnez le style visuel</p>
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

        {/* STEP 3 - Options */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Options de génération</h2>
              <p className="text-xs text-muted-foreground">Personnalisez votre créatif</p>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGenerationMode("showcase")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      generationMode === "showcase" 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Eye className="h-5 w-5" />
                    <span className="text-xs font-medium">Showcase</span>
                  </button>
                  <button
                    onClick={() => setGenerationMode("strengths")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      generationMode === "strengths" 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Star className="h-5 w-5" />
                    <span className="text-xs font-medium">Points forts</span>
                  </button>
                </div>
              </div>

              {/* Price Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Affichage</Label>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Afficher le prix</span>
                  </div>
                  <Switch
                    checked={showPrice}
                    onCheckedChange={setShowPrice}
                  />
                </div>
                
                {/* White Background */}
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
                    {whiteBgImage ? "Réinitialiser fond" : "Fond blanc IA"}
                  </Button>
                )}
              </div>

              {/* Enrichment Data */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Données produit</Label>
                {selectedProduct?.vision_attributes ? (
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {selectedProduct.vision_attributes.color && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedProduct.vision_attributes.color}
                        </Badge>
                      )}
                      {selectedProduct.vision_attributes.material && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedProduct.vision_attributes.material}
                        </Badge>
                      )}
                      {selectedProduct.vision_attributes.style && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedProduct.vision_attributes.style}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Ces données enrichissent la génération
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct ? "Aucune donnée enrichie" : "Sélectionnez un produit"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* STEP 4 - Highlighted Text */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Texte d'accroche</h2>
              <p className="text-xs text-muted-foreground">Optionnel - laissez vide pour génération auto</p>
            </div>
          </div>
          
          <div className="p-4">
            <Textarea
              placeholder="Ex: Offre limitée ! -30% sur ce produit..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </section>

        {/* STEP 5 - Generate Button */}
        <section className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border border-primary/20 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Prêt à générer ?</h2>
                <p className="text-sm text-muted-foreground">
                  {canGenerate 
                    ? "Tous les paramètres sont configurés" 
                    : "Complétez les étapes ci-dessus"
                  }
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
              Générer l'aperçu
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Preview Section */}
        {(generatedImage || generating) && (
          <section className="bg-card rounded-xl border overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <h2 className="font-semibold">Résultat</h2>
              </div>
              
              {generatedImage && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" />
                    Instagram
                  </Button>
                  <Button size="sm" onClick={downloadImage} className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generated Image */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Image générée</p>
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                    {generating ? (
                      <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Génération en cours...</p>
                      </div>
                    ) : generatedImage ? (
                      <img 
                        src={generatedImage}
                        alt="Generated creative"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>

                {/* Editable Caption */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Caption éditable</p>
                    {generatedImage && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingCaption(!isEditingCaption)}
                        className="h-7 px-2 gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        {isEditingCaption ? "Fermer" : "Éditer"}
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
                          placeholder="Ajoutez votre caption..."
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{generatedCaption || "Aucune caption générée"}</p>
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
