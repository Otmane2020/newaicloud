import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BulkAIImagesDialog } from "@/components/seo/BulkAIImagesDialog";
import {
  Camera,
  Search,
  Image,
  History,
  CreditCard,
  Sparkles,
  Package,
  Clock,
  Trash2,
  Download,
  ExternalLink,
  RefreshCcw,
  Filter,
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

interface UserCredits {
  total: number;
  used: number;
  remaining: number;
}

export default function AiImagesDashboard() {
  const { language } = useTranslation();
  const { selectedStore } = useStore();
  const isFr = language === "fr";

  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [credits, setCredits] = useState<UserCredits>({ total: 0, used: 0, remaining: 0 });

  // Load products
  useEffect(() => {
    loadProducts();
  }, [selectedStore]);

  // Load history when tab changes
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, selectedStore]);

  // Load credits
  useEffect(() => {
    loadCredits();
  }, []);

  const loadProducts = async () => {
    if (!selectedStore) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, status, shopify_id, handle")
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
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

      if (selectedStore) {
        query.eq("store_id", selectedStore.id);
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

  const loadCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get usage for current month
      const { data, error } = await supabase
        .from("usage_tracking")
        .select("optimizations_count")
        .eq("seller_id", user.id)
        .gte("month", new Date().toISOString().slice(0, 7) + "-01")
        .single();

      const used = data?.optimizations_count || 0;
      // Assuming 30 credits per $9.99 pack (10 images * 3 credits)
      const total = 30;
      setCredits({ total, used, remaining: Math.max(0, total - used) });
    } catch (err) {
      console.error("Error loading credits:", err);
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

          {/* Credits Display */}
          <div className="flex items-center gap-4">
            <Card className="px-4 py-2 flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-primary" />
              <div className="text-sm">
                <span className="font-medium">{credits.remaining}</span>
                <span className="text-muted-foreground">/{credits.total} {isFr ? "crédits" : "credits"}</span>
              </div>
            </Card>
            <Button variant="outline" size="sm">
              {isFr ? "Acheter Crédits" : "Buy Credits"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
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
            {/* Actions Bar */}
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
                <p className="text-sm text-muted-foreground">
                  {isFr
                    ? "Importez vos produits depuis Shopify pour commencer."
                    : "Import your products from Shopify to get started."}
                </p>
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
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-white" />
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

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isFr ? "Rechercher par produit..." : "Search by product..."}
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

            {/* History Grid */}
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
                  {isFr
                    ? "Vos images générées par IA apparaîtront ici."
                    : "Your AI-generated images will appear here."}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredHistory.map(item => (
                  <Card key={item.id} className="group overflow-hidden">
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={item.image_url}
                        alt={item.product_title || "AI Generated"}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => window.open(item.image_url, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = item.image_url;
                            a.download = `ai-image-${item.id}.png`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => deleteHistoryItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-medium truncate">{item.product_title || "—"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      {item.template_name && (
                        <Badge variant="secondary" className="text-xs">
                          {item.template_name}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Bulk AI Images Dialog */}
      <BulkAIImagesDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        selectedProducts={selectedProducts.map(p => ({
          id: p.id,
          title: p.title,
          image_url: p.image_url,
          status: p.status,
        }))}
        onComplete={() => {
          setShowBulkDialog(false);
          setSelectedProducts([]);
          loadHistory();
          loadCredits();
          toast.success(isFr ? "Images générées avec succès!" : "Images generated successfully!");
        }}
      />
    </div>
  );
}
