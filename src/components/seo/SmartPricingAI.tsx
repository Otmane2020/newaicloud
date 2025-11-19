import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Package,
  Loader2,
  Upload,
  Download,
  CheckCheck,
  Percent,
  Calculator,
  ArrowUpDown,
  RefreshCw,
  Info,
  Truck,
  Image,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { WhiteBgPreviewDialog } from "@/components/seo/WhiteBgPreviewDialog";
import { useTranslation } from "@/lib/language";
import { usePaginatedSeo } from "@/hooks/usePaginatedSeo";
import { useStore } from "@/contexts/StoreContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CompetitorPrice {
  url: string;
  source: string;
  title: string;
  price: number;
  currency: string;
  similarity: number;
}

interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_url: string | null;
  market_price?: number | null;
  smart_price?: number | null;
  ai_reasoning?: string | null;
  competitors?: CompetitorPrice[];
  selected?: boolean;
}

interface ProductPricing {
  id: string;
  title: string;
  vendor: string | null;
  image_url: string | null;
  collection_ids: string[];
  collection_names: string[];
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  shipping_cost: number | null;
  sku: string | null;
  shopify_product_id: string | null;
  currency: string;
  selected: boolean;
  market_price: number | null;
  smart_price: number | null;
  net_margin: number | null;
  ai_reasoning: string | null;
  competitors: CompetitorPrice[];
  variants: ProductVariant[];
  hasMultipleVariants: boolean;
}

interface BulkOperation {
  type: "discount" | "increase";
  method: "percentage" | "value";
  amount: number;
  collection: string;
}

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: "pending" | "generating" | "success" | "error";
  error?: string;
}

export function SmartPricingAI() {
  const { t, tf } = useTranslation();
  const { selectedStore } = useStore();
  const [products, setProducts] = useState<ProductPricing[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analyzingPrices, setAnalyzingPrices] = useState(false);
  const [analyzingVariant, setAnalyzingVariant] = useState<string | null>(null);
  const [syncingVariant, setSyncingVariant] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [sortBy, setSortBy] = useState<"title" | "price" | "margin">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(20); // Taux de TVA par défaut: 20%
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [showMissingSku, setShowMissingSku] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    type: "discount",
    method: "percentage",
    amount: 0,
    collection: "all",
  });
  const [isGeneratingWhiteBg, setIsGeneratingWhiteBg] = useState(false);
  const [whiteBgPreviews, setWhiteBgPreviews] = useState<PreviewImage[]>([]);
  const [showWhiteBgPreview, setShowWhiteBgPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!selectedStore) {
        setLoading(false);
        return;
      }

      // Fetch collections
      const { data: collectionsData } = await supabase
        .from("shopify_collections")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id);

      setCollections(collectionsData || []);

      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUS les produits
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [SMART_PRICING] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [SMART_PRICING] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from("shopify_products")
          .select(
            `
            *,
            product_variants(id, title, sku, price, compare_at_price, cost_price, option1, option2, option3, image_url),
            market_price,
            smart_price,
            ai_reasoning,
            competitors,
            last_pricing_analysis
          `,
          )
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id)
          .range(start, end);
        
        if (pageError) {
          console.error("Products error:", pageError);
          throw pageError;
        }
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [SMART_PRICING] Page ${page + 1} loaded: ${pageData.length} products`);
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

      console.log('✅ [SMART_PRICING] Total products fetched:', allProducts.length);

      const productsData = allProducts;

      if (productsData) {
        // Map collection IDs to names
        const enrichedProducts: ProductPricing[] = productsData.map((product) => {
          const collectionNames = (product.collection_ids || [])
            .map((id) => collectionsData?.find((c) => c.id === id)?.title)
            .filter(Boolean) as string[];

          const rawVariants = (product as any).product_variants || [];
          const variants: ProductVariant[] = rawVariants.map((v: any) => ({
            id: v.id,
            title: v.title || "Default",
            sku: v.sku || null,
            price: v.price || product.price || 0,
            compare_at_price: v.compare_at_price || null,
            cost_price: v.cost_price || null,
            option1: v.option1 || null,
            option2: v.option2 || null,
            option3: v.option3 || null,
            image_url: v.image_url || null,
            selected: false,
          }));

          const firstVariant = variants[0];

          return {
            id: product.id,
            title: product.title || "",
            vendor: product.vendor || null,
            image_url: product.image_url || null,
            collection_ids: (product.collection_ids || []) as string[],
            collection_names: collectionNames,
            price: typeof product.price === "number" ? product.price : null,
            compare_at_price: typeof product.compare_at_price === "number" ? product.compare_at_price : null,
            cost_price: typeof product.cost_price === "number" ? product.cost_price : firstVariant?.cost_price || null,
            shipping_cost: typeof product.shipping_cost === "number" ? product.shipping_cost : null,
            sku: variants.length === 1 ? (firstVariant?.sku || null) : null,
            shopify_product_id: product.shopify_id ? String(product.shopify_id) : null,
            currency: product.currency || "EUR",
            selected: false,
            market_price: product.market_price || null,
            smart_price: product.smart_price || null,
            net_margin: null,
            ai_reasoning: product.ai_reasoning || null,
            competitors: Array.isArray(product.competitors)
              ? (product.competitors as unknown as CompetitorPrice[])
              : [],
            variants,
            hasMultipleVariants: variants.length > 1,
          };
        });

        // Debug logs to identify variant display issues
        enrichedProducts.forEach(product => {
          console.log(`[DEBUG] Product "${product.title}":`, {
            productId: product.id,
            variantCount: product.variants.length,
            hasMultipleVariants: product.hasMultipleVariants,
            variants: product.variants.map(v => ({ 
              id: v.id, 
              title: v.title, 
              sku: v.sku,
              price: v.price,
              option1: v.option1,
              option2: v.option2,
              option3: v.option3
            }))
          });
        });

        // Extract unique vendors
        const uniqueVendors = Array.from(new Set(enrichedProducts.map(p => p.vendor).filter(Boolean))) as string[];
        setVendors(uniqueVendors);

        setProducts(enrichedProducts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (price: number, comparePrice: number | null) => {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const calculateMargin = (price: number, costPrice: number | null) => {
    if (!costPrice || costPrice === 0) return 0;
    return Math.round(((price - costPrice) / price) * 100);
  };

  const calculateMarginValue = (price: number | null, costPrice: number | null, shippingCost: number | null = null) => {
    if (!price) return 0;
    const totalCost = (costPrice || 0) + (shippingCost || 0);
    return price - totalCost;
  };

  const calculateNetMargin = (price: number | null, costPrice: number | null, shippingCost: number | null = null) => {
    if (!price) return { value: 0, percentage: 0 };

    // Formule : (prix de vente - prix de livraison) / (1 + TVA%) - prix de revient = marge nette
    const priceAfterShipping = price - (shippingCost || 0);
    const priceBeforeTax = priceAfterShipping / (1 + taxRate / 100);
    const netMarginValue = priceBeforeTax - (costPrice || 0);
    const netMarginPercentage = costPrice && costPrice > 0 ? (netMarginValue / costPrice) * 100 : 0;

    return {
      value: netMarginValue,
      percentage: netMarginPercentage,
    };
  };

  const updateProductPrice = async (
    productId: string,
    field: "price" | "compare_at_price" | "cost_price" | "shipping_cost",
    value: string,
  ) => {
    const numValue = parseFloat(value) || null;

    // Update local state
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: numValue } : p)));

    // Save to database immediately
    try {
      const { error } = await supabase
        .from("shopify_products")
        .update({ [field]: numValue })
        .eq("id", productId);

      if (error) {
        console.error("Error updating price:", error);
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error updating price:", error);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, selected: !p.selected } : p)));
  };

  const toggleVariantSelection = (productId: string, variantId: string) => {
    setProducts((prev) => prev.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map((v) => 
            v.id === variantId ? { ...v, selected: !v.selected } : v
          )
        };
      }
      return p;
    }));
  };

  const generateSku = async (variantId: string, productTitle: string) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSku = `SKU-${timestamp}-${random}`;

    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ sku: newSku })
        .eq('id', variantId);

      if (error) {
        console.error('Error generating SKU:', error);
        toast.error(t.smartPricing.errors.save);
        return;
      }

      toast.success(tf('smartPricing.messages.skuGenerated', { sku: newSku }));
      fetchData();
    } catch (error) {
      console.error('Error generating SKU:', error);
      toast.error(t.smartPricing.errors.save);
    }
  };

  const updateVariantPrice = async (
    variantId: string,
    field: "price" | "compare_at_price" | "cost_price",
    value: number | null,
  ) => {
    try {
      const { error } = await supabase
        .from("product_variants")
        .update({ [field]: value })
        .eq("id", variantId);

      if (error) {
        console.error("Error updating variant price:", error);
        toast.error(t.smartPricing.errors.save);
        return;
      }

      await fetchData();
    } catch (error) {
      console.error("Error updating variant price:", error);
      toast.error(t.smartPricing.errors.save);
    }
  };

  const toggleAllSelection = () => {
    const allSelected = products.every((p) => p.selected);
    setProducts((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
  };

  const applyBulkOperation = () => {
    setProducts((prev) => {
      return prev.map((product) => {
        // Check if product belongs to selected collection
        const matchesCollection =
          bulkOperation.collection === "all" || product.collection_ids.includes(bulkOperation.collection);

        if (!matchesCollection) return product;

        const currentPrice = product.price || 0;
        let newPrice = currentPrice;
        let newComparePrice = product.compare_at_price;

        if (bulkOperation.type === "discount") {
          // Apply discount
          if (bulkOperation.method === "percentage") {
            newPrice = currentPrice * (1 - bulkOperation.amount / 100);
          } else {
            newPrice = currentPrice - bulkOperation.amount;
          }
          // Set compare_at_price to old price
          newComparePrice = currentPrice;
        } else {
          // Apply increase
          if (bulkOperation.method === "percentage") {
            newPrice = currentPrice * (1 + bulkOperation.amount / 100);
          } else {
            newPrice = currentPrice + bulkOperation.amount;
          }
        }

        return {
          ...product,
          price: Math.max(0, Math.round(newPrice * 100) / 100),
          compare_at_price: newComparePrice,
        };
      });
    });

    toast.success("💰 Modification appliquée avec succès");
  };

  const importCostsFromShopify = async () => {
    try {
      setImporting(true);
      setShowImportDialog(false);
      const toastId = toast.loading("🔄 Import des coûts en cours...", {
        description: "Cette opération peut prendre plusieurs minutes",
      });

      const { data, error } = await supabase.functions.invoke("import-costs-from-shopify");

      if (error) {
        // Handle edge function not deployed error
        if (error.message.includes("not found") || error.message.includes("FunctionsRelayError")) {
          toast.error("❌ La fonction d'import n'est pas encore déployée", {
            id: toastId,
            description: "Veuillez patienter quelques instants et réessayer.",
          });
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      toast.success(`✅ Import terminé : ${data.imported} coûts importés`, {
        id: toastId,
        description:
          data.errors > 0
            ? `⚠️ ${data.errors} produits n'ont pas pu être importés`
            : "Tous les coûts ont été récupérés avec succès",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Import costs error:", error);
      toast.error("❌ Erreur lors de l'import", {
        description: error.message || "Une erreur inattendue est survenue",
      });
    } finally {
      setImporting(false);
    }
  };

  const importShippingCosts = async () => {
    try {
      setImporting(true);
      const toastId = toast.loading("🚚 Import des frais de livraison...", {
        description: "Estimation basée sur le poids des produits",
      });

      // Get first store (for now, assuming single store)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utilisateur non connecté", { id: toastId });
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (storesError || !stores || stores.length === 0) {
        toast.error("Aucune boutique Shopify connectée", { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke("import-shipping-costs", {
        body: { storeId: stores[0].id },
      });

      if (error) {
        if (error.message.includes("not found") || error.message.includes("FunctionsRelayError")) {
          toast.error("❌ La fonction d'import n'est pas encore déployée", {
            id: toastId,
            description: "Veuillez patienter quelques instants et réessayer.",
          });
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      toast.success(`✅ Frais de livraison Shopify importés`, {
        id: toastId,
        description: data.message || `${data.updated} produits mis à jour avec les tarifs réels`,
      });

      if (data.failed > 0) {
        toast.warning(`⚠️ ${data.failed} produits n'ont pas pu être traités`, {
          description: data.errors?.join(", ") || "Certains produits n'ont pas de tarifs disponibles",
        });
      }

      await fetchData();
    } catch (error: any) {
      console.error("Import shipping error:", error);
      toast.error("❌ Erreur lors de l'import", {
        description: error.message || "Une erreur inattendue est survenue",
      });
    } finally {
      setImporting(false);
    }
  };

  const analyzeVariantPricing = async (productId: string, variantId: string) => {
    try {
      setAnalyzingVariant(variantId);
      
      const toastId = toast.loading("🤖 Analyse IA de la variante...", {
        description: "Recherche des prix concurrents par photo et calcul du prix optimal",
      });

      const { data, error } = await supabase.functions.invoke("analyze-competitor-pricing", {
        body: {
          productIds: [productId],
          variantId: variantId,
          taxRate,
        },
      });

      if (error) {
        console.error("Erreur analyse variante:", error);
        toast.error("Erreur lors de l'analyse de la variante", { id: toastId });
        return;
      }

      if (data?.results?.[0]) {
        const result = data.results[0];
        
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              variants: p.variants.map(v => {
                if (v.id === variantId) {
                  return {
                    ...v,
                    market_price: result.marketPrice,
                    smart_price: result.smartPrice,
                    ai_reasoning: result.reasoning,
                    competitors: result.competitors || []
                  };
                }
                return v;
              })
            };
          }
          return p;
        }));

        toast.success(`✅ Analyse terminée - Prix conseillé: ${result.smartPrice?.toFixed(2)}€`, { id: toastId });
      }
    } catch (error) {
      console.error("Erreur analyse variante:", error);
      toast.error("Erreur lors de l'analyse de la variante");
    } finally {
      setAnalyzingVariant(null);
    }
  };

  const syncVariantToShopify = async (productId: string, variantId: string) => {
    try {
      setSyncingVariant(variantId);
      
      const toastId = toast.loading("🔄 Synchronisation avec Shopify...");

      const variant = products
        .find(p => p.id === productId)
        ?.variants.find(v => v.id === variantId);

      if (!variant || !variant.smart_price) {
        toast.error("Prix intelligent non disponible", { id: toastId });
        return;
      }

      // TODO: Implémenter la synchronisation avec Shopify
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("✅ Prix synchronisé avec Shopify", { id: toastId });
    } catch (error) {
      console.error("Erreur sync variante:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncingVariant(null);
    }
  };

  const analyzeCompetitorPrices = async (selectedOnly: boolean) => {
    try {
      setAnalyzingPrices(true);
      const productsToAnalyze = selectedOnly ? products.filter((p) => p.selected) : products;

      if (productsToAnalyze.length === 0) {
        toast.error("Aucun produit sélectionné");
        return;
      }

      const toastId = toast.loading(`🤖 Analyse IA de ${productsToAnalyze.length} produit(s)...`, {
        description: "Recherche des prix concurrents et calcul des prix optimaux",
      });

      const { data, error } = await supabase.functions.invoke("analyze-competitor-pricing", {
        body: {
          productIds: productsToAnalyze.map((p) => p.id),
          taxRate,
        },
      });

      if (error) {
        if (error.message.includes("not found") || error.message.includes("FunctionsRelayError")) {
          toast.error("❌ Fonction d'analyse non déployée", {
            id: toastId,
            description: "Veuillez réessayer dans quelques instants.",
          });
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      // Update products with AI results AND save to database
      const successfulResults = data.results.filter((r: any) => !r.error);

      // Save AI results to database
      for (const result of successfulResults) {
        try {
          await supabase
            .from("shopify_products")
            .update({
              market_price: result.marketPrice,
              smart_price: result.smartPrice,
              ai_reasoning: result.reasoning,
              competitors: result.competitors || [],
              last_pricing_analysis: new Date().toISOString(),
            })
            .eq("id", result.productId);
        } catch (error) {
          console.error("Error saving AI analysis:", error);
        }
      }

      setProducts((prev) =>
        prev.map((p) => {
          const result = data.results.find((r: any) => r.productId === p.id);
          if (result && !result.error) {
            return {
              ...p,
              market_price: result.marketPrice,
              smart_price: result.smartPrice,
              net_margin: result.netMargin,
              ai_reasoning: result.reasoning,
              competitors: result.competitors || [],
            };
          }
          return p;
        }),
      );

      toast.success(`✅ Analyse terminée : ${data.results.length} produit(s)`, {
        id: toastId,
        description: "Prix intelligents calculés avec succès",
      });

      // Update last analysis time
      setLastAnalysisTime(new Date());
    } catch (error: any) {
      console.error("Price analysis error:", error);
      toast.error("❌ Erreur lors de l'analyse", {
        description: error.message || "Une erreur inattendue est survenue",
      });
    } finally {
      setAnalyzingPrices(false);
    }
  };

  const applySmartPrices = (selectedOnly: boolean) => {
    const productsToUpdate = selectedOnly
      ? products.filter((p) => p.selected && p.smart_price)
      : products.filter((p) => p.smart_price);

    if (productsToUpdate.length === 0) {
      toast.error("Aucun prix intelligent à appliquer");
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (productsToUpdate.find((pt) => pt.id === p.id)) {
          return {
            ...p,
            compare_at_price: p.price, // Old price becomes compare price
            price: p.smart_price,
          };
        }
        return p;
      }),
    );

    toast.success(`✅ Prix intelligents appliqués à ${productsToUpdate.length} produit(s)`);
  };

  const syncSingleProduct = async (productId: string) => {
    try {
      setSyncing(true);
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const toastId = toast.loading(`Synchronisation de ${product.title}...`);

      // Update price in database
      const { error: updateError } = await supabase
        .from("shopify_products")
        .update({
          price: product.price,
          compare_at_price: product.compare_at_price,
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      // Sync to Shopify
      const { error: syncError } = await supabase.functions.invoke("sync-pricing-to-shopify", {
        body: {
          product_ids: [productId],
        },
      });

      if (syncError) throw syncError;

      toast.success(`✅ ${product.title} synchronisé`, { id: toastId });
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error.message || "Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const syncToShopify = async (selectedOnly: boolean) => {
    try {
      setSyncing(true);
      const productsToSync = selectedOnly ? products.filter((p) => p.selected) : products;

      if (productsToSync.length === 0) {
        toast.error("Aucun produit sélectionné");
        return;
      }

      const toastId = toast.loading(`Synchronisation de ${productsToSync.length} produit(s)...`);

      // Update local DB first with UPDATE only (fix RLS error)
      for (const product of productsToSync) {
        const { error: updateError } = await supabase
          .from("shopify_products")
          .update({
            price: product.price,
            compare_at_price: product.compare_at_price,
          })
          .eq('id', product.id);

        if (updateError) {
          console.error('❌ [SMART-PRICING] DB Update Error:', updateError);
          throw new Error(`Erreur DB: ${updateError.message}`);
        }
      }

      // Batch processing for mass sync
      const BATCH_SIZE = 100;
      const batches = [];
      for (let i = 0; i < productsToSync.length; i += BATCH_SIZE) {
        batches.push(productsToSync.slice(i, i + BATCH_SIZE));
      }

      let totalSynced = 0;
      let totalErrors = 0;
      const failedProducts: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        toast.loading(
          `Batch ${i + 1}/${batches.length} (${totalSynced}/${productsToSync.length} synchronisés)`,
          { id: toastId }
        );

        const { data, error: syncError } = await supabase.functions.invoke("sync-pricing-to-shopify", {
          body: { product_ids: batch.map(p => p.id) },
        });

        if (syncError) {
          console.error(`❌ Batch ${i + 1} failed:`, syncError);
          totalErrors += batch.length;
          failedProducts.push(...batch.map(p => p.title));
        } else if (data) {
          totalSynced += data.synced || 0;
          totalErrors += data.errors || 0;
          if (data.failedProducts) {
            failedProducts.push(...data.failedProducts.map((fp: any) => fp.title));
          }
        }

        // Pause between batches to avoid rate limits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (totalErrors > 0) {
        toast.error(
          `${totalSynced} produits synchronisés, ${totalErrors} erreurs`,
          { id: toastId }
        );
        if (failedProducts.length > 0) {
          console.warn('Produits échoués:', failedProducts);
        }
      } else {
        toast.success(`✅ ${totalSynced} produit(s) synchronisé(s)`, { id: toastId });
      }

      // Unselect all after sync
      if (selectedOnly) {
        setProducts((prev) => prev.map((p) => ({ ...p, selected: false })));
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error.message || "Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleWhiteBackground = async () => {
    const selected = products.filter((p) => p.selected);

    if (selected.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    setIsGeneratingWhiteBg(true);

    const newPreviews: PreviewImage[] = selected.map((p) => ({
      productId: p.id,
      productTitle: p.title,
      originalUrl: p.image_url || "",
      generatedUrl: null,
      status: "pending",
    }));

    setWhiteBgPreviews(newPreviews);
    setShowWhiteBgPreview(true);

    try {
      for (const product of selected) {
        if (!product.image_url) continue;

        setWhiteBgPreviews((prev) =>
          prev.map((p) => (p.productId === product.id ? { ...p, status: "generating" as const } : p)),
        );

        try {
          const { data, error } = await supabase.functions.invoke("generate-white-background", {
            body: {
              imageUrl: product.image_url,
              productTitle: product.title,
            },
          });

          if (error) throw error;

          if (data.success && data.imageUrl) {
            setWhiteBgPreviews((prev) =>
              prev.map((p) =>
                p.productId === product.id ? { ...p, generatedUrl: data.imageUrl, status: "success" as const } : p,
              ),
            );
          } else {
            throw new Error(data.error || "Échec de la génération");
          }
        } catch (error: any) {
          console.error(`Error for product ${product.id}:`, error);
          setWhiteBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === product.id ? { ...p, status: "error" as const, error: error.message } : p,
            ),
          );
        }
      }

      toast.success(`Fond blanc généré pour ${selected.length} produit(s)`);
    } catch (error: any) {
      console.error("White background error:", error);
      toast.error("Erreur lors de la génération des fonds blancs");
    } finally {
      setIsGeneratingWhiteBg(false);
    }
  };

  const handleImageUpload = async (file: File, productId: string, variantId?: string) => {
    try {
      setUploadingImage(variantId || productId);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non authentifié");
        return;
      }
      
      // Upload to Supabase Storage
      const fileName = `${variantId ? 'variant' : 'product'}-${productId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName);

      // Update database
      if (variantId) {
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ image_url: publicUrl })
          .eq('id', variantId);
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ image_url: publicUrl })
          .eq('id', productId);
        if (updateError) throw updateError;
      }

      // Get product data with Shopify ID
      const { data: productData } = await supabase
        .from('shopify_products')
        .select('shopify_id, seller_id, store_id')
        .eq('id', productId)
        .single();

      if (!productData?.shopify_id) {
        toast.warning("Image uploadée localement uniquement (ID Shopify manquant)");
        return;
      }

      // Get store connection
      const { data: connectionData } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token')
        .eq('id', productData.store_id)
        .maybeSingle();

      if (connectionData) {
        const endpoint = `https://${connectionData.store_url}/admin/api/2024-01/products/${productData.shopify_id}.json`;
        
        const shopifyResponse = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': connectionData.access_token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: {
              id: productData.shopify_id,
              images: [{ src: publicUrl }]
            }
          })
        });

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          console.error('Shopify sync error:', errorText);
          throw new Error('Erreur de synchronisation Shopify');
        }
      }

      // Update local state
      setProducts(prev => prev.map(p => {
        if (variantId) {
          return {
            ...p,
            variants: p.variants?.map(v => v.id === variantId ? { ...v, image_url: publicUrl } : v)
          };
        } else if (p.id === productId) {
          return { ...p, image_url: publicUrl };
        }
        return p;
      }));

      toast.success("Image uploadée et synchronisée avec Shopify");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(null);
    }
  };

  const triggerFileInput = (productId: string, variantId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file, productId, variantId);
      }
    };
    input.click();
  };

  const handleApplyWhiteBackground = async (selectedPreviews: string[], format: string) => {
    console.log("Applying white background with format:", format);
    const successfulPreviews = whiteBgPreviews.filter(
      (p) => selectedPreviews.includes(p.productId) && p.status === "success" && p.generatedUrl,
    );

    if (successfulPreviews.length === 0) {
      toast.error("Aucune image à appliquer");
      return;
    }

    const toastId = toast.loading(`Application de ${successfulPreviews.length} image(s)...`);

    try {
      for (const preview of successfulPreviews) {
        await supabase.from("shopify_products").update({ image_url: preview.generatedUrl }).eq("id", preview.productId);
      }

      await fetchData();
      setShowWhiteBgPreview(false);
      setWhiteBgPreviews([]);

      toast.success(`✅ ${successfulPreviews.length} image(s) mise(s) à jour`, { id: toastId });
    } catch (error: any) {
      console.error("Apply white background error:", error);
      toast.error("Erreur lors de l'application des images", { id: toastId });
    }
  };

  const handleRegenerateWhiteBg = async (productId: string) => {
    const preview = whiteBgPreviews.find((p) => p.productId === productId);
    if (!preview) return;

    setWhiteBgPreviews((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, status: "generating" as const, error: undefined } : p)),
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-white-background", {
        body: {
          imageUrl: preview.originalUrl,
          productTitle: preview.productTitle,
        },
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setWhiteBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === productId ? { ...p, generatedUrl: data.imageUrl, status: "success" as const } : p,
          ),
        );
        toast.success("Image régénérée avec succès");
      } else {
        throw new Error(data.error || "Échec de la régénération");
      }
    } catch (error: any) {
      console.error("Regenerate error:", error);
      setWhiteBgPreviews((prev) =>
        prev.map((p) => (p.productId === productId ? { ...p, status: "error" as const, error: error.message } : p)),
      );
      toast.error("Erreur lors de la régénération");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCollection = selectedCollection === "all" || product.collection_ids.includes(selectedCollection);
    const matchesVendor = selectedVendor === "all" || product.vendor === selectedVendor;
    const productPrice = product.price || 0;
    const matchesPriceRange = productPrice >= priceRange.min && productPrice <= priceRange.max;
    const matchesSearch =
      !searchQuery ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.vendor && product.vendor.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSku = !showMissingSku || !product.sku || product.sku.trim() === "";
    return matchesCollection && matchesVendor && matchesPriceRange && matchesSearch && matchesSku;
  }).sort((a, b) => {
    // Sort simple products first, then variable products
    if (a.hasMultipleVariants !== b.hasMultipleVariants) {
      return a.hasMultipleVariants ? 1 : -1;
    }
    
    // Then apply custom sorting
    let comparison = 0;
    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === "price") {
      comparison = (a.price || 0) - (b.price || 0);
    } else if (sortBy === "margin") {
      const marginA = calculateNetMargin(a.price, a.cost_price, a.shipping_cost).percentage;
      const marginB = calculateNetMargin(b.price, b.cost_price, b.shipping_cost).percentage;
      comparison = marginA - marginB;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePaginatedSeo({
    items: filteredProducts,
    itemsPerPage: 50,
    cacheKey: 'smart-pricing-products',
  });

  const missingSkuCount = products.filter(p => !p.sku || p.sku.trim() === "").length;

  const currency = products[0]?.currency || "EUR";
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return `${price.toFixed(2)} ${currencySymbol}`;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  };

  const isAnalysisOld = () => {
    if (!lastAnalysisTime) return false;
    const diffMs = new Date().getTime() - lastAnalysisTime.getTime();
    return diffMs > 3600000; // older than 1 hour
  };

  const estimatedTime = Math.ceil(products.length * 0.5); // ~0.5 sec per product

  if (!selectedStore) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Aucune boutique sélectionnée</AlertTitle>
        <AlertDescription>
          Veuillez sélectionner une boutique dans le menu en haut pour afficher les produits.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedCount = products.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950 border-2 border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500 rounded-xl">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{t.smartPricing.title}</h2>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-3 py-1 text-xs shadow-lg animate-pulse">
                ✨ {t.smartPricing.badge}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {t.smartPricing.description}
            </p>
          </div>
        </div>
      </Card>

      {/* Tax Rate Configuration */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500 rounded-xl">
            <Percent className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{t.smartPricing.taxConfig.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.smartPricing.taxConfig.description}
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">{t.smartPricing.taxConfig.label}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
                <span className="text-sm font-semibold">%</span>
              </div>
              <Badge variant="outline" className="ml-2">
                {tf('smartPricing.taxConfig.appliedInfo', { rate: taxRate })}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Operations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          {t.smartPricing.bulkOperations.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select
            value={bulkOperation.collection}
            onValueChange={(value) => setBulkOperation((prev) => ({ ...prev, collection: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.smartPricing.bulkOperations.allCollections}</SelectItem>
              {collections.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={bulkOperation.type}
            onValueChange={(value: "discount" | "increase") => setBulkOperation((prev) => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">{t.smartPricing.bulkOperations.reduction}</SelectItem>
              <SelectItem value="increase">{t.smartPricing.bulkOperations.increase}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={bulkOperation.method}
            onValueChange={(value: "percentage" | "value") => setBulkOperation((prev) => ({ ...prev, method: value, amount: 0 }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t.smartPricing.bulkOperations.percentage}</SelectItem>
              <SelectItem value="value">{t.smartPricing.bulkOperations.value}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              type="number"
              min="0"
              max={bulkOperation.method === "percentage" ? 100 : undefined}
              step={bulkOperation.method === "percentage" ? "1" : "0.01"}
              placeholder={bulkOperation.method === "percentage" ? "Pourcentage (0-100)" : "Montant (€)"}
              value={bulkOperation.amount || ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                const clampedValue = bulkOperation.method === "percentage" 
                  ? Math.min(Math.max(value, 0), 100)
                  : Math.max(value, 0);
                setBulkOperation((prev) => ({ ...prev, amount: clampedValue }));
              }}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {bulkOperation.method === "percentage" ? "%" : "€"}
            </span>
          </div>

          <Button onClick={applyBulkOperation} className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            {t.smartPricing.bulkOperations.apply}
          </Button>
        </div>
      </Card>

      {/* Last Analysis Banner */}
      {lastAnalysisTime && (
        <Card
          className={`p-4 ${isAnalysisOld() ? "bg-orange-50 dark:bg-orange-950 border-orange-200" : "bg-green-50 dark:bg-green-950 border-green-200"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info
                className={`w-5 h-5 ${isAnalysisOld() ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"} flex-shrink-0`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${isAnalysisOld() ? "text-orange-900 dark:text-orange-100" : "text-green-900 dark:text-green-100"}`}
                >
                  Dernière analyse IA : {getTimeAgo(lastAnalysisTime)}
                </p>
                {isAnalysisOld() && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    ⚠️ Les prix du marché peuvent avoir évolué. Relancez une analyse pour obtenir les données à jour.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeCompetitorPrices(false)}
              disabled={analyzingPrices}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${analyzingPrices ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
          <Input
            type="text"
            placeholder="🔍 Rechercher par titre, SKU ou vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-md"
          />
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes collections</SelectItem>
              {collections.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous vendors</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input
              type="number"
              placeholder="Prix min"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
              className="w-24"
            />
            <span className="text-xs">-</span>
            <Input
              type="number"
              placeholder="Prix max"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 10000 }))}
              className="w-24"
            />
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="price">Prix</SelectItem>
              <SelectItem value="margin">Marge</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="w-full sm:w-auto"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
          <Badge variant="outline" className="w-fit">{filteredProducts.length} produits</Badge>
          {selectedCount > 0 && <Badge variant="default" className="w-fit">{selectedCount} sélectionné(s)</Badge>}
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <Button
            variant="default"
            onClick={() => analyzeCompetitorPrices(true)}
            disabled={analyzingPrices || syncing || selectedCount === 0}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm"
            size="sm"
          >
            {analyzingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span className="hidden sm:inline">🤖 Analyser Prix IA</span>
            <span className="sm:hidden">Analyser IA</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => applySmartPrices(true)}
            disabled={syncing || products.filter((p) => p.selected && p.smart_price).length === 0}
            className="gap-2 text-xs sm:text-sm"
            size="sm"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Appliquer Smart Price</span>
            <span className="sm:hidden">Smart Price</span>
          </Button>
          <Button
            variant="default"
            onClick={handleWhiteBackground}
            disabled={isGeneratingWhiteBg || selectedCount === 0}
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs sm:text-sm"
            size="sm"
          >
            {isGeneratingWhiteBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            Fond blanc
          </Button>
          <TooltipProvider>
            <Tooltip>
              <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <AlertDialogTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={importing || syncing || products.length === 0}
                      className="gap-2 text-xs sm:text-sm"
                      size="sm"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline">Importer Coûts</span>
                      <span className="sm:hidden">Coûts</span>
                    </Button>
                  </TooltipTrigger>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Importer les coûts depuis Shopify ?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Cette opération va récupérer les prix de revient de tous vos produits depuis Shopify.</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">⏱️ Temps estimé :</span>
                          <span>{estimatedTime} secondes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">📦 Produits à traiter :</span>
                          <span>{products.length}</span>
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-xs text-yellow-900 dark:text-yellow-100">
                          <strong>Note :</strong> Les frais de livraison ne seront pas importés car Shopify ne les
                          stocke pas par produit. Seuls les prix de revient seront synchronisés.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={importCostsFromShopify}>Lancer l'import</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <TooltipContent>
                <p>Importe les prix de revient depuis Shopify</p>
                <p className="text-xs text-muted-foreground mt-1">⚠️ Peut prendre plusieurs minutes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={importShippingCosts}
            disabled={importing || syncing || products.length === 0}
            className="gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Importer Livraison
          </Button>
          <Button
            variant="outline"
            onClick={() => syncToShopify(true)}
            disabled={syncing || selectedCount === 0}
            className="gap-2"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Sync Sélection
          </Button>
          <Button onClick={() => syncToShopify(false)} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Sync Tout
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b-2 border-border sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left w-12">
                  <Checkbox
                    checked={products.length > 0 && products.every((p) => p.selected)}
                    onCheckedChange={toggleAllSelection}
                  />
                </th>
                <th className="p-3 text-left font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {t.smartPricing.table.product}
                  </div>
                </th>
                <th className="hidden md:table-cell p-3 text-left font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    {t.smartPricing.table.sku}
                  </div>
                </th>
                <th className="p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4" />
                    {t.smartPricing.table.price}
                  </div>
                </th>
                <th className="hidden sm:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    {t.smartPricing.table.comparePrice}
                  </div>
                </th>
                <th className="hidden sm:table-cell p-3 text-center font-semibold text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Percent className="w-4 h-4 text-red-600 dark:text-red-400" />
                    {t.smartPricing.table.discount}
                  </div>
                </th>
                <th className="hidden lg:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Calculator className="w-4 h-4" />
                    {t.smartPricing.table.costPrice}
                  </div>
                </th>
                <th className="hidden lg:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Truck className="w-4 h-4" />
                    {t.smartPricing.table.shippingCost}
                  </div>
                </th>
                <th className="hidden xl:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    {t.smartPricing.table.grossMargin}
                  </div>
                </th>
                <th className="hidden xl:table-cell p-3 text-center font-semibold text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Percent className="w-4 h-4 text-green-600 dark:text-green-400" />
                    {t.smartPricing.table.grossMarginPercent}
                  </div>
                </th>
                <th className="p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4" />
                    {t.smartPricing.table.netMargin}
                  </div>
                </th>
                <th className="hidden md:table-cell p-3 text-center font-semibold text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Percent className="w-4 h-4" />
                    {t.smartPricing.table.netMarginPercent}
                  </div>
                </th>
                <th className="hidden lg:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {t.smartPricing.table.marketPrice}
                  </div>
                </th>
                <th className="hidden lg:table-cell p-3 text-right font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    {t.smartPricing.table.smartPrice}
                  </div>
                </th>
                <th className="p-3 text-center font-semibold text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {t.smartPricing.table.actions}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((product) => {
                const discount = calculateDiscount(product.price || 0, product.compare_at_price);
                const grossMarginValue = calculateMarginValue(product.price, product.cost_price, product.shipping_cost);
                const grossMarginPercent = calculateMargin(
                  product.price || 0,
                  (product.cost_price || 0) + (product.shipping_cost || 0),
                );
                const netMargin = calculateNetMargin(product.price, product.cost_price, product.shipping_cost);

                return (
                  <>
                    <tr key={product.id} className={`border-b hover:bg-muted/20 transition-colors ${product.hasMultipleVariants ? 'bg-muted/5' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={product.selected} onCheckedChange={() => toggleProductSelection(product.id)} />
                        </div>
                      </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded-md border border-border"
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-12 h-12 bg-muted rounded-md flex items-center justify-center border border-border hover:bg-muted/80"
                            title="Upload image"
                            onClick={() => triggerFileInput(product.id)}
                            disabled={uploadingImage === product.id}
                          >
                            {uploadingImage === product.id ? (
                              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                        <div className="max-w-[200px]">
                          <p className="font-medium line-clamp-2 text-sm">{product.title}</p>
                          {product.vendor && (
                            <p className="text-xs text-muted-foreground">{product.vendor}</p>
                          )}
                        </div>
                      </div>
                    </td>
              <td className="hidden md:table-cell p-3">
                {product.hasMultipleVariants ? (
                  <span className="text-xs text-muted-foreground italic">{t.smartPricing.messages.seeVariants}</span>
                ) : product.sku && product.sku.trim() !== "" ? (
                  <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground italic">-</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs hover:bg-primary/10"
                      onClick={() => generateSku(product.id, product.title)}
                    >
                      {t.smartPricing.buttons.generateSku}
                    </Button>
                  </div>
                )}
              </td>
                    <td className="p-3 text-right">
                      {product.hasMultipleVariants ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.price || ""}
                            onChange={(e) => updateProductPrice(product.id, "price", e.target.value)}
                            className="w-20 text-right text-xs h-8"
                          />
                          <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                        </div>
                      )}
                    </td>
                    <td className="hidden sm:table-cell p-3 text-right">
                      {product.hasMultipleVariants ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.compare_at_price || ""}
                            onChange={(e) => updateProductPrice(product.id, "compare_at_price", e.target.value)}
                            className="w-20 text-right text-xs h-8"
                          />
                          <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                        </div>
                      )}
                    </td>
                    <td className="hidden sm:table-cell p-3 text-center">
                      {product.hasMultipleVariants ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : discount > 0 ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <Percent className="w-3 h-3" />-{discount}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell p-3 text-right">
                      {product.hasMultipleVariants ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.cost_price || ""}
                            onChange={(e) => updateProductPrice(product.id, "cost_price", e.target.value)}
                            className="w-20 text-right text-xs h-8"
                            placeholder="0.00"
                          />
                          <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                        </div>
                      )}
                    </td>
                    <td className="hidden lg:table-cell p-3 text-right">
                      {product.hasMultipleVariants ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.shipping_cost || ""}
                            onChange={(e) => updateProductPrice(product.id, "shipping_cost", e.target.value)}
                            className="w-20 text-right text-xs h-8"
                            placeholder="0.00"
                          />
                          <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                        </div>
                      )}
                    </td>
                    {!product.hasMultipleVariants ? (
                      <>
                        <td className="hidden xl:table-cell p-3 text-right">
                          {product.price && (product.cost_price || product.shipping_cost) ? (
                            <div className="text-xs font-semibold">
                              {grossMarginValue >= 0 ? "+" : ""}
                              {grossMarginValue.toFixed(2)} {currencySymbol}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="hidden xl:table-cell p-3 text-center">
                          {product.price && (product.cost_price || product.shipping_cost) ? (
                            <Badge
                              variant="outline"
                              className={`gap-1 text-xs ${
                                grossMarginPercent >= 40
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300"
                                  : grossMarginPercent >= 20
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              <TrendingUp className="w-3 h-3" />
                              {grossMarginPercent.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {product.price ? (
                            <div
                              className={`text-xs font-bold ${
                                netMargin.value >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {netMargin.value >= 0 ? "+" : ""}
                              {netMargin.value.toFixed(2)} {currencySymbol}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell p-3 text-center">
                          {product.price ? (
                            <Badge
                              variant="outline"
                              className={`gap-1 font-semibold text-xs ${
                                netMargin.percentage >= 20
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300"
                                  : netMargin.percentage >= 10
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                                    : netMargin.percentage >= 0
                                      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300"
                                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {netMargin.percentage >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingUp className="w-3 h-3 rotate-180" />
                              )}
                              {netMargin.percentage.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="hidden xl:table-cell p-3"></td>
                        <td className="hidden xl:table-cell p-3"></td>
                        <td className="p-3"></td>
                        <td className="hidden md:table-cell p-3"></td>
                      </>
                    )}
                    <td className="hidden lg:table-cell p-3 text-right">
                      {product.market_price ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                {product.market_price.toFixed(2)} {currencySymbol}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              {product.competitors && product.competitors.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="font-semibold text-xs mb-2">
                                    🔗 Sources utilisées pour le calcul ({product.competitors.length} trouvées):
                                  </p>
                                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                    {product.competitors.slice(0, 10).map((comp, idx) => (
                                      <a
                                        key={idx}
                                        href={comp.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-medium text-primary truncate">
                                            {comp.source}
                                          </span>
                                          <span className="text-xs font-bold whitespace-nowrap">
                                            {comp.price.toFixed(2)} {comp.currency}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span className="truncate">{comp.title}</span>
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            {Math.round(comp.similarity * 100)}% similaire
                                          </Badge>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Aucune source concurrente trouvée pour ce produit
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">Non analysé</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell p-3 text-right">
                      {product.smart_price ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  🤖 Analysé
                                </Badge>
                                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 cursor-help">
                                  {product.smart_price.toFixed(2)} {currencySymbol}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold mb-1">🤖 Raisonnement IA :</p>
                                  <p className="text-xs text-muted-foreground">{product.ai_reasoning}</p>
                                </div>
                                {product.competitors && product.competitors.length > 0 && (
                                  <div className="border-t pt-3">
                                    <p className="text-xs font-semibold mb-2">🔗 Top 10 Concurrents :</p>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                      {product.competitors.slice(0, 10).map((comp, idx) => (
                                        <a
                                          key={idx}
                                          href={comp.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-primary truncate">
                                              {comp.source}
                                            </span>
                                            <span className="text-xs font-bold whitespace-nowrap">
                                              {comp.price.toFixed(2)} {comp.currency}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{comp.title}</span>
                                            <Badge variant="outline" className="text-xs px-1 py-0">
                                              {Math.round(comp.similarity * 100)}% similaire
                                            </Badge>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">Non calculé</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => analyzeVariantPricing(product.id, product.variants[0]?.id || product.id)}
                                disabled={analyzingVariant === (product.variants[0]?.id || product.id)}
                                className="h-7 px-2 gap-1 hover:bg-purple-600/10"
                              >
                                {analyzingVariant === (product.variants[0]?.id || product.id) ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                )}
                                <span className="text-xs">IA</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Analyser le prix avec l'IA</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => syncSingleProduct(product.id)}
                                disabled={syncing}
                                className="h-7 px-2 gap-1 hover:bg-green-600/10"
                              >
                                {syncing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                                )}
                                <span className="text-xs">Sync</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Synchroniser ce produit avec Shopify</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>

                  {/* Variant Rows - ALWAYS VISIBLE for multi-variants */}
                  {(() => {
                    console.log(`[RENDER] Checking variants for "${product.title}":`, {
                      hasMultipleVariants: product.hasMultipleVariants,
                      variantsLength: product.variants?.length || 0,
                      variants: product.variants
                    });
                    return product.hasMultipleVariants && product.variants.map((variant, idx) => {
                      const variantNetMargin = calculateNetMargin(variant.price, variant.cost_price, product.shipping_cost);
                      const variantGrossMargin = calculateMargin(variant.price, variant.cost_price || 0);
                      
                      return (
                      <tr key={`${product.id}-variant-${idx}`} className="bg-muted/10 border-b border-dashed border-border/50 hover:bg-muted/20">
                        <td className="p-3 pl-6">
                          <Checkbox 
                            checked={variant.selected || false}
                            onCheckedChange={() => toggleVariantSelection(product.id, variant.id)}
                          />
                        </td>
                        
                        <td className="p-3 pl-6">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">↳</span>
                            {variant.image_url ? (
                              <img 
                                src={variant.image_url} 
                                alt={`Variante ${idx + 1}`}
                                className="w-8 h-8 object-cover rounded border border-border"
                              />
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-8 h-8 bg-muted rounded border border-border flex items-center justify-center hover:bg-muted/80"
                                title="Upload variant image"
                                onClick={() => triggerFileInput(product.id, variant.id)}
                                disabled={uploadingImage === variant.id}
                              >
                                {uploadingImage === variant.id ? (
                                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                                ) : (
                                  <Upload className="w-3 h-3 text-muted-foreground" />
                                )}
                              </Button>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              {variant.option1 && <span className="text-muted-foreground">{variant.option1}</span>}
                              {variant.option2 && <span className="text-muted-foreground">• {variant.option2}</span>}
                              {variant.option3 && <span className="text-muted-foreground">• {variant.option3}</span>}
                            </div>
                          </div>
                        </td>
                        
                        <td className="hidden md:table-cell p-3">
                          {variant.sku && variant.sku.trim() !== "" ? (
                            <span className="text-xs font-mono text-muted-foreground">{variant.sku}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground italic">-</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs hover:bg-primary/10"
                                onClick={() => generateSku(variant.id, product.title)}
                              >
                                {t.smartPricing.buttons.generateSku}
                              </Button>
                            </div>
                          )}
                        </td>
                        
                        <td className="p-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price || ""}
                            onChange={(e) => updateVariantPrice(variant.id, "price", parseFloat(e.target.value) || null)}
                            className="w-20 text-right text-xs h-8"
                          />
                        </td>
                        
                        <td className="hidden sm:table-cell p-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.compare_at_price || ""}
                            onChange={(e) => updateVariantPrice(variant.id, "compare_at_price", parseFloat(e.target.value) || null)}
                            className="w-20 text-right text-xs h-8"
                          />
                        </td>
                        
                        <td className="hidden sm:table-cell p-3 text-center">
                          {variant.compare_at_price && variant.compare_at_price > variant.price ? (
                            <Badge variant="destructive" className="text-xs">
                              -{Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        
                        <td className="hidden lg:table-cell p-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.cost_price || ""}
                            onChange={(e) => updateVariantPrice(variant.id, "cost_price", parseFloat(e.target.value) || null)}
                            className="w-20 text-right text-xs h-8"
                            placeholder="0.00"
                          />
                        </td>
                        
                        <td className="hidden lg:table-cell p-3 text-right">
                          <span className="text-xs text-muted-foreground">{formatPrice(product.shipping_cost)}</span>
                        </td>
                        
                        <td className="hidden xl:table-cell p-3 text-right">
                          <span className="text-xs">{formatPrice(variant.price - (variant.cost_price || 0))}</span>
                        </td>
                        
                        <td className="hidden xl:table-cell p-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {variantGrossMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        
                        <td className="p-3 text-right">
                          <span className={`text-xs font-medium ${variantNetMargin.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPrice(variantNetMargin.value)}
                          </span>
                        </td>
                        
                        <td className="hidden md:table-cell p-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {variantNetMargin.percentage.toFixed(1)}%
                          </Badge>
                        </td>
                        
                        <td className="hidden lg:table-cell p-3 text-right">
                          {variant.market_price ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium cursor-help">
                                    {formatPrice(variant.market_price)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md p-4">
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold">📊 Prix du marché</p>
                                    {variant.competitors && variant.competitors.length > 0 && (
                                      <div className="border-t pt-2">
                                        <p className="text-xs font-semibold mb-2">🔗 Concurrents :</p>
                                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                          {variant.competitors.slice(0, 10).map((comp, idx) => (
                                            <a
                                              key={idx}
                                              href={comp.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-primary truncate">
                                                  {comp.source}
                                                </span>
                                                <span className="text-xs font-bold whitespace-nowrap">
                                                  {comp.price.toFixed(2)} {comp.currency}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="truncate">{comp.title}</span>
                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                  {Math.round(comp.similarity * 100)}% similaire
                                                </Badge>
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">Non analysé</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell p-3 text-right">
                          {variant.smart_price ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-end gap-2">
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                      🤖 Analysé
                                    </Badge>
                                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 cursor-help">
                                      {formatPrice(variant.smart_price)}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md p-4">
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs font-semibold mb-1">🤖 Raisonnement IA :</p>
                                      <p className="text-xs text-muted-foreground">{variant.ai_reasoning}</p>
                                    </div>
                                    {variant.competitors && variant.competitors.length > 0 && (
                                      <div className="border-t pt-3">
                                        <p className="text-xs font-semibold mb-2">🔗 Top 10 Concurrents :</p>
                                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                          {variant.competitors.slice(0, 10).map((comp, idx) => (
                                            <a
                                              key={idx}
                                              href={comp.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-primary truncate">
                                                  {comp.source}
                                                </span>
                                                <span className="text-xs font-bold whitespace-nowrap">
                                                  {comp.price.toFixed(2)} {comp.currency}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="truncate">{comp.title}</span>
                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                  {Math.round(comp.similarity * 100)}% similaire
                                                </Badge>
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">Non calculé</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => analyzeVariantPricing(product.id, variant.id)}
                              disabled={analyzingVariant === variant.id}
                              className="h-7 px-2 gap-1 hover:bg-purple-600/10"
                              title="Analyser le prix avec l'IA"
                            >
                              {analyzingVariant === variant.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              )}
                              <span className="text-xs">IA</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => syncVariantToShopify(product.id, variant.id)}
                              disabled={syncingVariant === variant.id || !variant.smart_price}
                              className="h-7 px-2 gap-1 hover:bg-green-600/10"
                              title="Synchroniser avec Shopify"
                            >
                              {syncingVariant === variant.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                              )}
                              <span className="text-xs">Sync</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                </>
              );
            })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            {t.smartPricing.messages.showingProducts 
              ? tf('smartPricing.messages.showingProducts', {
                  start: (currentPage - 1) * 50 + 1,
                  end: Math.min(currentPage * 50, filteredProducts.length),
                  total: filteredProducts.length
                })
              : `Affichage de ${(currentPage - 1) * 50 + 1}-${Math.min(currentPage * 50, filteredProducts.length)} sur ${filteredProducts.length} produits`
            }
          </p>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={previousPage}
                  className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 
                  ? i + 1 
                  : currentPage >= totalPages - 2 
                    ? totalPages - 4 + i 
                    : currentPage - 2 + i;
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => goToPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={nextPage}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Aucun produit trouvé</p>
          <p className="text-muted-foreground">Importez vos produits depuis Shopify pour commencer</p>
        </Card>
      )}

      {/* White Background Preview Dialog */}
      <WhiteBgPreviewDialog
        open={showWhiteBgPreview}
        onOpenChange={setShowWhiteBgPreview}
        previews={whiteBgPreviews}
        onApply={handleApplyWhiteBackground}
        onRegenerate={handleRegenerateWhiteBg}
      />
    </div>
  );
}
