import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePaginatedSeo } from "@/hooks/usePaginatedSeo";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import {
  ProgressDialog,
  ResultsDialog,
  SyncConfirmationDialog,
  SuccessDialog,
  WorkflowItem,
} from "./SeoWorkflowDialogs";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { TrialLimitDialog } from "@/components/TrialLimitDialog";
import { TrialLimitBanner } from "@/components/TrialLimitBanner";
import { OptimizationConfirmDialog } from "./OptimizationConfirmDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SeoConfidenceBadge } from "./SeoConfidenceBadge";
import { calculateDetailedSeoScore, getSeoScoreBadge, passesQualityFilter } from "@/lib/seoQuality";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  Upload,
  Loader2,
  Package,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Eye,
  ExternalLink,
  Filter,
  Grid3x3,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { ShopifySyncSuccessDialog } from "./ShopifySyncSuccessDialog";
import { VisionAIBanner } from "./VisionAIBanner";
import { GoogleSearchPreview } from "./GoogleSearchPreview";
import { useStore } from "@/contexts/StoreContext";
import { useStoreDomain } from "@/hooks/useStoreDomain";
import { guardStoreData, verifyStateCoherence } from "@/lib/storeGuard";

interface Product {
  id: string;
  title: string;
  vendor: string;
  category: string;
  sub_category: string;
  seo_title: string;
  seo_description: string;
  enrichment_status: string;
  seo_synced_to_shopify: boolean;
  image_url: string;
  imported_at: string;
  optimization_count: number;
  tags: string;
  product_type: string;
}

type QuickFilterTab = "all" | "not-enriched" | "enriched" | "pending-sync" | "synced";
type SeoScoreSort = "none" | "asc" | "desc";
type StatusFilter = "all" | "optimized" | "not-optimized";
type SyncFilter = "all" | "synced" | "not-synced";
type QualityFilter = "all" | "excellent" | "good" | "medium" | "poor";

// Helper component for Google Search Preview in table
function GoogleSearchPreviewCell({ product }: { product: Product }) {
  const { domain } = useStoreDomain();

  if (!product.seo_title || !product.seo_description) {
    return (
      <Badge variant="outline" className="text-xs">
        Non optimisé
      </Badge>
    );
  }

  const url = `https://${domain}/products/${product.title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <GoogleSearchPreview
      title={product.seo_title}
      description={product.seo_description}
      url={url}
      compact={true}
    />
  );
}

export function SeoOptimization() {
  const { t, tf } = useTranslation();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { selectedStore } = useStore();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>("none");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [syncFilter, setSyncFilter] = useState<SyncFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>(
    (searchParams.get("filter") as QualityFilter) || "all"
  );
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [productsToSync, setProductsToSync] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [syncedItems, setSyncedItems] = useState<
    Array<{ id: string; title: string; shopifyUrl: string; resourceType: "product" }>
  >([]);
  const [showBulkOptimizeConfirmDialog, setShowBulkOptimizeConfirmDialog] = useState(false);

  const fetchProducts = async () => {
    if (!selectedStore) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ PAGINATION POUR DÉPASSER LA LIMITE DE 1000 PRODUITS
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;
      
      console.log('🔄 [SEO_OPTIMIZATION] Starting paginated fetch...');
      
      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [SEO_OPTIMIZATION] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from("shopify_products")
          .select(`
            *, 
            optimization_count,
            product_variants(sku),
            store_id
          `)
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order("imported_at", { ascending: false });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [SEO_OPTIMIZATION] Page ${page + 1} loaded: ${pageData.length} products`);
          allProducts = [...allProducts, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log('🚨 [SEO_OPTIMIZATION] Total products fetched:', allProducts.length);

      // ✅ VALIDATION GARDE : Filtrer les données avec la fonction garde
      const data = guardStoreData(allProducts, selectedStore.id, 'product');
      console.log('🚨 [SEO_OPTIMIZATION] After guard filter:', data.length, 'valid products');

      setProducts(data);
      
      // ✅ Vérifier la cohérence après setState
      verifyStateCoherence(data, selectedStore.id, 'SeoOptimization', 'product');
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t.seo.optimization.loadError);
    } finally {
      setLoading(false);
    }
  };

  // Recharger les produits quand la boutique change
  useEffect(() => {
    console.log('🔄 [SEO_OPTIMIZATION] selectedStore changed:', {
      hasStore: !!selectedStore,
      storeId: selectedStore?.id,
      storeName: selectedStore?.store_name
    });
    
    if (selectedStore) {
      console.log('📦 [SEO_OPTIMIZATION] Loading products for store:', selectedStore.store_name);
      setSelectedProducts(new Set()); // Vider les sélections
      fetchProducts();
    } else {
      // Cas où il n'y a pas de store sélectionné
      console.log('⚠️ [SEO_OPTIMIZATION] No store selected, clearing products');
      setProducts([]);
      setLoading(false);
    }
  }, [selectedStore]);

  // Réagir aux changements de filtre dans l'URL
  useEffect(() => {
    const filterParam = searchParams.get("filter") as QualityFilter;
    if (filterParam && ['all', 'excellent', 'good', 'medium', 'poor'].includes(filterParam)) {
      setQualityFilter(filterParam);
    }
  }, [searchParams]);

  // Statistics - distinguishing between existing data and AI-optimized data
  const totalEmpty = products.filter((p) => !p.seo_title && !p.seo_description).length;
  const existingData = products.filter(
    (p) => (p.seo_title || p.seo_description) && p.enrichment_status !== "enriched",
  ).length;
  const aiOptimized = products.filter((p) => p.enrichment_status === "enriched").length;
  const notEnrichedCount = totalEmpty + existingData;
  const enrichedCount = aiOptimized;
  const pendingSyncCount = products.filter(
    (p) => p.enrichment_status === "enriched" && !p.seo_synced_to_shopify,
  ).length;
  const syncedCount = products.filter((p) => p.seo_synced_to_shopify && p.enrichment_status === "enriched").length;
  const optimizationRate = products.length > 0 ? Math.round((aiOptimized / products.length) * 100) : 0;

  // Calculate global SEO score with 30/70 weighting
  const productsNotOptimized = products.filter((p) => p.enrichment_status !== "enriched");
  const productsOptimized = products.filter((p) => p.enrichment_status === "enriched");

  // Score for non-optimized products (based on original Shopify data)
  const scoreWithoutAI =
    productsNotOptimized.length > 0
      ? Math.round(
          productsNotOptimized.reduce((sum, p) => {
            const score = calculateDetailedSeoScore(
              p.title, // Original Shopify title
              p.vendor, // Using vendor as description proxy for non-enriched
              !!p.image_url,
              true,
              p.tags, // Shopify tags
              p.optimization_count, // Pass optimization count
            );
            return sum + score.score;
          }, 0) / productsNotOptimized.length,
        )
      : 0;

  // Score for AI-optimized products
  const scoreWithAI =
    productsOptimized.length > 0
      ? Math.round(
          productsOptimized.reduce((sum, p) => {
            const score = calculateDetailedSeoScore(
              p.seo_title, // AI-generated title
              p.seo_description, // AI-generated description
              !!p.image_url,
              true,
              p.tags, // Tags
              p.optimization_count, // Pass optimization count
            );
            return sum + score.score;
          }, 0) / productsOptimized.length,
        )
      : 0;

  // Apply 30/70 weighting
  const globalSeoScore = products.length > 0 ? Math.round(0.3 * scoreWithoutAI + 0.7 * scoreWithAI) : 0;

  // Get unique categories
  const uniqueCategories = Array.from(new Set(products.map((p) => p.product_type).filter(Boolean))).sort();

  // Helper function for SEO score calculation with memoization
  const getSeoScore = (() => {
    const cache = new Map();

    return (product) => {
      const cacheKey = `${product.seo_title}_${product.seo_description}_${product.image_url}_${product.tags}_${product.optimization_count}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const score = calculateDetailedSeoScore(
        product.seo_title,
        product.seo_description,
        !!product.image_url,
        true,
        product.tags,
        product.optimization_count || 0,
      ).score;

      cache.set(cacheKey, score);
      return score;
    };
  })();

  const filteredProducts = products
    .filter((product) => {
      const { enrichment_status, seo_synced_to_shopify, product_type, title } = product;

      // Early exclusion for tab filters
      const tabExclusions = {
        "not-enriched": enrichment_status === "enriched",
        enriched: enrichment_status !== "enriched",
        "pending-sync": enrichment_status !== "enriched" || seo_synced_to_shopify,
        synced: !seo_synced_to_shopify,
      };

      if (tabExclusions[activeTab]) return false;

      // Status and sync filters
      if (
        (statusFilter === "optimized" && enrichment_status !== "enriched") ||
        (statusFilter === "not-optimized" && enrichment_status === "enriched") ||
        (syncFilter === "synced" && !seo_synced_to_shopify) ||
        (syncFilter === "not-synced" && seo_synced_to_shopify)
      )
        return false;

      // Quality filter
      if (qualityFilter !== "all") {
        const score = getSeoScore(product);
        if (!passesQualityFilter(score, qualityFilter)) return false;
      }

      // Category and search filters
      if (selectedCategory !== "all" && product_type !== selectedCategory) return false;

      // SKU filter
      if (skuFilter) {
        const productSku = (product as any).product_variants?.[0]?.sku || '';
        if (!productSku.toLowerCase().includes(skuFilter.toLowerCase())) return false;
      }

      if (searchTerm) {
        return title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      }

      return true;
    })
    .sort((a, b) => {
      // Multi-level sorting for better UX
      const statusPriority = { enriched: 1, "not-enriched": 2 };
      const priorityA = statusPriority[a.enrichment_status] || 3;
      const priorityB = statusPriority[b.enrichment_status] || 3;

      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.seo_synced_to_shopify !== b.seo_synced_to_shopify) {
        return a.seo_synced_to_shopify ? 1 : -1;
      }

      return getSeoScore(b) - getSeoScore(a);
    });

  // Apply SEO score sorting
  const sortedProducts = [...filteredProducts];
  if (seoScoreSort !== "none") {
    sortedProducts.sort((a, b) => {
      // Calculate scores using the same values as display
      const scoreA = calculateDetailedSeoScore(
        a.seo_title,
        a.seo_description,
        !!a.image_url,
        true,
        a.tags,
        a.optimization_count,
      ).score;

      const scoreB = calculateDetailedSeoScore(
        b.seo_title,
        b.seo_description,
        !!b.image_url,
        true,
        b.tags,
        b.optimization_count,
      ).score;

      return seoScoreSort === "asc" ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  // Pagination with cache and scroll
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePaginatedSeo({
    items: sortedProducts,
    itemsPerPage: 50,
    cacheKey: 'seo-products',
  });

  const tabs = [
    { id: "all" as QuickFilterTab, label: t.seo.optimization.allProducts, count: products.length },
    { id: "not-enriched" as QuickFilterTab, label: t.seo.optimization.toOptimize, count: notEnrichedCount },
    { id: "enriched" as QuickFilterTab, label: t.seo.optimization.optimizedTab, count: enrichedCount },
    { id: "pending-sync" as QuickFilterTab, label: t.seo.optimization.toSynchronizeTab, count: pendingSyncCount },
    { id: "synced" as QuickFilterTab, label: t.seo.optimization.synchronizedTab, count: syncedCount },
  ];

  // Clickable stats handlers
  const handleNotOptimizedClick = () => {
    setActiveTab("not-enriched");
    toast.info(tf("seo.optimization.showingToOptimize", { count: notEnrichedCount }));
  };

  const handleOptimizedClick = () => {
    setActiveTab("enriched");
    toast.info(tf("seo.optimization.showingOptimized", { count: enrichedCount }));
  };

  const handleSyncedClick = () => {
    setActiveTab("synced");
    toast.info(tf("seo.optimization.showingSynchronized", { count: syncedCount }));
  };

  const handleGenerateAll = () => {
    if (notEnrichedCount === 0) {
      toast.info(t.seo.optimization.allProductsOptimized);
      return;
    }
    
    // Check usage limits first
    if (!limits?.canUseOptimizations || limits?.limitReached?.optimizations) {
      toast.error(t.seo.optimization.trialLimitReached);
      setShowUpgradeDialog(true);
      return;
    }
    
    // Show confirmation dialog
    setShowBulkOptimizeConfirmDialog(true);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const handleSeoScoreSortToggle = () => {
    if (seoScoreSort === "none") {
      setSeoScoreSort("desc"); // First click: highest to lowest
    } else if (seoScoreSort === "desc") {
      setSeoScoreSort("asc"); // Second click: lowest to highest
    } else {
      setSeoScoreSort("none"); // Third click: reset
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleGenerateForSelected = async (productIds?: string[]) => {
    // Check usage limits first (only check optimization-specific limits)
    if (!limits?.canUseOptimizations || limits?.limitReached?.optimizations) {
      toast.error(t.seo.optimization.trialLimitReached);
      setShowUpgradeDialog(true);
      return;
    }

    // Use provided productIds or fall back to selectedProducts
    const idsToUse = productIds ? new Set(productIds) : selectedProducts;

    // Check if products are selected
    if (idsToUse.size === 0) {
      toast.error(t.seo.optimization.noProductsSelected);
      return;
    }

    // Filter eligible products
    const productsToGenerate = products.filter((p) => {
      if (!idsToUse.has(p.id)) return false;

      // If in trial, exclude already optimized products
      if (limits?.isTrialing && (p.optimization_count || 0) >= 1) {
        return false;
      }

      // For paid users, allow re-optimization
      return true;
    });

    // Check if products can be optimized based on user status
    const selectedProductsList = products.filter((p) => idsToUse.has(p.id));
    
    if (productsToGenerate.length === 0) {
      if (limits?.isTrialing) {
        // In trial, all selected products have already been optimized once
        setShowUpgradeDialog(true);
      } else {
        // This shouldn't happen for paid users since we allow re-optimization
        toast.info(t.seo.optimization.noProductsSelected);
      }
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToGenerate.length });

    for (let i = 0; i < productsToGenerate.length; i++) {
      try {
        await supabase.functions.invoke("generate-seo-with-deepseek", {
          body: { productId: productsToGenerate[i].id },
        });
        setProgress({ current: i + 1, total: productsToGenerate.length });
      } catch (error: any) {
        console.error("Error generating SEO:", error);

        if (error.message?.includes("trial_product_already_optimized")) {
          toast.warning(t.seo.optimization.someAlreadyOptimized);
        } else if (error.message?.includes("trial_limit_reached") || error.message?.includes("monthly_limit_reached")) {
          // Afficher le bon message selon le statut de l'utilisateur
          if (limits?.isTrialing) {
            toast.error(t.seo.optimization.trialLimitReached);
          } else if (limits?.isPaid) {
            toast.error("Limite mensuelle d'optimisations atteinte. Passez à un plan supérieur.");
          } else {
            toast.error(t.seo.optimization.trialLimitReached);
          }
          setShowUpgradeDialog(true);
          break;
        } else {
          toast.error(t.seo.optimization.optimizationError);
        }
      }
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchProducts();
    await refreshLimits();

    // Get updated products with new SEO data
    const updatedProducts = await Promise.all(
      productsToGenerate.map(async (p) => {
        const { data } = await supabase
          .from("shopify_products")
          .select("id, title, seo_title, seo_description, image_url")
          .eq("id", p.id)
          .single();
        return data;
      }),
    );

    setOptimizedProducts(updatedProducts.filter(Boolean) as Product[]);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  const handleGenerateAllSeo = async () => {
    // Check usage limits first (only check optimization-specific limits)
    if (!limits?.canUseOptimizations || limits?.limitReached?.optimizations) {
      toast.error(t.seo.optimization.trialLimitReached);
      setShowUpgradeDialog(true);
      return;
    }

    const productsToGenerate = products.filter((p) => !p.seo_title || !p.seo_description);

    if (productsToGenerate.length === 0) {
      toast.info(t.seo.optimization.allProductsOptimized);
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToGenerate.length });

    const BATCH_SIZE = 3;
    for (let i = 0; i < productsToGenerate.length; i += BATCH_SIZE) {
      const batch = productsToGenerate.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (product) => {
          try {
            await supabase.functions.invoke("generate-seo-with-deepseek", {
              body: { productId: product.id },
            });
          } catch (error: any) {
            console.error("Error generating SEO:", error);
            if (error.message?.includes("trial_limit_reached") || error.message?.includes("monthly_limit_reached")) {
              // Afficher le bon message selon le statut de l'utilisateur
              if (limits?.isTrialing) {
                toast.error(t.seo.optimization.trialLimitReached);
              } else if (limits?.isPaid) {
                toast.error("Limite mensuelle d'optimisations atteinte. Passez à un plan supérieur.");
              } else {
                toast.error(t.seo.optimization.trialLimitReached);
              }
              setShowUpgradeDialog(true);
              return;
            }
          }
        }),
      );

      setProgress({ current: Math.min(i + BATCH_SIZE, productsToGenerate.length), total: productsToGenerate.length });
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchProducts();
    await refreshLimits();
  };

  const handleSyncSelected = async () => {
    const productsToSync = products.filter((p) => selectedProducts.has(p.id) && p.enrichment_status === "enriched");

    if (productsToSync.length === 0) {
      toast.info(t.seo.optimization.noProductsToSynchronize);
      return;
    }

    setShowResultsDialog(false);
    setShowSyncDialog(false);
    setSyncing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToSync.length });

    const syncedItems: Array<{ id: string; title: string; shopifyUrl: string; resourceType: "product" }> = [];

    for (let i = 0; i < productsToSync.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("sync-seo-to-shopify", {
          body: {
            productId: productsToSync[i].id,
            syncTags: true,
            syncGoogleShopping: true,
            force: true, // Allow immediate sync after optimization
          },
        });

        if (error) throw error;

        if (data?.success && data?.shopifyUrl) {
          syncedItems.push({
            id: productsToSync[i].id,
            title: productsToSync[i].title,
            shopifyUrl: data.shopifyUrl,
            resourceType: "product",
          });
        }

        setProgress({ current: i + 1, total: productsToSync.length });
      } catch (error) {
        console.error("Error syncing:", error);
      }
    }

    setSyncing(false);
    setIsOptimizationComplete(true);
    setSelectedProducts(new Set());

    await fetchProducts();
    await refreshLimits();

    // Show success dialog with Shopify links
    if (syncedItems.length > 0) {
      setSyncedItems(syncedItems);
    }
  };

  const handleSyncProducts = async (productIds: string[]) => {
    if (productIds.length === 0) {
      toast.info(t.seo.optimization.noProductsToSynchronize);
      return;
    }

    setShowResultsDialog(false);
    setShowSyncDialog(false);
    setSyncing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;

    for (let i = 0; i < productIds.length; i++) {
      try {
        await supabase.functions.invoke("sync-seo-to-shopify", {
          body: {
            productId: productIds[i],
            syncTags: true,
            syncGoogleShopping: true,
            force: true, // Allow immediate sync after optimization
          },
        });

        successCount++;
        setProgress({ current: i + 1, total: productIds.length });
      } catch (error) {
        console.error("Error syncing:", error);
      }
    }

    setSyncing(false);
    setIsOptimizationComplete(true);

    await fetchProducts();
    await refreshLimits();
  };

  const handleCloseProgressDialog = () => {
    if (isOptimizationComplete) {
      const successCount = progress.current;
      if (successCount > 0) {
        toast.success(t.seo.optimization.syncCompleted, {
          description: tf("seo.optimization.productsSynced", { count: successCount }),
        });
      }
    }

    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
    setSelectedProducts(new Set());
  };

  const handleCloseResultsDialog = () => {
    setShowResultsDialog(false);
    setOptimizedProducts([]);
    setSelectedProducts(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {limits?.limitReached && !limits?.canUseOptimizations && (
        <TrialLimitBanner
          resourceType="optimisations"
          usage={limits.usage.optimizations_count}
          limit={limits.limits.max_optimizations}
        />
      )}
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t.seo.optimization.title}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">{t.seo.optimization.subtitle}</p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{t.seo.optimization.smartSeo}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">{t.seo.optimization.visibility}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="font-medium">{t.seo.optimization.fastGeneration}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-center">
              <div
                className={`text-3xl md:text-4xl font-bold ${
                  globalSeoScore >= 80 ? "text-green-600" : globalSeoScore >= 60 ? "text-orange-600" : "text-red-600"
                }`}
              >
                {globalSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">{t.seo.optimization.globalScore}</div>
              <div className="text-xs text-muted-foreground mt-1">
                30% {t.seo.optimization.notOptimized} + 70% {t.seo.optimization.aiOptimized}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {optimizationRate}% {t.seo.optimization.optimized}
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerateAll}
              disabled={generating || notEnrichedCount === 0}
              className="bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 gap-2 shadow-lg hover:shadow-accent/50 text-accent-foreground font-semibold transition-all duration-300"
            >
              <Sparkles className="w-5 h-5" />
              {t.seo.optimization.startOptimization}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Vision AI Banner */}
      <VisionAIBanner />

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleNotOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                {t.seo.optimization.notAiOptimized}
              </p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{notEnrichedCount}</p>
              <div className="flex gap-2 mt-1 text-xs text-orange-600 dark:text-orange-400">
                <span>
                  {t.seo.optimization.empty}: {totalEmpty}
                </span>
                <span>•</span>
                <span>
                  {t.seo.optimization.existing}: {existingData}
                </span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">{t.seo.optimization.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {t.seo.optimization.aiOptimizedLabel}
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{enrichedCount}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t.seo.optimization.generatedByAI}</p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">{t.seo.optimization.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab("pending-sync");
            toast.info(tf("seo.optimization.showingToSynchronize", { count: pendingSyncCount }));
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {t.seo.optimization.toSynchronize}
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{pendingSyncCount}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{t.seo.optimization.aiOptimizedOnly}</p>
            </div>
            <Upload className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">{t.seo.optimization.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleSyncedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t.seo.optimization.synchronized}</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{syncedCount}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t.seo.optimization.aiOptimizedSynced}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">{t.seo.optimization.clickToView}</p>
        </Card>
      </div>

      {/* Usage limits alert */}
      {limits && limits.isTrialing && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            {limits.limitReached?.optimizations ? (
              <span className="text-orange-900 dark:text-orange-100 font-medium">
                ⚠️ Trial limit reached: {limits.usage.optimizations_count}/{limits.limits.max_optimizations}{" "}
                optimizations used
              </span>
            ) : (
              <span>
                📊 Free trial: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimizations used
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedProducts.size > 0 ? (
                <span className="text-primary">{selectedProducts.size} produit(s) sélectionné(s)</span>
              ) : (
                <span className="text-muted-foreground">Sélectionner tout</span>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => handleGenerateForSelected()} disabled={selectedProducts.size === 0 || generating} size="sm">
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Optimiser</span>
            </Button>
            <Button
              onClick={() => {
                // Check usage limits first
                if (!limits?.canUseOptimizations || limits?.limitReached?.optimizations) {
                  toast.error(t.seo.optimization.trialLimitReached);
                  setShowUpgradeDialog(true);
                  return;
                }
                // Show confirmation dialog
                setShowBulkOptimizeConfirmDialog(true);
              }}
              disabled={generating || notEnrichedCount === 0}
              variant="outline"
              size="sm"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Optimiser tout</span>
            </Button>
            <Button
              onClick={handleSyncSelected}
              disabled={selectedProducts.size === 0 || syncing}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Synchroniser</span>
            </Button>
            <Button
              onClick={() => {
                const toSync = products
                  .filter((p) => p.enrichment_status === "enriched" && !p.seo_synced_to_shopify)
                  .map((p) => p.id);
                handleSyncProducts(toSync);
              }}
              disabled={syncing || pendingSyncCount === 0}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Synchroniser tout</span>
            </Button>
            <Button onClick={fetchProducts} disabled={loading} variant="ghost" size="sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Large Search Bar and Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t.seo.optimization.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>

            <div className="relative flex-1 sm:flex-initial sm:w-[200px]">
              <Input
                placeholder="Filtrer par SKU..."
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                className="h-12"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-12 px-4 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
            >
              <option value="all">{t.seo.optimization.allCategories}</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder={t.seo.optimization.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.seo.optimization.allStatus}</SelectItem>
                <SelectItem value="optimized">{t.seo.optimization.optimizedTab}</SelectItem>
                <SelectItem value="not-optimized">{t.seo.optimization.toOptimize}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder={t.seo.optimization.syncStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.seo.optimization.allSync}</SelectItem>
                <SelectItem value="synced">{t.seo.optimization.synced}</SelectItem>
                <SelectItem value="not-synced">{t.seo.optimization.toSynchronize}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder={t.seo.optimization.seoQuality} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.seo.optimization.allQualities}</SelectItem>
                <SelectItem value="excellent">{t.seo.optimization.excellent}</SelectItem>
                <SelectItem value="good">{t.seo.optimization.good}</SelectItem>
                <SelectItem value="medium">{t.seo.optimization.medium}</SelectItem>
                <SelectItem value="poor">{t.seo.optimization.poor}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="flex items-center gap-2"
              >
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {viewMode === "grid" ? t.seo.optimization.list : t.seo.optimization.grid}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>{t.seo.optimization.filters}</span>
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleGenerateForSelected()}
                disabled={generating || selectedProducts.size === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
              >
                <Zap className="w-4 h-4" />
                {tf("seo.optimization.optimizeSelected", { count: selectedProducts.size })}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAll}
                disabled={generating || notEnrichedCount === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 shadow-lg hover:shadow-accent/50 border-accent/30 text-accent-foreground font-semibold transition-all duration-300"
              >
                <Sparkles className="w-4 h-4" />
                {t.seo.optimization.optimizeAll}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const toSync = products.filter((p) => selectedProducts.has(p.id) && p.seo_title && p.seo_description);
                  if (toSync.length === 0) {
                    toast.error(t.seo.optimization.noOptimizedProductsSelected);
                    return;
                  }
                  setProductsToSync(toSync);
                  setShowSyncDialog(true);
                }}
                disabled={syncing || selectedProducts.size === 0}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {tf("seo.optimization.syncSelection", { count: selectedProducts.size })}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const toSync = products.filter(
                    (p) =>
                      p.enrichment_status === "enriched" &&
                      p.seo_title &&
                      p.seo_description &&
                      !p.seo_synced_to_shopify,
                  );
                  if (toSync.length === 0) {
                    toast.info(t.seo.optimization.allOptimizedSynced);
                    return;
                  }
                  setProductsToSync(toSync);
                  setShowSyncDialog(true);
                }}
                disabled={syncing || pendingSyncCount === 0}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{tf("seo.optimization.syncAll", { count: pendingSyncCount })}</span>
              </Button>

              <Button variant="outline" size="icon" onClick={fetchProducts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="lg:hidden mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between p-3 rounded-md text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                  <Badge variant={activeTab === tab.id ? "secondary" : "outline"}>{tab.count}</Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Desktop Filters */}
      <div className="hidden lg:flex bg-background border rounded-lg p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? "secondary" : "outline"}>{tab.count}</Badge>
          </button>
        ))}
      </div>

      {/* Progress Indicator */}
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? t.seo.optimization.generatingSeo : t.seo.optimization.synchronizing}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products Table */}
      {viewMode === "list" ? (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">{t.seo.optimization.image}</TableHead>
                  <TableHead>{t.products.title}</TableHead>
                  <TableHead className="min-w-[350px]">Aperçu Google</TableHead>
                  <TableHead className="w-32">
                    <button
                      onClick={handleSeoScoreSortToggle}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {t.seo.optimization.seoScore}
                      {seoScoreSort === "none" && <ArrowUpDown className="w-4 h-4" />}
                      {seoScoreSort === "asc" && <ArrowUp className="w-4 h-4" />}
                      {seoScoreSort === "desc" && <ArrowDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-32">{t.seo.optimization.status}</TableHead>
                  <TableHead className="w-32">{t.seo.optimization.synced}</TableHead>
                  <TableHead className="w-24">{t.seo.optimization.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const seoScore = calculateDetailedSeoScore(
                    product.seo_title,
                    product.seo_description,
                    !!product.image_url,
                    true,
                    product.tags,
                    product.optimization_count,
                  );

                  return (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => handleSelectProduct(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium line-clamp-2">{product.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{product.vendor}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GoogleSearchPreviewCell product={product} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const scoreBadge = getSeoScoreBadge(seoScore.score);
                              return (
                                <span className={`text-2xl font-bold ${scoreBadge.color}`}>
                                  {Math.round(seoScore.score)}%
                                </span>
                              );
                            })()}
                            {product.optimization_count && product.optimization_count > 0 && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                          </div>
                          {(() => {
                            const scoreBadge = getSeoScoreBadge(seoScore.score);
                            return (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-muted-foreground">{scoreBadge.label}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.enrichment_status === "enriched" ? "default" : "secondary"} className="text-xs">
                          {product.enrichment_status === "enriched" ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t.seo.optimization.optimizedTab}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              {t.seo.optimization.pending}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.seo_synced_to_shopify ? (
                          <Badge variant="default" className="bg-green-600 text-white text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t.seo.optimization.yes}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {t.seo.optimization.no}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              if (!canDoAction('optimizations')) {
                                toast.error("Limite atteinte", {
                                  description: `Vous avez atteint votre limite mensuelle de ${limits.limits.max_optimizations} optimisations.`,
                                });
                                setShowUpgradeDialog(true);
                                return;
                              }
                              // Optimiser directement ce produit
                              handleGenerateForSelected([product.id]);
                            }}
                            disabled={generating}
                            title={t.seo.optimization.optimize}
                            className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProductsToSync([product]);
                              setShowSyncDialog(true);
                            }}
                            disabled={!product.seo_title || !product.seo_description}
                            title={t.seo.optimization.viewSync}
                            className="hover:bg-gray-50"
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProducts.map((product) => {
            const seoScore = calculateDetailedSeoScore(
              product.seo_title,
              product.seo_description,
              !!product.image_url,
              true,
              product.tags,
              product.optimization_count,
            );

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition">
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => handleSelectProduct(product.id)}
                      className="bg-background shadow-lg"
                    />
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-2 mb-1">{product.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.vendor && <span>{product.vendor}</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.seo.optimization.seoTitle}</p>
                      {product.seo_title ? (
                        <p className="text-sm line-clamp-2">{product.seo_title}</p>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t.seo.optimization.notOptimizedBadge}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t.seo.optimization.seoDescription}
                      </p>
                      {product.seo_description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{product.seo_description}</p>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t.seo.optimization.notOptimizedBadge}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const scoreBadge = getSeoScoreBadge(seoScore.score);
                          return (
                            <span className={`text-xl font-bold ${scoreBadge.color}`}>
                              {Math.round(seoScore.score)}%
                            </span>
                          );
                        })()}
                      </div>
                      {(() => {
                        const scoreBadge = getSeoScoreBadge(seoScore.score);
                        return (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-muted-foreground">{scoreBadge.label}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProductsToSync([product]);
                        setShowSyncDialog(true);
                      }}
                      disabled={!product.seo_title || !product.seo_description}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t.seo.optimization.view}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={previousPage}
                  className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => goToPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <PaginationEllipsis key={page} />;
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={nextPage}
                  className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="seo"
        operation={syncing ? "syncing" : "optimizing"}
        current={progress.current}
        total={progress.total}
      />

      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="seo"
        items={optimizedProducts}
        onSyncClick={() => {
          setShowResultsDialog(false);
          const productsWithSeo = optimizedProducts.filter((p) => p.seo_title || p.seo_description);
          if (productsWithSeo.length > 0) {
            setProductsToSync(productsWithSeo);
            setShowSyncDialog(true);
          }
        }}
        onClose={handleCloseResultsDialog}
      />

      {/* Sync Confirmation Dialog */}
      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        type="seo"
        itemCount={productsToSync.length}
        onConfirm={async () => {
          setSyncing(true);
          const productIds = productsToSync.map((p) => p.id);
          await handleSyncProducts(productIds);
          setShowSyncDialog(false);
          setProductsToSync([]);
          setSyncing(false);
        }}
        loading={syncing}
      />

      {/* Shopify Sync Success Dialog */}
      <ShopifySyncSuccessDialog items={syncedItems} onClose={() => setSyncedItems([])} />

      {/* Bulk Optimization Confirmation Dialog */}
      <OptimizationConfirmDialog
        open={showBulkOptimizeConfirmDialog}
        onOpenChange={setShowBulkOptimizeConfirmDialog}
        onConfirm={() => {
          setActiveTab("not-enriched");
          setTimeout(() => {
            handleGenerateAllSeo();
          }, 100);
        }}
        selectedCount={notEnrichedCount}
        currentUsage={limits?.usage.optimizations_count || 0}
        maxOptimizations={limits?.limits.max_optimizations || 0}
        isTrialing={limits?.isTrialing || false}
      />

      {limits?.shouldForcePayment ? (
        <TrialLimitDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
          currentUsage={limits?.usage.optimizations_count || 0}
          maxUsage={limits?.limits.max_optimizations || 0}
          trialMaxUsage={limits?.isTrialing ? limits?.limits.max_optimizations : undefined}
        />
      ) : (
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
          usage={limits?.usage.optimizations_count}
          limit={limits?.limits.max_optimizations}
        />
      )}
    </div>
  );
}
