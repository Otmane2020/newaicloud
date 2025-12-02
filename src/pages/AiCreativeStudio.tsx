import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, Wand2, Download, Search, Sparkles, 
  ImageIcon, Check, Grid3X3, LayoutGrid, X,
  Facebook, Instagram, Share2, Eraser
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { CreativeTemplateGrid, CREATIVE_TEMPLATES, TemplateCategory, TemplateSize } from "@/components/social/creative/CreativeTemplateGrid";
import { cn } from "@/lib/utils";

interface ShopifyProduct {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
}

export default function AiCreativeStudio() {
  const { selectedStore } = useStore();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("promo-red");
  const [category, setCategory] = useState<TemplateCategory>("all");
  const [sizeFilter, setSizeFilter] = useState<TemplateSize | "all">("square");
  const [searchQuery, setSearchQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [showProductPanel, setShowProductPanel] = useState(true);
  const [applyingWhiteBg, setApplyingWhiteBg] = useState(false);
  const [whiteBgImage, setWhiteBgImage] = useState<string | null>(null);

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

      // Get products
      const { data: productsData, error: productsError } = await (supabase.from("shopify_products") as any)
        .select("id, title")
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

      // Batch fetch images (max 50 IDs per request to avoid URL limit)
      const imageMap = new Map<string, string>();
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
      }

      // Batch fetch variants for pricing
      const variantMap = new Map<string, { price: number | null; compare_at_price: number | null }>();
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batchIds = productIds.slice(i, i + batchSize);
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
      // Use white background image if available
      const productForGeneration = {
        ...selectedProduct,
        image: whiteBgImage || selectedProduct.image
      };

      const { data, error } = await supabase.functions.invoke('export-creative-image', {
        body: { 
          product: productForGeneration,
          template: selectedTemplate,
          caption,
          format: 'png'
        }
      });

      if (error) throw error;

      if (data.base64) {
        setGeneratedImage(`data:image/png;base64,${data.base64}`);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Ad Library</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Créez des visuels professionnels pour vos réseaux sociaux
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowProductPanel(!showProductPanel)}
                className="gap-2"
              >
                {showProductPanel ? <X className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {showProductPanel ? "Masquer" : "Produits"}
                </span>
              </Button>
              
              <Button 
                size="sm"
                onClick={generateCreative}
                disabled={!selectedProduct || generating}
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Générer</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Product Selection */}
          {showProductPanel && (
            <div className="w-80 shrink-0 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Product List */}
              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Produits</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredProducts.length}
                  </Badge>
                </div>

                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] -mx-2 px-2">
                    <div className="space-y-2">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left",
                            "hover:bg-muted/80",
                            selectedProduct?.id === product.id 
                              ? "bg-primary/10 ring-1 ring-primary" 
                              : "bg-muted/30"
                          )}
                        >
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {product.compare_at_price && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {product.compare_at_price}€
                                </span>
                              )}
                              {product.price && (
                                <span className="text-xs font-semibold text-primary">
                                  {product.price}€
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedProduct?.id === product.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Aucun produit trouvé
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Caption Input */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h3 className="font-semibold text-sm">Texte personnalisé</h3>
                <Textarea
                  placeholder="Ajoutez une accroche ou laissez vide pour génération auto..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* White Background Option */}
              {selectedProduct?.image && (
                <div className="bg-card rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Fond blanc IA</h3>
                    {whiteBgImage && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Appliqué
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Détourez automatiquement le produit sur fond blanc pour un rendu professionnel
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={applyWhiteBackground}
                    disabled={applyingWhiteBg || !!whiteBgImage}
                    className="w-full gap-2"
                  >
                    {applyingWhiteBg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eraser className="h-4 w-4" />
                    )}
                    {whiteBgImage ? "Fond blanc appliqué" : "Appliquer fond blanc"}
                  </Button>
                  {whiteBgImage && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setWhiteBgImage(null)}
                      className="w-full text-xs text-muted-foreground"
                    >
                      Réinitialiser l'image originale
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Template Grid */}
            <div className="bg-card rounded-xl border p-4">
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

            {/* Preview Section */}
            {(selectedProduct || generatedImage) && (
              <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Aperçu</h3>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Template Preview */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Template sélectionné</p>
                    <div 
                      className={cn(
                        "aspect-square rounded-xl overflow-hidden relative",
                        selectedTemplateData?.preview || "bg-muted"
                      )}
                    >
                      {selectedTemplateData?.badge && (
                        <div className="absolute top-4 left-4">
                          <span className={cn(
                            "px-3 py-1.5 text-sm font-bold rounded-lg shadow",
                            selectedTemplateData.badgeColor || "bg-white text-gray-900"
                          )}>
                            {selectedTemplateData.badge}
                          </span>
                        </div>
                      )}
                      
                      {(whiteBgImage || selectedProduct?.image) ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                          <img 
                            src={whiteBgImage || selectedProduct.image}
                            alt={selectedProduct.title}
                            className="max-w-full max-h-full object-contain drop-shadow-2xl"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sélectionnez un produit</p>
                          </div>
                        </div>
                      )}

                      {selectedProduct && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                          <h4 className="text-white font-bold text-lg truncate">{selectedProduct.title}</h4>
                          {selectedProduct.price && (
                            <div className="flex items-center gap-2 mt-1">
                              {selectedProduct.compare_at_price && (
                                <span className="text-white/60 text-sm line-through">
                                  {selectedProduct.compare_at_price}€
                                </span>
                              )}
                              <span className="text-yellow-400 font-bold text-xl">
                                {selectedProduct.price}€
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generated Image */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Image générée par IA</p>
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
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Cliquez sur "Générer" pour créer</p>
                          <p className="text-xs mt-1">votre visuel publicitaire</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
