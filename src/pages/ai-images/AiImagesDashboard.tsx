import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BulkAIImagesDialog } from "@/components/seo/BulkAIImagesDialog";
import { AIImagesCreditsDisplay, AIImagesCreditsPurchaseDialog } from "@/components/seo/AIImagesCreditsPurchase";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Camera,
  Search,
  Image,
  History,
  Sparkles,
  Package,
  Trash2,
  Download,
  RefreshCcw,
  ZoomIn,
  X,
  Upload,
  Images,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  status: string;
  shopify_id: number | null;
  handle: string | null;
}

interface HistoryItem {
  id: string;
  product_id: string | null;
  product_title: string | null;
  template_name: string | null;
  image_url: string;
  created_at: string;
  caption: string | null;
}

interface DuplicateProductInfo {
  productId: string;
  productTitle: string;
  duplicateCount: number;
  duplicateGroups: Array<{
    normalizedFilename: string;
    imageCount: number;
    images: Array<{ id: string; src: string; isAi: boolean }>;
  }>;
}

export default function AiImagesDashboard() {
  const { language } = useTranslation();
  const { selectedStore, stores } = useStore();
  const isFr = language === "fr";

  // Detect Shopify embedded mode and get shop from URL params
  const shopifyParams = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return {
      shop: search.get("shop"),
      host: search.get("host"),
      isEmbedded: search.get("embedded") === "1" || search.has("host"),
    };
  }, []);

  // Find store from Shopify shop param if embedded
  const embeddedStore = useMemo(() => {
    if (!shopifyParams.shop || !stores.length) return null;
    return stores.find(s => 
      s.store_url?.includes(shopifyParams.shop!) || 
      shopifyParams.shop!.includes(s.store_url?.replace('https://', '').replace('.myshopify.com', '') || '')
    );
  }, [shopifyParams.shop, stores]);

  // Use embedded store if available, otherwise selectedStore
  const activeStore = embeddedStore || selectedStore;

  const [activeTab, setActiveTab] = useState("products");
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<HistoryItem | null>(null);
  const [singleProductToGenerate, setSingleProductToGenerate] = useState<Product | null>(null);
  const [productsWithDuplicates, setProductsWithDuplicates] = useState<DuplicateProductInfo[]>([]);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  
  // Image statistics
  const [imageStats, setImageStats] = useState({
    shopifyImages: 0,
    aiImages: 0,
    exportedAiImages: 0,
    totalImages: 0,
    loadingStats: true
  });

  useEffect(() => {
    loadProducts();
    loadImageStats();
  }, [activeStore]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, activeStore]);

  const loadImageStats = async () => {
    if (!activeStore) {
      setImageStats(prev => ({ ...prev, loadingStats: false }));
      return;
    }
    
    try {
      // Get product IDs for this store
      const { data: storeProducts } = await supabase
        .from("shopify_products")
        .select("id")
        .eq("store_id", activeStore.id);
      
      if (!storeProducts || storeProducts.length === 0) {
        setImageStats({ shopifyImages: 0, aiImages: 0, exportedAiImages: 0, totalImages: 0, loadingStats: false });
        return;
      }
      
      const productIds = storeProducts.map(p => p.id);
      
      // Get all images for these products
      const { data: images } = await supabase
        .from("product_images")
        .select("is_ai_generated, source, exported_to_shopify")
        .in("product_id", productIds);
      
      if (!images) {
        setImageStats({ shopifyImages: 0, aiImages: 0, exportedAiImages: 0, totalImages: 0, loadingStats: false });
        return;
      }
      
      const shopifyImages = images.filter(img => img.source === 'shopify' || !img.is_ai_generated).length;
      const aiImages = images.filter(img => img.is_ai_generated === true).length;
      const exportedAiImages = images.filter(img => img.is_ai_generated === true && img.exported_to_shopify === true).length;
      
      setImageStats({
        shopifyImages,
        aiImages,
        exportedAiImages,
        totalImages: images.length,
        loadingStats: false
      });
      
      console.log(`[AiImagesDashboard] Image stats: Shopify=${shopifyImages}, AI=${aiImages}, Exported=${exportedAiImages}, Total=${images.length}`);
    } catch (err) {
      console.error("Error loading image stats:", err);
      setImageStats(prev => ({ ...prev, loadingStats: false }));
    }
  };

  const cleanupDuplicateImages = async (dryRun: boolean = false) => {
    if (!activeStore) {
      toast.error(isFr ? "Aucune boutique sélectionnée" : "No store selected");
      return;
    }
    
    setIsCleaningDuplicates(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(isFr ? "Non authentifié" : "Not authenticated");
        return;
      }

      const { data, error } = await supabase.functions.invoke("cleanup-duplicate-images", {
        body: {
          userId: user.id,
          storeId: activeStore.id,
          dryRun
        }
      });

      if (error) throw error;

      if (dryRun) {
        // Store products with duplicates for display
        if (data.productsWithDuplicates && data.productsWithDuplicates.length > 0) {
          setProductsWithDuplicates(data.productsWithDuplicates);
        }
        
        const msg = isFr 
          ? `Analyse terminée: ${data.imagesToDelete} doublons trouvés (${data.stats?.duplicateAiImagesDeleted || 0} IA, ${data.stats?.duplicateNormalizedUrlDeleted || 0} URLs similaires, ${data.stats?.duplicateShopifyDeleted || 0} IDs Shopify)`
          : `Analysis complete: ${data.imagesToDelete} duplicates found (${data.stats?.duplicateAiImagesDeleted || 0} AI, ${data.stats?.duplicateNormalizedUrlDeleted || 0} similar URLs, ${data.stats?.duplicateShopifyDeleted || 0} Shopify IDs)`;
        
        if (data.imagesToDelete > 0) {
          toast.info(msg, {
            duration: 8000,
            action: {
              label: isFr ? "Voir produits affectés" : "View affected products",
              onClick: () => setShowDuplicatesDialog(true)
            }
          });
        } else {
          toast.success(isFr ? "Aucun doublon trouvé !" : "No duplicates found!");
          setProductsWithDuplicates([]);
        }
      } else {
        toast.success(isFr ? `${data.deletedCount} doublons supprimés !` : `${data.deletedCount} duplicates deleted!`);
        setProductsWithDuplicates([]);
        loadImageStats();
      }
    } catch (err: any) {
      console.error("Error cleaning duplicates:", err);
      toast.error(isFr ? "Erreur lors du nettoyage" : "Error during cleanup");
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const loadProducts = async () => {
    if (!activeStore) {
      console.log("[AiImagesDashboard] No active store, skipping products load");
      setLoadingProducts(false);
      return;
    }
    console.log("[AiImagesDashboard] Loading products for store:", activeStore.id);
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, status, shopify_id, handle")
        .eq("store_id", activeStore.id)
        .order("title", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      console.log("[AiImagesDashboard] Loaded", data?.length || 0, "products");
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error(isFr ? "Erreur chargement produits" : "Error loading products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = supabase
        .from("creative_history")
        .select("id, product_id, product_title, template_name, image_url, created_at, caption")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (activeStore) {
        query.eq("store_id", activeStore.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
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
      toast.success(isFr ? "Image supprimée" : "Image deleted");
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error(isFr ? "Erreur suppression" : "Error deleting");
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleGenerateSingle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSingleProductToGenerate(product);
    setSelectedProducts([product]);
    setShowBulkDialog(true);
  };

  const handleSelectAll = () => {
    const filtered = filteredProducts;
    if (selectedProducts.length === filtered.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filtered);
    }
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    h.product_title?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    h.template_name?.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard - AI Product Image Shot</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AI Product Image Shot</span>
          </div>

          {/* Billing Display */}
          <AIImagesCreditsDisplay onBuyClick={() => setShowBillingDialog(true)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Image Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageStats.loadingStats ? "..." : imageStats.shopifyImages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isFr ? "Images Shopify" : "Shopify Images"}</p>
            </div>
          </Card>
          
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageStats.loadingStats ? "..." : imageStats.aiImages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isFr ? "Images IA Créées" : "AI Images Created"}</p>
            </div>
          </Card>
          
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageStats.loadingStats ? "..." : imageStats.exportedAiImages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isFr ? "IA Exportées" : "AI Exported"}</p>
            </div>
          </Card>
          
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Images className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageStats.loadingStats ? "..." : imageStats.totalImages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isFr ? "Total Images" : "Total Images"}</p>
            </div>
          </Card>

          {/* Cleanup Duplicates Button */}
          <Card 
            className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors col-span-2 md:col-span-1 ${productsWithDuplicates.length > 0 ? 'ring-2 ring-amber-500/50' : ''}`}
            onClick={() => {
              if (productsWithDuplicates.length > 0) {
                setShowDuplicatesDialog(true);
              } else if (!isCleaningDuplicates) {
                cleanupDuplicateImages(true);
              }
            }}
          >
            <div className={`w-10 h-10 rounded-lg ${productsWithDuplicates.length > 0 ? 'bg-amber-500/10' : 'bg-red-500/10'} flex items-center justify-center relative`}>
              {productsWithDuplicates.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <Trash2 className={`w-5 h-5 text-red-500 ${isCleaningDuplicates ? 'animate-pulse' : ''}`} />
              )}
              {productsWithDuplicates.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs bg-amber-500">
                  {productsWithDuplicates.length}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isCleaningDuplicates 
                  ? (isFr ? "Analyse..." : "Analyzing...") 
                  : productsWithDuplicates.length > 0 
                    ? (isFr ? "Voir doublons détectés" : "View detected duplicates")
                    : (isFr ? "Détecter doublons" : "Detect duplicates")}
              </p>
              <p className="text-xs text-muted-foreground">
                {productsWithDuplicates.length > 0 
                  ? (isFr ? `${productsWithDuplicates.length} produits affectés` : `${productsWithDuplicates.length} products affected`)
                  : (isFr ? "Analyser et supprimer" : "Analyze and remove")}
              </p>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              {isFr ? "Contenu Produits" : "Product Content"}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              {isFr ? "Historique IA" : "AI History"}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isFr ? "Rechercher produits..." : "Search products..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedProducts.length === filteredProducts.length
                    ? (isFr ? "Désélectionner tout" : "Deselect All")
                    : (isFr ? "Tout sélectionner" : "Select All")}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedProducts.length === 0}
                  onClick={() => setShowBulkDialog(true)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isFr ? "Générer Images IA" : "Generate AI Images"}
                  {selectedProducts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedProducts.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">
                  {isFr ? "Aucun produit trouvé" : "No products found"}
                </h3>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredProducts.map(product => {
                  const isSelected = selectedProducts.some(p => p.id === product.id);
                  return (
                    <Card
                      key={product.id}
                      className={`group cursor-pointer overflow-hidden transition-all ${
                        isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="aspect-square relative bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Sparkles button - always visible on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-10 w-10 rounded-full shadow-lg"
                            onClick={(e) => handleGenerateSingle(e, product)}
                          >
                            <Sparkles className="w-5 h-5 text-primary" />
                          </Button>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 left-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {product.status === "active" && (
                          <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                            {isFr ? "Actif" : "Active"}
                          </Badge>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab - NewAI Style */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isFr ? "Rechercher historique..." : "Search history..."}
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory} className="gap-2">
                <RefreshCcw className="w-4 h-4" />
                {isFr ? "Actualiser" : "Refresh"}
              </Button>
            </div>

            {loadingHistory ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <Card className="p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">
                  {isFr ? "Aucun historique" : "No history yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isFr ? "Vos images générées par IA apparaîtront ici." : "Your AI-generated images will appear here."}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredHistory.map(item => (
                  <div key={item.id} className="group relative cursor-pointer" onClick={() => setPreviewImage(item)}>
                    <img
                      src={item.image_url}
                      alt={item.product_title || "Creative"}
                      className="w-full aspect-square object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                      <div className="flex justify-between items-start">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 bg-white/20 hover:bg-white/40"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(item); }}
                        >
                          <ZoomIn className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="text-white text-xs">
                        <p className="font-medium truncate">{item.product_title}</p>
                        <p className="opacity-70">{format(new Date(item.created_at), 'dd/MM/yyyy', { locale: isFr ? fr : enUS })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Preview Dialog - NewAI Style */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">
            {previewImage?.product_title || 'Creative Preview'}
          </DialogTitle>
          {previewImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 rounded-full"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={previewImage.image_url}
                alt={previewImage.product_title || 'Creative'}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="font-semibold text-lg">{previewImage.product_title}</p>
                    <p className="text-sm opacity-70">
                      {previewImage.template_name} • {format(new Date(previewImage.created_at), 'dd MMMM yyyy', { locale: isFr ? fr : enUS })}
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewImage.image_url;
                      link.download = `creative-${previewImage.id}.png`;
                      link.click();
                      toast.success(isFr ? "Téléchargé!" : "Downloaded!");
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {isFr ? "Télécharger" : "Download"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk AI Images Dialog */}
      <BulkAIImagesDialog
        open={showBulkDialog}
        onOpenChange={(open) => {
          setShowBulkDialog(open);
          if (!open) setSingleProductToGenerate(null);
        }}
        selectedProducts={selectedProducts.map(p => ({
          id: p.id,
          title: p.title,
          image_url: p.image_url,
          status: p.status,
        }))}
        onComplete={() => {
          setShowBulkDialog(false);
          setSelectedProducts([]);
          setSingleProductToGenerate(null);
          loadHistory();
          toast.success(isFr ? "Images générées avec succès!" : "Images generated successfully!");
        }}
      />

      {/* Billing Dialog */}
      <AIImagesCreditsPurchaseDialog
        open={showBillingDialog}
        onOpenChange={setShowBillingDialog}
      />

      {/* Products with Duplicates Dialog */}
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isFr ? `${productsWithDuplicates.length} produits avec doublons d'images` : `${productsWithDuplicates.length} products with duplicate images`}
          </DialogTitle>
          
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {productsWithDuplicates.map((product) => (
              <Card key={product.productId} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{product.productTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {isFr 
                        ? `${product.duplicateCount} doublons dans ${product.duplicateGroups.length} groupe(s)`
                        : `${product.duplicateCount} duplicates in ${product.duplicateGroups.length} group(s)`}
                    </p>
                  </div>
                  {activeStore && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const storeUrl = activeStore.store_url?.replace(/\/$/, '') || '';
                        const shopifyProductId = products.find(p => p.id === product.productId)?.shopify_id;
                        if (shopifyProductId && storeUrl) {
                          const adminUrl = storeUrl.replace('.myshopify.com', '.myshopify.com').replace('https://', 'https://admin.shopify.com/store/').replace('.myshopify.com', '') + `/products/${shopifyProductId}`;
                          window.open(adminUrl, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Shopify
                    </Button>
                  )}
                </div>
                
                {product.duplicateGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">
                      {isFr ? "Fichier:" : "File:"} <code className="bg-muted px-1 rounded">{group.normalizedFilename}</code> 
                      <span className="ml-2">({group.imageCount} {isFr ? "occurrences" : "occurrences"})</span>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {group.images.slice(0, 6).map((img, imgIdx) => (
                        <div 
                          key={img.id} 
                          className={`relative w-16 h-16 rounded-md overflow-hidden border-2 ${
                            imgIdx === 0 ? 'border-green-500' : 'border-red-500/50'
                          }`}
                          title={imgIdx === 0 ? (isFr ? "Conservé" : "Kept") : (isFr ? "Doublon" : "Duplicate")}
                        >
                          <img 
                            src={img.src} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-white text-center py-0.5">
                            {img.isAi ? "AI" : "Shopify"}
                          </div>
                          {imgIdx > 0 && (
                            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {group.images.length > 6 && (
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                          +{group.images.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <p className="text-sm text-muted-foreground">
              {isFr 
                ? "Les images marquées en rouge seront supprimées"
                : "Images marked in red will be deleted"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDuplicatesDialog(false)}>
                {isFr ? "Annuler" : "Cancel"}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowDuplicatesDialog(false);
                  cleanupDuplicateImages(false);
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isFr ? "Supprimer les doublons" : "Delete duplicates"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
