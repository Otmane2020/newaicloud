import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useShopifySync } from "@/hooks/useShopifySync";
import { useStore } from "@/contexts/StoreContext";
import { guardStoreData, verifyStateCoherence } from "@/lib/storeGuard";
import { SimpleSyncProgress } from "@/components/integration/SyncProgressDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Plus, Search, Filter, Package, Grid3x3, List, ChevronDown, RefreshCw, Infinity, Square, Palette, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Product {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  image_url: string | null;
  inventory_quantity: number;
  created_at: string;
}

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { selectedStore } = useStore();
  const { isSyncing, currentSyncType, syncShopifyStore } = useShopifySync();
  const { t, tf } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [generatingBgForProduct, setGeneratingBgForProduct] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Handler pour générer un fond blanc pour un produit
  const handleGenerateWhiteBackground = async (product: Product) => {
    if (!product.image_url) {
      toast.error("Aucune image disponible pour ce produit");
      return;
    }

    setGeneratingBgForProduct(product.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: { 
          imageUrl: product.image_url,
          productTitle: product.title,
          imageType: 'main'
        }
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        // Mettre à jour l'image du produit
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ image_url: data.imageUrl })
          .eq('id', product.id);

        if (updateError) throw updateError;

        toast.success("Fond blanc généré avec succès!");
        loadProducts(); // Recharger les produits
      } else {
        throw new Error(data.error || 'Échec de la génération');
      }
    } catch (error: any) {
      console.error('Error generating white background:', error);
      toast.error("Erreur lors de la génération du fond blanc", {
        description: error.message
      });
    } finally {
      setGeneratingBgForProduct(null);
      await refreshLimits();
    }
  };

  // Handler pour générer un fond AI pour un produit
  const handleGenerateAIBackground = async (product: Product) => {
    if (!product.image_url) {
      toast.error("Aucune image disponible pour ce produit");
      return;
    }

    setGeneratingBgForProduct(product.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-background-variants', {
        body: { 
          productId: product.id,
          productTitle: product.title,
          productDescription: product.description || '',
          productType: product.product_type || '',
          vendor: product.vendor || '',
          style: 'professional'
        }
      });

      if (error) throw error;

      if (data.variants && data.variants.length > 0) {
        toast.success(`${data.variants.length} fond(s) AI généré(s) avec succès!`);
        navigate(`/product-title-description?productId=${product.id}`);
      } else {
        throw new Error('Aucune variante générée');
      }
    } catch (error: any) {
      console.error('Error generating AI background:', error);
      toast.error("Erreur lors de la génération du fond AI", {
        description: error.message
      });
    } finally {
      setGeneratingBgForProduct(null);
      await refreshLimits();
    }
  };

  // Handler pour changer le statut du produit
  const handleToggleStatus = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newStatus = product.status === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('shopify_products')
        .update({ status: newStatus })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(newStatus === 'active' ? 'Produit activé' : 'Produit en brouillon');
      loadProducts(); // Recharger les produits
    } catch (error: any) {
      console.error('Error updating product status:', error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const loadProducts = async () => {
    if (!selectedStore?.id) {
      console.log('⚠️ [PRODUCTS] No store ID, clearing products');
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    
    console.log('🔄 [PRODUCTS] loadProducts called with selectedStore:', {
      id: selectedStore.id,
      name: selectedStore.store_name,
      hasStore: !!selectedStore
    });

    try {
      setLoading(true);
      console.log('📦 [PRODUCTS] Loading products for store:', selectedStore.store_name, 'ID:', selectedStore.id);
      
      // Count total products first
      console.log('📊 [PRODUCTS] Executing count query with store_id:', selectedStore.id);
      const { count } = await supabase
        .from("shopify_products")
        .select("*", { count: 'exact', head: true })
        .eq("seller_id", user?.id)
        .eq("store_id", selectedStore.id);
      
      console.log('📊 [PRODUCTS] Count result for store', selectedStore.store_name, ':', count);
      
      setTotalCount(count || 0);
      
      // Charger les produits avec pagination et filtre store_id
      console.log('📊 [PRODUCTS] Executing products query with store_id:', selectedStore.id);
      const { data: rawData, error } = await supabase
        .from("shopify_products")
        .select("*, store_id")
        .eq("seller_id", user?.id)
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // ✅ VALIDATION GARDE : Filtrer les données avec la fonction garde
      const data = guardStoreData(rawData, selectedStore.id, 'product');

      setProducts(data);
      
      // ✅ Vérifier la cohérence après setState
      verifyStateCoherence(data, selectedStore.id, 'Products', 'product');
      
      console.log(`✅ [PRODUCTS] Loaded ${data.length} products for store ${selectedStore.store_name} (page ${currentPage}/${Math.ceil((count || 0) / ITEMS_PER_PAGE)})`);
    } catch (error) {
      console.error("❌ [PRODUCTS] Error loading products:", error);
      toast.error(t.products.loadError);
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => {
    console.log('🔄 [PRODUCTS] useEffect triggered - selectedStore.id changed:', {
      id: selectedStore?.id,
      name: selectedStore?.store_name,
      currentPage,
      hasUser: !!user
    });
    
    if (user && selectedStore) {
      setLoading(true);
      loadProducts();
    } else if (!selectedStore) {
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, selectedStore?.id]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, statusFilter, sortBy]);

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Search filter - Recherche intelligente
    if (searchQuery) {
      // Fonction pour normaliser le texte (enlever accents, ponctuation, minuscules)
      const normalizeText = (text: string | null | undefined): string => {
        if (!text) return '';
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
          .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
          .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
          .trim();
      };

      // Normaliser le terme de recherche et le diviser en mots-clés
      const searchKeywords = normalizeText(searchQuery).split(' ').filter(k => k.length > 0);
      
      if (searchKeywords.length > 0) {
        filtered = filtered.filter(p => {
          // Construire une chaîne de recherche avec tous les champs du produit
          const searchableText = normalizeText([
            p.title,
            p.description,
            p.vendor,
            p.product_type,
            p.status
          ].filter(Boolean).join(' '));

          // Vérifier que tous les mots-clés sont présents
          return searchKeywords.every(keyword => searchableText.includes(keyword));
        });
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "name-asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "recent":
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredProducts(filtered);
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * p.inventory_quantity, 0);

  // Calculate discount percentage
  const calculateDiscount = (price: number | null, comparePrice: number | null) => {
    if (!price || !comparePrice || comparePrice <= price) return null;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  const [showSyncResultDialog, setShowSyncResultDialog] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  const handleManualSync = async (store: any) => {
      if (!user) {
      toast.error(t.sync.notAuthenticated);
      return;
    }

    let syncToastId: string | number | undefined;

    try {
      setSyncingStoreId(store.id);
      
      // 🆕 Toast de démarrage
      syncToastId = toast.loading(
        tf('sync.syncingStore', { storeName: store.store_name })
      );
      
      console.log('🔄 [MANUAL SYNC] Starting manual sync for store:', store.store_name);

      // Get store data with access token
      const { data: storeData, error: storeError } = await supabase
        .from('shopify_connections')
        .select('access_token, store_url')
        .eq('id', store.id)
        .single();

      if (storeError || !storeData) {
        console.error('❌ [SYNC ERROR] Store not found:', storeError);
        toast.error(t.sync.storeNotFound);
        setSyncingStoreId(null);
        return;
      }

      // Extract shop name from store URL
      const shopName = storeData.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');

      console.log('🏪 [SYNC] Shop name:', shopName);

      let historyId: string | null = null;

      // Create sync history entry
      try {
        const { data: entry, error: historyError } = await supabase
          .from('sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'manual',
            content_types: ['products', 'collections', 'pages', 'articles', 'images'],
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (historyError) {
          console.error('❌ [SYNC HISTORY ERROR]', historyError);
        } else if (entry) {
          historyId = entry.id;
          console.log('✅ [SYNC HISTORY] Created:', historyId);
        }
      } catch (historyCreateError) {
        console.error('❌ [SYNC HISTORY EXCEPTION]', historyCreateError);
      }

      // Get counts before import
      const { count: productsBefore } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id);

      // Import all content types
      const types = ['products', 'collections', 'pages', 'articles', 'images'];
      const importResults: Record<string, number> = {};
      const errorMessages: string[] = [];
      
      for (const type of types) {
        console.log(`📦 [SYNC ${type.toUpperCase()}] Starting import...`);
        
        try {
          let result;
          const timeoutMs = 30000;
          
          const executeWithTimeout = async (promise: Promise<any>) => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 30s')), timeoutMs)
            );
            return Promise.race([promise, timeoutPromise]);
          };

          switch (type) {
            case 'products':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-products', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: store.id,
                    syncMode: 'smart'
                  }
                })
              );
              break;
            case 'collections':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-collections', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: store.id 
                  }
                })
              );
              break;
            case 'pages':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-pages', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: store.id 
                  }
                })
              );
              break;
            case 'articles':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-articles', {
                  body: { 
                    shopName, 
                    authToken: storeData.access_token, 
                    storeId: store.id 
                  }
                })
              );
              break;
            case 'images':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-content-images', {
                  body: { 
                    storeId: store.id,
                    types: ['collections', 'pages', 'articles', 'homepage'] 
                  }
                })
              );
              break;
          }

          if (result?.error) {
            console.error(`❌ [SYNC ${type.toUpperCase()} ERROR]`, result.error);
            errorMessages.push(`${type}: ${result.error.message || 'Unknown error'}`);
            importResults[type] = 0;
          } else {
            const imported = result?.data?.totalImported || result?.data?.count || result?.data?.imported || 0;
            importResults[type] = imported;
            console.log(`✅ [SYNC ${type.toUpperCase()}] Imported:`, imported);
          }
        } catch (error: any) {
          console.error(`❌ [SYNC ${type.toUpperCase()} EXCEPTION]`, error);
          errorMessages.push(`${type}: ${error.message}`);
          importResults[type] = 0;
        }
      }

      // Get counts after import
      const { count: productsAfter } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id);

      // Calculate stats
      const stats = {
        products: {
          before: productsBefore || 0,
          after: productsAfter || 0,
          imported: importResults.products || 0,
        },
        collections: {
          imported: importResults.collections || 0,
        },
        pages: {
          imported: importResults.pages || 0,
        },
        articles: {
          imported: importResults.articles || 0,
        },
        images: {
          imported: importResults.images || 0,
        },
      };

      const duration = Date.now();
      const totalSynced = Object.values(importResults).reduce((sum, val) => sum + val, 0);

      // Update sync history
      if (historyId) {
        await supabase
          .from('sync_history')
          .update({
            status: errorMessages.length > 0 ? 'partial' : 'success',
            items_synced: totalSynced,
            duration_ms: duration,
            error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', historyId);
      }

      // Update last_sync_at
      await supabase
        .from('shopify_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', store.id);

      console.log('✅ [SYNC COMPLETE] Stats:', stats);

      // Show results
      setSyncResults(stats);
      setShowSyncResultDialog(true);

      // Refresh data
      await loadProducts();
      await refreshLimits();

      if (errorMessages.length === 0) {
        toast.success(tf('sync.success', { count: totalSynced }), { id: syncToastId });
      } else {
        toast.warning(tf('sync.partialSuccess', { synced: totalSynced, errors: errorMessages.length }), { id: syncToastId });
      }

    } catch (error: any) {
      console.error('❌ [SYNC ERROR]', error);
      toast.error(`${t.sync.error}: ${error.message}`, { id: syncToastId || undefined });
    } finally {
      setSyncingStoreId(null);
    }
  };

  const handleSync = async () => {
    if (!user?.id) {
      toast.error(t.sync.notAuthenticated);
      return;
    }

    try {
      // @ts-ignore - Avoid deep type inference
      const { data: store, error } = await supabase
        .from('shopify_connections')
        .select('id, store_url, store_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !store) {
        toast.error(t.sync.noActiveConnection);
        return;
      }
      
      await handleManualSync(store);
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="container mx-auto">
          {/* Mobile Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Search bar skeleton */}
          <Skeleton className="h-12 w-full mb-4 rounded-lg" />

          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-sm">
                <Skeleton className="aspect-square" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-16 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SimpleSyncProgress open={isSyncing} currentType={currentSyncType} />
      
      {/* Sticky header for mobile */}
      <div className="sticky top-0 bg-background border-b z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">{t.products.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {products.length} / {
                limits?.limits?.max_products && limits.limits.max_products >= 999999 
                  ? <Infinity className="w-3 h-3" />
                  : (limits?.limits?.max_products || "...")
              } • {
                limits 
                  ? (limits.limits.max_products >= 999999 
                      ? <span className="flex items-center gap-1">slots <Infinity className="w-3 h-3" /></span>
                      : tf('products.slotsAvailable', { slots: Math.max(0, (limits.limits.max_products || 0) - (limits.usage.products_count || 0)) }))
                  : t.common.loading
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={async () => {
                if (!selectedStore) {
                  toast.error("Aucune boutique sélectionnée");
                  return;
                }
                await syncShopifyStore(selectedStore);
                await loadProducts();
                await refreshLimits();
              }} 
              variant="outline" 
              className="h-9 px-3"
              disabled={isSyncing || !selectedStore}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
            <Button size="sm" onClick={() => navigate("/integration")} className="h-9 px-3">
              <Plus className="w-4 h-4 mr-2" />
              {t.products.importProducts}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.products.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm bg-muted/50 border-0"
          />
        </div>

        {/* Quick filters - Status first */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {t.common.active}
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("draft")}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {t.common.draft}
          </Button>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {t.common.all}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap text-xs h-8 px-3">
                {t.common.sort}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("recent")}>{t.products.filters.recent}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-asc")}>{t.products.filters.nameAsc}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-desc")}>{t.products.filters.nameDesc}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-asc")}>{t.products.filters.priceLow}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-desc")}>{t.products.filters.priceHigh}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {viewMode === "grid" ? <List className="w-3 h-3" /> : <Grid3x3 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-muted rounded-full">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{t.products.empty.title}</h3>
                <p className="text-muted-foreground mb-6 text-sm">{t.products.empty.description}</p>
                <Button onClick={() => navigate("/integration")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.products.empty.addProduct}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <Card className="p-6 text-center border-0 shadow-sm">
                <p className="text-muted-foreground text-sm">{t.products.noResults}</p>
              </Card>
            ) : viewMode === "grid" ? (
              // Optimized mobile grid (2 columns) - Like the photo
              <TooltipProvider>
                <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => {
                  const discount = calculateDiscount(product.price, product.compare_at_price);

                  return (
                    <Card
                      key={product.id}
                      onClick={() => navigate(`/product-landing/${product.id}`)}
                      className="cursor-pointer border-0 shadow-sm overflow-hidden transition-all active:scale-95 bg-white"
                    >
                      <div className="aspect-square bg-muted/50 relative overflow-hidden group">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Background actions - always visible */}
                        <div className="absolute top-2 right-2 flex gap-1 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateWhiteBackground(product);
                                }}
                                disabled={generatingBgForProduct === product.id}
                              >
                                {generatingBgForProduct === product.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Square className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Fond blanc</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateAIBackground(product);
                                }}
                                disabled={generatingBgForProduct === product.id}
                              >
                                {generatingBgForProduct === product.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Palette className="h-3.5 w-3.5 text-purple-600" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Générer fond AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-tight">{product.title}</h3>

                        {/* Price section */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-base text-gray-900">
                            {product.price?.toFixed(2) || "0.00"} {product.currency}
                          </span>
                          {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                            <span className="text-xs text-gray-500 line-through">
                              {product.compare_at_price.toFixed(2)} {product.currency}
                            </span>
                          )}
                        </div>

                        {/* Vendor and stock */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600 font-medium">{product.vendor || t.products.noVendor}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              product.inventory_quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tf('products.stock', { count: formatNumber(product.inventory_quantity) })}
                          </span>
                        </div>

                        {/* Status badge - cliquable */}
                        <div className="flex justify-start">
                          <Badge
                            onClick={(e) => handleToggleStatus(product, e)}
                            className={`cursor-pointer text-xs transition-colors ${
                              product.status === 'active' 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                          >
                            {product.status === 'active' ? 'Active' : 'Draft'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              </TooltipProvider>
            ) : (
              // Optimized mobile list - Like the photo
              <div className="space-y-3">
                {filteredProducts.map((product) => {
                  const discount = calculateDiscount(product.price, product.compare_at_price);

                  return (
                    <Card
                      key={product.id}
                      onClick={() => navigate(`/product-landing/${product.id}`)}
                      className="cursor-pointer border-0 shadow-sm p-3 transition-all active:scale-[0.98] bg-white"
                    >
                      <div className="flex items-start gap-3">
                        {/* Product image */}
                        <div className="w-20 h-20 bg-muted/50 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Discount badge */}
                          {discount && (
                            <Badge className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0">
                              -{discount}%
                            </Badge>
                          )}
                        </div>

                        {/* Product details */}
                        <div className="flex-1 min-w-0">
                          {/* Title and status */}
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-sm line-clamp-2 flex-1 mr-2">{product.title}</h3>
                            <Badge
                              variant={product.status === "active" ? "default" : "secondary"}
                              className="text-xs bg-green-100 text-green-800 border-0"
                            >
                              {product.status === "active" ? t.common.active : t.common.draft}
                            </Badge>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {product.description || t.products.noDescription}
                          </p>

                          {/* Price section */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-base text-gray-900">
                              {product.price?.toFixed(2) || "0.00"} {product.currency}
                            </span>
                            {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                              <span className="text-xs text-gray-500 line-through">
                                {product.compare_at_price.toFixed(2)} {product.currency}
                              </span>
                            )}
                          </div>

                          {/* Vendor and stock */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">{product.vendor || t.products.noVendor}</span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                product.inventory_quantity > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {tf('products.stock', { count: formatNumber(product.inventory_quantity) })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {/* Pagination */}
            {filteredProducts.length > 0 && totalCount > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} sur {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(p => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sync Results Dialog */}
      <Dialog open={showSyncResultDialog} onOpenChange={setShowSyncResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Résultats de synchronisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {syncResults && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Produits</span>
                    <span className="text-sm text-muted-foreground">
                      {syncResults.products.imported} importés
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Collections</span>
                    <span className="text-sm text-muted-foreground">
                      {syncResults.collections.imported} importées
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Pages</span>
                    <span className="text-sm text-muted-foreground">
                      {syncResults.pages.imported} importées
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Articles</span>
                    <span className="text-sm text-muted-foreground">
                      {syncResults.articles.imported} importés
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Images</span>
                    <span className="text-sm text-muted-foreground">
                      {syncResults.images.imported} importées
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowSyncResultDialog(false)}
                  className="w-full"
                >
                  Fermer
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
