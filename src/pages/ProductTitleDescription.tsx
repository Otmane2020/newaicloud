import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useStore } from "@/contexts/StoreContext";
import { guardStoreData, verifyStateCoherence } from "@/lib/storeGuard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Loader2,
  Search,
  Paintbrush,
  Palette,
  Eye,
  RefreshCw,
  Square,
  FileText,
  AlertCircle,
  Upload,
  CheckCircle,
  Trash2,
  Power,
  PowerOff,
  Package,
  Images,
  Check,
  Grid3x3,
  List,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WhiteBackgroundPreviewDialog } from "@/components/seo/WhiteBackgroundPreviewDialog";
import { LandingPagePreviewDialog } from "@/components/seo/LandingPagePreviewDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { BackgroundDialog } from "@/components/seo/BackgroundDialog";
import { ProductTitleLandingDialog } from "@/components/seo/ProductTitleLandingDialog";
import RegenerateLanding from "@/components/seo/RegenerateLanding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizationConfigDialog, OptimizationConfig } from "@/components/seo/OptimizationConfigDialog";
import { LandingConfigDialog, LandingConfig } from "@/components/seo/LandingConfigDialog";
import { AiBackgroundDialog, AiBackgroundConfig } from "@/components/seo/AiBackgroundDialog";
import { BulkLandingProgressDialog } from "@/components/seo/BulkLandingProgressDialog";
import { OptimizationConfirmDialog } from "@/components/seo/OptimizationConfirmDialog";
import { VariantSelectionConfirmDialog } from "@/components/seo/VariantSelectionConfirmDialog";
import { ProductGalleryDialog } from "@/components/seo/ProductGalleryDialog";
import { SmartBackgroundDialog } from "@/components/seo/SmartBackgroundDialog";
// Removed useBackgroundRemoval - now using generate-white-background edge function
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Product {
  id: string;
  title: string;
  description: string | null;
  landing_page: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  shopify_id: number | null;
  vendor: string | null;
  handle: string | null;
  status: string | null;
  vision_ai_data?: any;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_id?: string | null;
  image_url?: string | null;
  sku?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
}

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
}

// Check if product has rich HTML description or landing page
const hasRichHtmlDescription = (product: Product): boolean => {
  // Check landing_page first (AI-generated content)
  if (product.landing_page) {
    const hasHtmlTags =
      product.landing_page.includes("<div") ||
      product.landing_page.includes("<section") ||
      product.landing_page.includes("<h1") ||
      product.landing_page.includes("<article") ||
      product.landing_page.length > 500; // Long content is likely HTML
    if (hasHtmlTags) return true;
  }

  // Fallback to description
  if (product.description) {
    return (
      product.description.includes("<div") ||
      product.description.includes("<section") ||
      product.description.includes("<h1") ||
      product.description.includes("<article")
    );
  }

  return false;
};

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: "pending" | "generating" | "success" | "error";
  error?: string;
  variantId?: string;
  variantTitle?: string;
}

export default function ProductTitleDescription() {
  const navigate = useNavigate();
  const { t, tf } = useTranslation();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { selectedStore } = useStore();
  // Removed local background removal hook - using edge function instead
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [generatingWhiteBg, setGeneratingWhiteBg] = useState(false);
  const [generatingAiBg, setGeneratingAiBg] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [showWhiteBgDialog, setShowWhiteBgDialog] = useState(false);
  const [showAiBgDialog, setShowAiBgDialog] = useState(false);
  const [whiteBgPreviews, setWhiteBgPreviews] = useState<PreviewImage[]>([]);
  const [aiBgPreviews, setAiBgPreviews] = useState<PreviewImage[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showAiConfigDialog, setShowAiConfigDialog] = useState(false);
  const [showLandingPreviewDialog, setShowLandingPreviewDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedImageType, setSelectedImageType] = useState<"primary" | "secondary">("primary");
  const [showWhiteBgConfigDialog, setShowWhiteBgConfigDialog] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<{
    index: number;
    total: number;
    title: string;
    vendor?: string | null;
  } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showOptimizationConfirm, setShowOptimizationConfirm] = useState(false);
  const [showLandingDialog, setShowLandingDialog] = useState(false);
  const [selectedLandingProduct, setSelectedLandingProduct] = useState<Product | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [optimizationConfig, setOptimizationConfig] = useState<OptimizationConfig | null>(null);
  const [showLandingConfigDialog, setShowLandingConfigDialog] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingConfig | null>(null);
  const [galleryImages, setGalleryImages] = useState<Map<string, ProductImage[]>>(new Map());
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Map<string, string>>(new Map());
  const [selectedImageFormat, setSelectedImageFormat] = useState<string>("square");
  const [whiteBgMode, setWhiteBgMode] = useState<"standard" | "google_shopping">("standard");
  const [selectedSimilarity, setSelectedSimilarity] = useState<string>("medium");
  const [statusFilter, setStatusFilter] = useState<"all" | "optimized" | "notOptimized" | "toSync">("all");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showVariantConfirmDialog, setShowVariantConfirmDialog] = useState(false);
  const [pendingAiConfig, setPendingAiConfig] = useState<AiBackgroundConfig | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingApplyProductIds, setPendingApplyProductIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  // White background variant states
  const [whiteBgApplyTo, setWhiteBgApplyTo] = useState<"simple" | "variants">("simple");
  const [whiteBgSelectedVariants, setWhiteBgSelectedVariants] = useState<Map<string, string[]>>(new Map());
  // Bulk landing page generation
  const [showBulkLandingConfigDialog, setShowBulkLandingConfigDialog] = useState(false);
  const [showBulkLandingDialog, setShowBulkLandingDialog] = useState(false);
  const [bulkLandingConfig, setBulkLandingConfig] = useState<LandingConfig | null>(null);
  const [generatingBulkLanding, setGeneratingBulkLanding] = useState(false);
  // Product gallery dialog
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [showSmartBgDialog, setShowSmartBgDialog] = useState(false);
  // Removed showImageSelectionDialog, imageSelectionMode, pendingProduct, pendingProductImages - now integrated in AiBackgroundDialog

  useEffect(() => {
    console.log("🔄 [STORE_CHANGE] Store changed to:", selectedStore?.id, selectedStore?.store_name);
    console.log("🔄 [STORE_CHANGE] Previous products count:", products.length);
    console.log("🔄 [STORE_CHANGE] Resetting state immediately...");

    // ✅ RÉINITIALISATION IMMÉDIATE DU STATE pour éviter le mélange visuel
    setProducts([]);
    setSelectedProducts(new Set());

    // Reset filters when store changes
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);

    if (selectedStore?.id) {
      console.log("🔄 [STORE_CHANGE] Fetching products for new store...");
      fetchProducts();
    }
  }, [selectedStore]);

  // Rafraîchir les limites au montage et toutes les 10 secondes
  useEffect(() => {
    refreshLimits();
    const interval = setInterval(() => {
      refreshLimits();
    }, 10000); // 10 secondes

    return () => clearInterval(interval);
  }, [refreshLimits]);

  const fetchProducts = async () => {
    console.log("🚨🚨🚨 [PRODUCT_TITLE] selectedStore:", selectedStore);

    if (!selectedStore) {
      console.log("🚨🚨🚨 [PRODUCT_TITLE] No store selected, clearing products");
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log(
        "🚨🚨🚨 [PRODUCT_TITLE] Loading products for store:",
        selectedStore.store_name,
        "ID:",
        selectedStore.id,
      );
      console.log("🚨🚨🚨 [PRODUCT_TITLE] About to query with store_id filter:", selectedStore.id);

      // ✅ PAGINATION POUR DÉPASSER LA LIMITE DE 1000 PRODUITS
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log("🔄 [PRODUCT_TITLE] Starting paginated fetch...");

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        console.log(`📄 [PRODUCT_TITLE] Fetching page ${page + 1} (${start}-${end})...`);

        const { data: pageData, error: pageError } = await supabase
          .from("shopify_products")
          .select(
            "id, title, description, landing_page, seo_title, seo_description, image_url, shopify_id, vendor, handle, status, store_id",
          )
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id)
          .range(start, end)
          .order("imported_at", { ascending: false });

        if (pageError) throw pageError;

        if (pageData && pageData.length > 0) {
          console.log(`✅ [PRODUCT_TITLE] Page ${page + 1} loaded: ${pageData.length} products`);
          allProducts = [...allProducts, ...pageData];

          // Si on a reçu moins de PAGE_SIZE résultats, c'est la dernière page
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log("🚨🚨🚨 [PRODUCT_TITLE] Total products fetched:", allProducts.length);

      // ✅ VALIDATION GARDE : Filtrer les données avec la fonction garde
      const rawProductsData = guardStoreData(allProducts, selectedStore.id, "product");
      console.log("🚨🚨🚨 [PRODUCT_TITLE] After guard filter:", rawProductsData.length, "valid products");

      // Charger les variantes pour ces produits par batch pour éviter les URL trop longues
      if (rawProductsData && rawProductsData.length > 0) {
        const productIds = rawProductsData.map((p) => p.id);
        console.log("🔍 [PRODUCT_TITLE] Loading variants for products:", productIds.length);

        let allVariants: any[] = [];
        const batchSize = 50; // Traiter par batch de 50 produits max

        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          const { data: variantsData, error: variantsError } = await supabase
            .from("product_variants")
            .select("id, product_id, title, option1, option2, option3, image_url, sku, price, compare_at_price, cost_price")
            .in("product_id", batch);

          if (variantsError) {
            console.error("❌ [PRODUCT_TITLE] Error loading variants batch:", variantsError);
          } else if (variantsData) {
            allVariants = [...allVariants, ...variantsData];
          }
        }

        console.log("✅ [PRODUCT_TITLE] Loaded total variants:", allVariants.length);

        // Associer les variantes aux produits
        const productsWithVariants = rawProductsData.map((product) => {
          const productVariants = allVariants.filter((v) => v.product_id === product.id);
          if (productVariants.length > 0) {
            console.log(
              `🔍 [PRODUCT_TITLE] Product "${product.title}" has ${productVariants.length} variants:`,
              productVariants.map((v) => v.title),
            );
          }
          return {
            ...product,
            variants: productVariants,
          };
        });

        console.log("📊 [PRODUCT_TITLE] Fetched products with variants:", productsWithVariants.length);
        setProducts(productsWithVariants as Product[]);

        // ✅ Vérifier la cohérence après setState
        verifyStateCoherence(productsWithVariants, selectedStore.id, "ProductTitleDescription", "product");
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  // Afficher automatiquement le popup d'import si aucune donnée n'est présente
  useEffect(() => {
    if (!loading && products.length === 0 && selectedStore) {
      setShowImportDialog(true);
    }
  }, [loading, products.length, selectedStore]);

  const filteredProducts = products.filter((product) => {
    // Fonction pour normaliser le texte (enlever accents, ponctuation, minuscules)
    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return "";
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
        .replace(/[^\w\s]/g, " ") // Remplace la ponctuation par des espaces
        .replace(/\s+/g, " ") // Remplace les espaces multiples par un seul
        .trim();
    };

    // Normaliser le terme de recherche et le diviser en mots-clés
    const searchKeywords = normalizeText(searchTerm)
      .split(" ")
      .filter((k) => k.length > 0);

    if (searchKeywords.length === 0) {
      // Pas de recherche, appliquer seulement le filtre de statut
      if (statusFilter === "optimized") return hasRichHtmlDescription(product);
      if (statusFilter === "notOptimized") return !hasRichHtmlDescription(product);
      if (statusFilter === "toSync") return hasRichHtmlDescription(product);
      return true;
    }

    // Construire une chaîne de recherche avec tous les champs du produit
    const searchableText = normalizeText(
      [
        product.title,
        product.vendor,
        product.description,
        product.seo_title,
        product.seo_description,
        product.handle,
        product.status,
        // Ajouter les variantes si disponibles
        ...(product.variants?.map((v) => [v.title, v.option1, v.option2, v.option3].filter(Boolean).join(" ")) || []),
      ]
        .filter(Boolean)
        .join(" "),
    );

    // Vérifier que tous les mots-clés sont présents dans le texte
    const matchesSearch = searchKeywords.every((keyword) => searchableText.includes(keyword));

    if (!matchesSearch) return false;

    // Appliquer les filtres de statut
    if (statusFilter === "optimized") return hasRichHtmlDescription(product);
    if (statusFilter === "notOptimized") return !hasRichHtmlDescription(product);
    if (statusFilter === "toSync") return hasRichHtmlDescription(product);

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // 🚨 DEBUG LOGS - Ultra visible debugging
  useEffect(() => {
    console.log("🚨🚨🚨 ============= PRODUCT DEBUG INFO =============");
    console.log("🚨🚨🚨 [PRODUCTS_RAW] Total products loaded:", products.length);
    console.log("🚨🚨🚨 [FILTER_ACTIVE]", { statusFilter, searchTerm });
    console.log("🚨🚨🚨 [PRODUCTS_FILTERED] After filters:", filteredProducts.length);
    console.log(
      "🚨🚨🚨 [PRODUCTS_PAGINATED] Page",
      currentPage,
      "/",
      totalPages,
      "- Showing:",
      paginatedProducts.length,
    );
    console.log("🚨🚨🚨 [STORE_SELECTED]", selectedStore?.store_name, "ID:", selectedStore?.id);
    if (paginatedProducts.length > 0) {
      console.log(
        "🚨🚨🚨 [SAMPLE_PRODUCTS] First 3:",
        paginatedProducts.slice(0, 3).map((p) => ({ id: p.id, title: p.title, store_id: (p as any).store_id })),
      );
    }
    console.log("🚨🚨🚨 ============================================");
  }, [products, filteredProducts, paginatedProducts, currentPage, totalPages, statusFilter, searchTerm, selectedStore]);

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
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

  const handleOptimizeSelected = async (config?: OptimizationConfig) => {
    if (selectedProducts.size === 0) {
      toast.error(t.productOptimization.selectOne);
      return;
    }

    // Vérifier les limites d'utilisation
    if (!canDoAction("optimizations")) {
      setShowUpgradeDialog(true);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setGenerating(true);
    setIsOptimizing(true);
    setOptimizedProducts([]);
    setShowLandingPreviewDialog(true);

    const productArray = Array.from(selectedProducts);
    const toastId = toast.loading(`Génération 0/${productArray.length} produit(s)...`);

    try {
      for (let i = 0; i < productArray.length; i++) {
        // Vérifier si annulation demandée
        if (controller.signal.aborted) {
          throw new Error(`CANCELLED: ${t.productOptimization.cancelled}`);
        }

        const productId = productArray[i];
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        // Mettre à jour l'indicateur de progression
        setCurrentProcessing({
          index: i + 1,
          total: productArray.length,
          title: product.title,
          vendor: product.vendor,
        });

        toast.loading(`Génération ${i + 1}/${productArray.length}: ${product.title.substring(0, 40)}... (SEO uniquement)`, {
          id: toastId,
        });

        // Timeout réduit à 45 secondes
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 45000),
        );

        const invokePromise = supabase.functions.invoke("generate-title-description", {
          body: {
            currentTitle: product.title,
            imageUrl: (config || optimizationConfig)?.selectedImageUrl || product.image_url || null,
            config: config || optimizationConfig,
            customDescription: (config || optimizationConfig)?.customDescription || "",
            vendor: "",
          },
        });

        const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

        if (error) {
          // Check for specific error types
          const errorMessage = error.message || String(error);

          if (errorMessage.includes("LIMIT_REACHED") || errorMessage.includes("Limite d'optimisations atteinte")) {
            throw new Error("LIMIT_REACHED: Limite d'optimisations atteinte. Veuillez passer à un plan supérieur.");
          }

          if (errorMessage.includes("CREDITS_DEPLETED") || errorMessage.includes("402")) {
            throw new Error(
              "CREDITS_DEPLETED: Les crédits IA sont épuisés. Contactez le support pour plus d'informations.",
            );
          }

          if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429")) {
            throw new Error("RATE_LIMIT: Limite de taux atteinte. Veuillez patienter quelques instants.");
          }

          if (errorMessage.includes("TIMEOUT")) {
            throw new Error(
              "TIMEOUT: La génération prend trop de temps. Le contenu demandé est peut-être trop complexe.",
            );
          }

          if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
            throw new Error("NETWORK: Erreur réseau. Vérifiez votre connexion et réessayez.");
          }

          throw error;
        }

        // Update local state - Fetch fresh data from DB
        const { data: updatedProduct } = await supabase
          .from("shopify_products")
          .select(
            "id, title, description, landing_page, seo_title, seo_description, image_url, shopify_id, vendor, handle, status",
          )
          .eq("id", productId)
          .single();

        if (updatedProduct) {
          // NOTE: Landing page generation has been separated from SEO optimization
          // Landing page generation now consumes 10 optimizations independently
          // and should be triggered separately by the user
          
          // Update optimizedProducts progressively with fresh data
          setOptimizedProducts((prev) => [...prev, updatedProduct]);

          // Force update products state with fresh data
          setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
        }
      }

      toast.success(`${optimizedProducts.length}/${productArray.length} produit(s) optimisé(s)`, { id: toastId });
      setSelectedProducts(new Set());
      await refreshLimits(); // Rafraîchir les limites après optimisation
    } catch (error: any) {
      console.error("Error optimizing:", error);

      const errorMessage = error?.message || String(error);

      if (errorMessage.includes("CANCELLED")) {
        toast.info(t.productTitleDescription.toasts.generationCancelled, {
          id: toastId,
          description: tf("productTitleDescription.toasts.productsCancelledDesc", { count: optimizedProducts.length }),
        });
      } else if (errorMessage.includes("LIMIT_REACHED")) {
        toast.error(t.productTitleDescription.toasts.limitReached, {
          id: toastId,
          description: t.productTitleDescription.toasts.limitReachedDesc,
        });
        setShowUpgradeDialog(true);
      } else if (errorMessage.includes("CREDITS_DEPLETED")) {
        toast.error(t.productTitleDescription.toasts.creditsDepleted, {
          id: toastId,
          description: t.productTitleDescription.toasts.creditsDepletedDesc,
        });
      } else if (errorMessage.includes("RATE_LIMIT")) {
        toast.error(t.productTitleDescription.toasts.tooManyRequests, {
          id: toastId,
          description: t.productTitleDescription.toasts.tooManyRequestsDesc,
        });
      } else if (errorMessage.includes("TIMEOUT")) {
        toast.error(t.productTitleDescription.toasts.generationTimeout, {
          id: toastId,
          description: t.productTitleDescription.toasts.generationTimeoutDesc,
        });
      } else if (errorMessage.includes("NETWORK")) {
        toast.error(t.productTitleDescription.toasts.networkError, {
          id: toastId,
          description: t.productTitleDescription.toasts.networkErrorDesc,
        });
      } else {
        toast.error(t.productTitleDescription.toasts.optimizationError, {
          id: toastId,
          description: errorMessage || t.productTitleDescription.toasts.unknownError,
        });
      }
    } finally {
      setGenerating(false);
      setIsOptimizing(false);
      setCurrentProcessing(null);
      setAbortController(null);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      toast.info("Annulation en cours...");
    }
  };

  const handleOptimizeAll = async () => {
    if (filteredProducts.length === 0) {
      toast.error("Aucun produit à optimiser");
      return;
    }

    setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    setShowConfigDialog(true);
  };

  const handleConfigConfirm = (config: OptimizationConfig) => {
    setOptimizationConfig(config);
    setTimeout(() => handleOptimizeSelected(config), 100);
  };

  const handleLandingConfigConfirm = (config: LandingConfig) => {
    setLandingConfig(config);
    setShowLandingConfigDialog(false);
    setTimeout(() => setShowLandingDialog(true), 100);
  };

  const loadGalleryImages = async (productIds: string[]) => {
    setLoadingGallery(true);
    const imagesMap = new Map<string, ProductImage[]>();

    try {
      for (const productId of productIds) {
        const { data, error } = await supabase
          .from("product_images")
          .select("id, src, alt_text, position")
          .eq("product_id", productId)
          .order("position", { ascending: true });

        if (!error && data) {
          console.log(`📸 [Gallery] Loaded ${data.length} images for product ${productId}`);
          imagesMap.set(productId, data);
        } else if (error) {
          console.error(`❌ [Gallery] Error loading images for product ${productId}:`, error);
        }
      }

      setGalleryImages(imagesMap);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleWhiteBackground = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    // Vérifier les limites d'utilisation
    if (!canDoAction("optimizations")) {
      setShowUpgradeDialog(true);
      return;
    }

    const selectedProductsList = products.filter((p) => selectedProducts.has(p.id) && p.image_url);

    if (selectedProductsList.length === 0) {
      toast.error("Aucun produit sélectionné n'a d'image");
      return;
    }

    // Validation des variantes si le mode variantes est activé
    if (whiteBgApplyTo === "variants" && whiteBgSelectedVariants.size === 0) {
      toast.error("Veuillez sélectionner au moins une variante");
      return;
    }

    // Close config dialog and start generation
    setShowWhiteBgConfigDialog(false);
    setGeneratingWhiteBg(true);

    let previews: PreviewImage[] = [];

    if (whiteBgApplyTo === "simple") {
      // Mode simple: une image par produit
      previews = selectedProductsList.map((p) => {
        const selectedImageUrl = selectedGalleryImages.get(p.id) || p.image_url!;
        return {
          productId: p.id,
          productTitle: p.title,
          originalUrl: selectedImageUrl,
          generatedUrl: null,
          status: "pending" as const,
        };
      });
    } else {
      // Mode variantes: une image par variante sélectionnée
      for (const product of selectedProductsList) {
        const variantIds = whiteBgSelectedVariants.get(product.id) || [];
        if (variantIds.length === 0) continue;

        for (const variantId of variantIds) {
          const variant = product.variants?.find((v) => v.id === variantId);
          if (!variant) continue;

          // Trouver l'image de la variante par image_id
          const images = galleryImages.get(product.id) || [];
          const variantImage = variant.image_id ? images.find((img) => img.id === variant.image_id) : undefined;
          const imageUrl = variantImage?.src || product.image_url!;

          previews.push({
            productId: product.id,
            productTitle: product.title,
            originalUrl: imageUrl,
            generatedUrl: null,
            status: "pending" as const,
            variantId: variant.id,
            variantTitle: variant.title,
          });
        }
      }
    }

    setWhiteBgPreviews(previews);
    setShowWhiteBgDialog(true);

    // Générer les images
    for (const preview of previews) {
      const previewKey = preview.variantId ? `${preview.productId}-${preview.variantId}` : preview.productId;

      setWhiteBgPreviews((prev) =>
        prev.map((p) => {
          const pKey = p.variantId ? `${p.productId}-${p.variantId}` : p.productId;
          return pKey === previewKey ? { ...p, status: "generating" } : p;
        }),
      );

      try {
        const { data, error } = await supabase.functions.invoke("generate-white-background", {
          body: {
            imageUrl: preview.originalUrl,
            productTitle: preview.productTitle,
            imageType: selectedImageType,
            product_id: preview.productId,
            format: selectedImageFormat,
            mode: whiteBgMode,
          },
        });

        if (error) throw error;

        if (data.success && data.imageUrl) {
          setWhiteBgPreviews((prev) =>
            prev.map((p) => {
              const pKey = p.variantId ? `${p.productId}-${p.variantId}` : p.productId;
              return pKey === previewKey ? { ...p, status: "success", generatedUrl: data.imageUrl } : p;
            }),
          );
        } else {
          throw new Error(data.error || "Échec de la génération");
        }
      } catch (error: any) {
        console.error("Error generating white background:", error);
        setWhiteBgPreviews((prev) =>
          prev.map((p) => {
            const pKey = p.variantId ? `${p.productId}-${p.variantId}` : p.productId;
            return pKey === previewKey ? { ...p, status: "error", error: error.message || "Erreur de génération" } : p;
          }),
        );
      }
    }

    setGeneratingWhiteBg(false);
    await refreshLimits();
  };

  // Fonction pour générer les arrière-plans IA avec timeout et meilleure gestion d'erreur
  const generateAiBackgrounds = async (config: AiBackgroundConfig) => {
    const startTime = Date.now();
    console.log("🎨 [AI BG] Starting generation with config:", {
      prompt: config.prompt,
      format: config.format,
      similarity: config.similarity,
      imageType: config.imageType,
      productsCount: selectedProducts.size,
    });

    setGeneratingAiBg(true);

    try {
      // Conserver la config pour l'utiliser lors de l'application
      setPendingAiConfig(config);

      const selectedProductsList = products.filter((p) => selectedProducts.has(p.id));

      const previews: PreviewImage[] = selectedProductsList.flatMap((p) => {
        const selectedImages = config.selectedImages.get(p.id) || [];
        const imagesToProcess = selectedImages.length > 0 ? selectedImages : [p.image_url!];

        return imagesToProcess.map((imageUrl) => ({
          productId: p.id,
          productTitle: p.title,
          originalUrl: imageUrl,
          generatedUrl: null,
          status: "pending" as const,
        }));
      });

      console.log(`🎨 [AI BG] Created ${previews.length} preview items for ${selectedProductsList.length} products`);

      setAiBgPreviews(previews);
      setShowAiBgDialog(true);

      // Map imageType to targetType (FIXED: singular 'variant')
      const targetType = config.imageType === "primary" ? "main" : "variant";

      // Map similarity to actual style
      const styleMap: Record<string, "professional" | "lifestyle" | "minimalist" | "creative"> = {
        "very-close": "professional",
        close: "professional",
        medium: "lifestyle",
        creative: "creative",
        "very-creative": "creative",
      };
      const actualStyle = styleMap[config.similarity] || "professional";

      for (let i = 0; i < previews.length; i++) {
        const preview = previews[i];
        const product = selectedProductsList.find((p) => p.id === preview.productId);

        if (!product) {
          console.error(`❌ [AI BG] Product not found for preview: ${preview.productId}`);
          // Marquer comme erreur au lieu de continue
          setAiBgPreviews((prev) =>
            prev.map((p) => (p === preview ? { ...p, status: "error", error: t.productTitleDescription.toasts.productNotFound } : p)),
          );
          continue;
        }

        const itemStartTime = Date.now();

        console.log(
          `🎨 [AI BG] [${i + 1}/${previews.length}] Processing product: ${product.title.substring(0, 50)}...`,
        );

        setAiBgPreviews((prev) => prev.map((p) => (p === preview ? { ...p, status: "generating" } : p)));

        try {
          // Determine the image ID to use from gallery images
          const images = galleryImages.get(product.id) || [];
          const matchingImage = images.find((img) => img.src === preview.originalUrl);
          const imageId = matchingImage?.id || "";

          if (!imageId) {
            console.warn(`⚠️ [AI BG] No imageId found for product ${product.id}, URL: ${preview.originalUrl}`);
          } else {
            console.log(`✅ [AI BG] Using imageId: ${imageId} for product ${product.id}`);
          }

          // Créer une promesse avec timeout de 2 minutes
          const generatePromise = supabase.functions.invoke("generate-ai-product-background", {
            body: {
              imageUrl: preview.originalUrl,
              productTitle: product.title,
              productDescription: product.description,
              seoTitle: product.seo_title,
              seoDescription: product.seo_description,
              visionAiData: product.vision_ai_data,
              productId: product.id,
              imageId: imageId || product.id,
              prompt: config.prompt,
              enrichedPrompt: config.enrichedPrompt,
              style: actualStyle,
              format: config.format,
              targetType: targetType,
              variantOptions: config.selectedVariants
                .get(product.id)
                ?.map((vId) => {
                  const variant = product.variants?.find((v) => v.id === vId);
                  return variant ? [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" - ") : "";
                })
                .join(", "),
            },
          });

          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 120000));

          // ✅ CORRECTION: Envelopper Promise.race dans try-catch pour gérer le timeout
          let result;
          try {
            result = await Promise.race([generatePromise, timeoutPromise]);
          } catch (raceError: any) {
            // Si c'est le timeout qui a gagné
            if (raceError.message === "TIMEOUT") {
              throw new Error("TIMEOUT: La génération a pris plus de 2 minutes");
            }
            // Sinon, c'est une autre erreur
            throw raceError;
          }

          const { data, error } = result as any;

          const elapsedTime = ((Date.now() - itemStartTime) / 1000).toFixed(1);
          console.log(`⏱️ [AI BG] Request completed in ${elapsedTime}s`);

          if (error) {
            console.error("❌ [AI BG] Generation error:", error);
            let errorMessage = "Erreur lors de la génération";

            if (error.message?.includes("TIMEOUT")) {
              errorMessage = "Délai d'attente dépassé (2 min). Veuillez réessayer.";
            } else if (
              error.message?.includes("429") ||
              error.message?.includes("RATE_LIMIT") ||
              error.message?.includes("rate limit")
            ) {
              errorMessage = "Limite de taux dépassée. Veuillez réessayer dans 60 secondes.";
            } else if (
              error.message?.includes("402") ||
              error.message?.includes("PAYMENT_REQUIRED") ||
              error.message?.includes("Payment required")
            ) {
              errorMessage = "Crédits Lovable AI épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.";
            } else if (error.message?.includes("LIMIT_REACHED")) {
              errorMessage = "Limite d'optimisations atteinte. Passez à un plan supérieur.";
            } else {
              errorMessage = error.message || "Erreur lors de la génération";
            }

            throw new Error(errorMessage);
          }

          if (!data?.success) {
            console.error("❌ [AI BG] Generation failed:", data);
            throw new Error(data?.error || data?.message || "Erreur lors de la génération");
          }

          if (data.imageUrl) {
            console.log(`✅ [AI BG] Successfully generated image for ${product.title.substring(0, 50)}...`);
            console.log(`✅ [AI BG] Image URL:`, data.imageUrl.substring(0, 100));

            // 🔥 Save to history immediately after generation
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user && imageId) {
              const { data: versionData } = await supabase.rpc("get_next_image_version", {
                p_image_id: imageId,
              });

              await supabase.from("product_image_history").insert({
                product_id: product.id,
                image_id: imageId,
                user_id: user.id,
                version_number: versionData || 1,
                optimization_type: "ai_background",
                original_url: preview.originalUrl,
                optimized_url: data.imageUrl,
                ai_prompt: config.enrichedPrompt || config.prompt,
                ai_model: "Lovable AI",
                is_current: false, // Not applied yet
              });
            }

            // 🔥 FIX: Use productId instead of object comparison
            setAiBgPreviews((prev) => {
              const updated = prev.map((p) =>
                p.productId === product.id ? { ...p, status: "success" as const, generatedUrl: data.imageUrl } : p,
              );
              console.log(`✅ [AI BG] Preview updated for ${product.id}`);
              return updated;
            });
          } else {
            console.error("❌ [AI BG] No image URL in response:", data);
            throw new Error("Aucune image générée");
          }
        } catch (error: any) {
          const elapsedTime = ((Date.now() - itemStartTime) / 1000).toFixed(1);
          console.error(`❌ [AI BG] Error after ${elapsedTime}s:`, error.message);

          // 🔥 FIX: Use productId instead of object comparison
          setAiBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === preview.productId ? { ...p, status: "error" as const, error: error.message } : p,
            ),
          );

          // Toast seulement pour les erreurs critiques
          if (
            error.message?.includes("Limite") ||
            error.message?.includes("Crédits") ||
            error.message?.includes("Délai")
          ) {
            toast.error(error.message, {
              duration: 5000,
            });
          }
        }
      }

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`🎉 [AI BG] All generations completed in ${totalElapsed}s`);
    } catch (error: any) {
      console.error("❌ [AI BG] Fatal error in generateAiBackgrounds:", error);
      toast.error("Erreur lors de la génération des arrière-plans", {
        description: error.message,
      });
    } finally {
      console.log("🔄 [AI BG] Stopping spinner...");
      // CRITICAL: Toujours réinitialiser le spinner
      setGeneratingAiBg(false);
      await refreshLimits();
      console.log("✅ [AI BG] Generation process completed, spinner stopped");
    }
  };

  // Removed obsolete functions - now integrated in unified AiBackgroundDialog

  const handleApplyWhiteBackground = async (
    productIds: string[],
    format: string,
    imageType: "primary" | "secondary",
  ) => {
    const toastId = toast.loading("Application des images...");
    console.log("Applying white background with format:", format, "imageType:", imageType, "applyTo:", whiteBgApplyTo);

    try {
      if (whiteBgApplyTo === "simple") {
        // Mode simple: appliquer à l'image principale ou secondaire
        for (const productId of productIds) {
          const preview = whiteBgPreviews.find((p) => p.productId === productId && !p.variantId);
          if (!preview?.generatedUrl) continue;

          if (imageType === "primary") {
            await supabase.from("shopify_products").update({ image_url: preview.generatedUrl }).eq("id", productId);
          } else {
            const maxPosition = await supabase
              .from("product_images")
              .select("position")
              .eq("product_id", productId)
              .order("position", { ascending: false })
              .limit(1)
              .single();

            const nextPosition = (maxPosition?.data?.position || 0) + 1;

            await supabase.from("product_images").insert({
              product_id: productId,
              src: preview.generatedUrl,
              alt_text: `${preview.productTitle} - Fond blanc IA`,
              position: nextPosition,
            });
          }
        }
      } else {
        // Mode variantes: mettre à jour l'image de chaque variante
        const variantPreviews = whiteBgPreviews.filter((p) => p.variantId);

        for (const preview of variantPreviews) {
          if (!preview.generatedUrl || !preview.variantId) continue;

          // ✅ CRITICAL: Mettre à jour l'image_url de la variante directement
          const { error: variantError } = await supabase
            .from("product_variants")
            .update({ image_url: preview.generatedUrl })
            .eq("id", preview.variantId);

          if (variantError) {
            console.error(`Erreur mise à jour variante ${preview.variantId}:`, variantError);
          } else {
            console.log(`✅ Variante ${preview.variantId} mise à jour avec nouvelle image`);
          }

          // Optionnel: aussi créer une entrée dans product_images pour l'historique
          const { data: maxPosData } = await supabase
            .from("product_images")
            .select("position")
            .eq("product_id", preview.productId)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextPosition = (maxPosData?.position || 0) + 1;

          await supabase.from("product_images").insert({
            product_id: preview.productId,
            variant_id: preview.variantId,
            src: preview.generatedUrl,
            alt_text: `${preview.productTitle} - ${preview.variantTitle} - Fond blanc IA`,
            position: nextPosition,
          });
        }
      }

      const message =
        whiteBgApplyTo === "simple" && imageType === "primary"
          ? "Images principales mises à jour avec succès"
          : "Images ajoutées avec succès";
      toast.success(message, { id: toastId });

      // Synchronisation automatique avec Shopify après l'application réussie
      toast.loading("Synchronisation avec Shopify...", { id: toastId });
      try {
        let syncSuccessCount = 0;
        let syncErrorCount = 0;
        let notSyncedToShopify: string[] = [];

        // Récupérer les IDs de produits uniques à synchroniser
        const uniqueProductIds = [
          ...new Set(
            whiteBgApplyTo === "simple"
              ? productIds
              : whiteBgPreviews.filter((p) => p.variantId).map((p) => p.productId),
          ),
        ];

        for (const productId of uniqueProductIds) {
          try {
            const { data: syncData, error: syncError } = await supabase.functions.invoke(
              "sync-product-images-to-shopify",
              {
                body: { productId },
              },
            );

            if (syncError) {
              console.error(`Erreur sync Shopify pour ${productId}:`, syncError);
              syncErrorCount++;
            } else if (syncData?.skipped) {
              // Produit pas encore synchronisé avec Shopify
              notSyncedToShopify.push(productId);
              console.log(`Produit ${productId} pas encore sur Shopify - sync passée`);
            } else {
              syncSuccessCount++;
            }
          } catch (syncErr) {
            console.error(`Erreur sync Shopify pour ${productId}:`, syncErr);
            syncErrorCount++;
          }
        }

        // Messages de résultat détaillés
        if (syncSuccessCount > 0 && syncErrorCount === 0 && notSyncedToShopify.length === 0) {
          toast.success(
            `✅ ${syncSuccessCount} produit${syncSuccessCount > 1 ? "s" : ""} synchronisé${syncSuccessCount > 1 ? "s" : ""} avec Shopify`,
            { id: toastId, duration: 4000 },
          );
        } else if (syncSuccessCount > 0) {
          let msg = `✅ ${syncSuccessCount} synchronisé${syncSuccessCount > 1 ? "s" : ""}`;
          if (notSyncedToShopify.length > 0) {
            msg += ` • ℹ️ ${notSyncedToShopify.length} pas encore sur Shopify`;
          }
          if (syncErrorCount > 0) {
            msg += ` • ❌ ${syncErrorCount} erreur${syncErrorCount > 1 ? "s" : ""}`;
          }
          toast.success(msg, { id: toastId, duration: 5000 });
        } else if (notSyncedToShopify.length > 0) {
          toast.info(
            `ℹ️ Images sauvegardées ! ${notSyncedToShopify.length} produit${notSyncedToShopify.length > 1 ? "s" : ""} pas encore sur Shopify. Synchronisez-les d'abord pour voir les images.`,
            { id: toastId, duration: 6000 },
          );
        } else {
          toast.error(`❌ Erreur lors de la synchronisation avec Shopify`, { id: toastId });
        }
      } catch (syncError) {
        console.error("Erreur globale sync Shopify:", syncError);
        toast.warning("Images appliquées localement mais erreur de synchronisation Shopify", { id: toastId });
      }

      await fetchProducts();
      setWhiteBgPreviews([]);
      setWhiteBgApplyTo("simple");
      setWhiteBgSelectedVariants(new Map());
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleApplyAiBackground = async (productIds: string[]) => {
    // Vérifier si des produits avec variantes sont concernés
    const productsWithVariants = products.filter(
      (p) => productIds.includes(p.id) && p.variants && p.variants.length > 0,
    );

    // Si on a un config avec des variantes sélectionnées, afficher la popup de confirmation
    if (pendingAiConfig && pendingAiConfig.applyTo === "variants" && pendingAiConfig.selectedVariants.size > 0) {
      setPendingApplyProductIds(productIds);
      setShowAiBgDialog(false);
      setShowVariantConfirmDialog(true);
      return;
    }

    // Si des produits ont des variantes mais qu'on n'a pas de config, afficher la popup
    if (productsWithVariants.length > 0 && !pendingAiConfig) {
      toast.info("Ce produit possède des variantes. La configuration sera appliquée à l'image principale.");
    }

    await applyAiBackgroundImages(productIds);
  };

  const applyAiBackgroundImages = async (productIds: string[]) => {
    const toastId = toast.loading("Application des images...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Check if we're applying to variants
      const applyingToVariants = pendingAiConfig?.applyTo === "variants" && pendingAiConfig.selectedVariants.size > 0;

      for (const productId of productIds) {
        const preview = aiBgPreviews.find((p) => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        if (applyingToVariants) {
          // ✅ Mode variantes: mettre à jour l'image de chaque variante sélectionnée
          const selectedVariantIds = pendingAiConfig.selectedVariants.get(productId) || [];
          
          for (const variantId of selectedVariantIds) {
            const { error: variantError } = await supabase
              .from("product_variants")
              .update({ image_url: preview.generatedUrl })
              .eq("id", variantId);

            if (variantError) {
              console.error(`❌ Erreur mise à jour variante ${variantId}:`, variantError);
            } else {
              console.log(`✅ Variante ${variantId} mise à jour avec nouvelle image IA`);
            }
          }
        } else {
          // Mode simple: mettre à jour l'image principale du produit
          await supabase.from("shopify_products").update({ image_url: preview.generatedUrl }).eq("id", productId);
        }

        // Save to history if user is authenticated
        if (user) {
          // Find or create the product image entry
          const { data: existingImages } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", productId)
            .eq("src", preview.originalUrl)
            .single();

          let imageId = existingImages?.id;

          // If no image exists, create one (this is the main product image)
          if (!imageId) {
            const { data: newImage } = await supabase
              .from("product_images")
              .insert({
                product_id: productId,
                src: preview.originalUrl,
                position: 1,
                seller_id: user.id,
              })
              .select("id")
              .single();

            imageId = newImage?.id;
          }

          if (imageId) {
            // Mark all versions as not current first
            await supabase.from("product_image_history").update({ is_current: false }).eq("image_id", imageId);

            // Mark the generated image as current
            await supabase
              .from("product_image_history")
              .update({ is_current: true })
              .eq("image_id", imageId)
              .eq("optimized_url", preview.generatedUrl);
          }
        }
      }

      toast.success("Images appliquées avec succès", { id: toastId });
      await fetchProducts();
      setAiBgPreviews([]);
      setPendingAiConfig(null);
      setPendingApplyProductIds([]);

      // Synchronisation automatique avec Shopify après l'application réussie
      toast.loading("Synchronisation avec Shopify...", { id: toastId });
      try {
        let syncSuccessCount = 0;
        let syncErrorCount = 0;

        for (const productId of productIds) {
          try {
            const { error: syncError } = await supabase.functions.invoke("sync-product-images-to-shopify", {
              body: { productId },
            });

            if (syncError) {
              console.error(`Erreur sync Shopify pour ${productId}:`, syncError);
              syncErrorCount++;
            } else {
              syncSuccessCount++;
            }
          } catch (syncErr) {
            console.error(`Erreur sync Shopify pour ${productId}:`, syncErr);
            syncErrorCount++;
          }
        }

        if (syncSuccessCount > 0) {
          toast.success(`Images synchronisées avec Shopify (${syncSuccessCount}/${productIds.length})`, {
            id: toastId,
          });
        } else if (syncErrorCount > 0) {
          toast.warning(`Images appliquées mais synchronisation Shopify échouée pour ${syncErrorCount} produit(s)`, {
            id: toastId,
          });
        }
      } catch (syncError) {
        console.error("Error syncing to Shopify:", syncError);
        toast.warning("Images appliquées mais erreur lors de la synchronisation Shopify", { id: toastId });
      }
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleRegenerateWhiteBg = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    setWhiteBgPreviews((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, status: "generating", error: undefined } : p)),
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-white-background", {
        body: {
          imageUrl: product.image_url,
          productTitle: product.title,
          imageType: selectedImageType,
          product_id: productId,
          format: selectedImageFormat,
          mode: whiteBgMode,
        },
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setWhiteBgPreviews((prev) =>
          prev.map((p) => (p.productId === productId ? { ...p, status: "success", generatedUrl: data.imageUrl } : p)),
        );
      } else {
        throw new Error(data.error || "Échec de la régénération");
      }
    } catch (error: any) {
      console.error("Error regenerating:", error);
      setWhiteBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId ? { ...p, status: "error", error: error.message || "Erreur de génération" } : p,
        ),
      );
    }
  };

  const handleRegenerateAiBg = async (productId: string, prompt?: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    const promptToUse = prompt || customPrompt;

    // Validation: ensure prompt is not empty
    if (!promptToUse || !promptToUse.trim()) {
      toast.error("Veuillez entrer un prompt avant de régénérer");
      return;
    }

    // Get the selected image URL for this product (gallery or main image)
    const selectedImageUrl = selectedGalleryImages.get(productId) || product.image_url;

    setAiBgPreviews((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, status: "generating", error: undefined } : p)),
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-image-background", {
        body: {
          imageUrl: selectedImageUrl,
          prompt: promptToUse.trim(),
          productTitle: product.title,
          imageType: selectedImageType,
          format: selectedImageFormat,
          similarity: selectedSimilarity,
        },
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setAiBgPreviews((prev) =>
          prev.map((p) => (p.productId === productId ? { ...p, status: "success", generatedUrl: data.imageUrl } : p)),
        );
        toast.success("Arrière-plan régénéré avec succès");
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      console.error("Error regenerating:", error);
      setAiBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId ? { ...p, status: "error", error: error.message || "Erreur de génération" } : p,
        ),
      );
      toast.error("Erreur lors de la régénération");
    }
  };

  const handleSyncToShopify = async () => {
    setSyncingToShopify(true);
    const toastId = toast.loading("Synchronisation avec Shopify...");

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const product of optimizedProducts) {
        if (!product.shopify_id) {
          console.warn(`Product ${product.id} has no shopify_id, skipping`);
          errorCount++;
          continue;
        }

        // Get product handle from database
        const { data: productData } = await supabase
          .from("shopify_products")
          .select("handle")
          .eq("id", product.id)
          .single();

        if (!productData?.handle) {
          console.error(`Product ${product.id} has no handle, skipping`);
          errorCount++;
          continue;
        }

        try {
          // Use sync-landing-to-shopify to sync both product description and landing page
          const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
            body: {
              productId: product.id,
              productTitle: product.title,
              productHandle: productData.handle,
              htmlContent: product.landing_page || product.description || "", // Use landing_page first
            },
          });

          if (error) {
            console.error(`Error syncing product ${product.id}:`, error);
            errorCount++;
          } else if (data?.success) {
            console.log(`✅ Product ${product.id} synced:`, data.operation);
            successCount++;
          } else {
            console.error(`Failed to sync product ${product.id}:`, data?.error);
            errorCount++;
          }
        } catch (err) {
          console.error(`Exception syncing product ${product.id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} produit(s) synchronisé(s) avec Shopify`, { id: toastId });
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} produit(s) n'ont pas pu être synchronisés`, { duration: 5000 });
      }

      if (successCount === optimizedProducts.length) {
        setShowLandingPreviewDialog(false);
        setOptimizedProducts([]);
      }
    } catch (error) {
      console.error("Error syncing to Shopify:", error);
      toast.error("Erreur lors de la synchronisation", { id: toastId });
    } finally {
      setSyncingToShopify(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:h-8 text-primary" />
                {t.contentOptimization.hero.title}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t.contentOptimization.hero.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!canDoAction("optimizations")) {
                    toast.error("Limite d'optimisations atteinte");
                    setShowUpgradeDialog(true);
                    return;
                  }
                  handleOptimizeAll();
                }}
                disabled={generating || filteredProducts.length === 0}
                size="lg"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.contentOptimization.buttons.optimizing}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    {t.contentOptimization.buttons.optimizeAll}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const productsToSync = filteredProducts.filter(
                    (p) => p.shopify_id && (hasRichHtmlDescription(p) || p.seo_title),
                  );

                  if (productsToSync.length === 0) {
                    toast.error(t.contentOptimization.toasts.noProductToSync);
                    return;
                  }

                  const toastId = toast.loading(
                    `${t.contentOptimization.buttons.synchronizing} ${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}...`,
                  );

                  try {
                    for (const product of productsToSync) {
                      await supabase.functions.invoke("sync-seo-to-shopify", {
                        body: {
                          productId: product.id,
                          shopifyId: product.shopify_id,
                          seoTitle: product.seo_title,
                          seoDescription: product.seo_description,
                        },
                      });
                    }
                    toast.success(`${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}`, {
                      id: toastId,
                    });
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
                  }
                }}
                disabled={syncingToShopify}
                size="lg"
                className="gap-2"
              >
                {syncingToShopify ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t.contentOptimization.buttons.syncAll}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const productsToSync = Array.from(selectedProducts)
                    .map((id) => products.find((p) => p.id === id))
                    .filter((p) => p && p.shopify_id && (hasRichHtmlDescription(p) || p.seo_title)) as Product[];

                  if (productsToSync.length === 0) {
                    toast.error(t.contentOptimization.toasts.noSelectedProduct);
                    return;
                  }

                  const toastId = toast.loading(
                    `${t.contentOptimization.buttons.synchronizing} ${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}...`,
                  );

                  try {
                    for (const product of productsToSync) {
                      await supabase.functions.invoke("sync-seo-to-shopify", {
                        body: {
                          productId: product.id,
                          shopifyId: product.shopify_id,
                          seoTitle: product.seo_title,
                          seoDescription: product.seo_description,
                        },
                      });
                    }
                    toast.success(`${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}`, {
                      id: toastId,
                    });
                    setSelectedProducts(new Set());
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
                  }
                }}
                disabled={syncingToShopify || selectedProducts.size === 0}
                size="lg"
                className="gap-2"
              >
                {syncingToShopify ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t.contentOptimization.buttons.syncSelected} ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Total Products Header */}
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.totalProducts}</p>
            <p className="text-3xl font-bold">{products.length}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
              statusFilter === "optimized"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "hover:border-primary/30"
            }`}
            onClick={() => setStatusFilter(statusFilter === "optimized" ? "all" : "optimized")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.optimized}</p>
                <p className="text-2xl font-bold">{products.filter((p) => hasRichHtmlDescription(p)).length}</p>
              </div>
            </div>
            {statusFilter === "optimized" && (
              <Badge variant="default" className="mt-2">
                Filtre actif
              </Badge>
            )}
          </Card>

          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
              statusFilter === "notOptimized"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "hover:border-primary/30"
            }`}
            onClick={() => setStatusFilter(statusFilter === "notOptimized" ? "all" : "notOptimized")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.notOptimized}</p>
                <p className="text-2xl font-bold">{products.filter((p) => !hasRichHtmlDescription(p)).length}</p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${statusFilter === "toSync" ? "border-primary bg-primary/5" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "toSync" ? "all" : "toSync")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.toSync}</p>
                <p className="text-2xl font-bold">{products.filter((p) => hasRichHtmlDescription(p)).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.contentOptimization.search.placeholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}>
                {viewMode === "grid" ? <List className="h-4 w-4 mr-2" /> : <Grid3x3 className="h-4 w-4 mr-2" />}
                {viewMode === "grid" ? "Liste" : "Grille"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!canDoAction("optimizations")) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowOptimizationConfirm(true);
                }}
                disabled={generating || selectedProducts.size === 0}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {t.contentOptimization.buttons.optimize} ({selectedProducts.size})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!canDoAction("optimizations")) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  // Auto-détecter si les produits ont des variantes
                  const selectedProductsList = products.filter((p) => selectedProducts.has(p.id));
                  const hasVariants = selectedProductsList.some((p) => p.variants && p.variants.length > 0);
                  setWhiteBgApplyTo(hasVariants ? "variants" : "simple");
                  setShowWhiteBgConfigDialog(true);
                  loadGalleryImages(Array.from(selectedProducts)); // Chargement en arrière-plan
                }}
                disabled={generatingWhiteBg || selectedProducts.size === 0}
              >
                {generatingWhiteBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {t.contentOptimization.buttons.whiteBg} ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  if (!canDoAction("optimizations")) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  // Charger les images AVANT d'ouvrir le dialogue
                  await loadGalleryImages(Array.from(selectedProducts));
                  setShowAiConfigDialog(true);
                }}
                disabled={generatingAiBg || selectedProducts.size === 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {generatingAiBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Palette className="h-4 w-4 mr-2" />
                )}
                {t.contentOptimization.buttons.aiBg} ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!canDoAction("optimizations")) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowSmartBgDialog(true);
                }}
                disabled={selectedProducts.size === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Smart Background ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!canDoAction("optimizations")) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowBulkLandingConfigDialog(true);
                }}
                disabled={generatingBulkLanding || selectedProducts.size === 0}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                {generatingBulkLanding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Landing Pages ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Alert */}
        <Alert className="bg-gradient-to-r from-primary/5 to-background border-primary/20">
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>{t.contentOptimization.tooltips.whiteBg}:</strong> {t.contentOptimization.alerts.whiteBg.split(': ')[1]}{' '}
            <strong>{t.contentOptimization.tooltips.aiBg}:</strong> {t.contentOptimization.alerts.aiBg.split(': ')[1]}
          </AlertDescription>
        </Alert>

        {/* Products Table/Grid */}
        <Card className="overflow-hidden">
          {viewMode === "table" ? (
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-20">{t.contentOptimization.table.headers.image}</TableHead>
                      <TableHead>{t.contentOptimization.table.headers.title}</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {t.contentOptimization.table.headers.description}
                      </TableHead>
                      <TableHead className="w-32">{t.contentOptimization.table.headers.status}</TableHead>
                      <TableHead className="w-24">État</TableHead>
                      <TableHead className="w-48">{t.contentOptimization.table.headers.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setPreviewProduct(product);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => handleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{product.seo_title || product.title}</p>
                            {product.vendor && (
                              <Badge variant="outline" className="font-normal text-xs">
                                {product.vendor}
                              </Badge>
                            )}
                            {product.seo_title && product.title !== product.seo_title && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {t.contentOptimization.table.original}: {product.title}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-2">
                            {product.seo_description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{product.seo_description}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                {t.contentOptimization.table.noOptimizedDesc}
                              </p>
                            )}
                            {hasRichHtmlDescription(product) && (
                              <Badge variant="default" className="gap-1 text-xs">
                                <FileText className="h-3 w-3" />
                                Landing
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasRichHtmlDescription(product) ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              ✨ {t.contentOptimization.table.status.premiumContent}
                            </Badge>
                          ) : product.seo_title || product.seo_description ? (
                            <Badge variant="secondary">{t.contentOptimization.table.status.basicContent} ✓</Badge>
                          ) : (
                            <Badge variant="outline">{t.contentOptimization.table.status.toOptimize}</Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!product.shopify_id) {
                                toast.error("Ce produit n'est pas synchronisé avec Shopify");
                                return;
                              }

                              if (!selectedStore) {
                                toast.error("Aucun store sélectionné");
                                return;
                              }

                              const newStatus = product.status === "active" ? "draft" : "active";
                              const toastId = toast.loading("Mise à jour du statut...");

                              try {
                                // Get current session to pass auth token
                                const {
                                  data: { session },
                                } = await supabase.auth.getSession();
                                if (!session) {
                                  throw new Error("Session non trouvée");
                                }

                                const { data, error } = await supabase.functions.invoke("update-product-status", {
                                  headers: {
                                    Authorization: `Bearer ${session.access_token}`,
                                  },
                                  body: {
                                    productId: product.id,
                                    shopifyId: product.shopify_id,
                                    storeId: selectedStore.id,
                                    newStatus,
                                  },
                                });

                                if (error) throw error;
                                if (!data?.success) throw new Error(t.productTitleDescription.toasts.updateFailed);

                                setProducts((prev) =>
                                  prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)),
                                );

                                // Show success message for Shopify sync
                                toast.success(newStatus === "active" ? t.productTitleDescription.toasts.productPublished : t.productTitleDescription.toasts.productDraft, {
                                  id: toastId,
                                });
                              } catch (error) {
                                console.error("Error updating status:", error);
                                toast.error(t.productTitleDescription.toasts.statusUpdateError, { id: toastId });
                              }
                            }}
                            className={`gap-2 ${product.status === "active" ? "text-green-600" : "text-muted-foreground"}`}
                          >
                            {product.status === "active" ? (
                              <>
                                <Power className="h-4 w-4" />
                                <span className="hidden xl:inline">Actif</span>
                              </>
                            ) : (
                              <>
                                <PowerOff className="h-4 w-4" />
                                <span className="hidden xl:inline">Brouillon</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Vérifier les limites AVANT d'ouvrir le dialog
                                    if (!canDoAction("optimizations")) {
                                      toast.error(t.contentOptimization.toasts.limitReached);
                                      setShowUpgradeDialog(true);
                                      return;
                                    }
                                    setSelectedProducts(new Set([product.id]));
                                    // Auto-détecter si le produit a des variantes
                                    const hasVariants = product.variants && product.variants.length > 0;
                                    setWhiteBgApplyTo(hasVariants ? "variants" : "simple");
                                    setShowWhiteBgConfigDialog(true);
                                    loadGalleryImages([product.id]); // Chargement en arrière-plan
                                  }}
                                  disabled={generatingWhiteBg}
                                >
                                  {generatingWhiteBg && selectedProducts.has(product.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.contentOptimization.tooltips.whiteBg}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Vérifier les limites AVANT d'ouvrir le dialog
                                    if (!canDoAction("optimizations")) {
                                      toast.error(t.contentOptimization.toasts.limitReached);
                                      setShowUpgradeDialog(true);
                                      return;
                                    }
                                    setSelectedProducts(new Set([product.id]));
                                    // Charger les images AVANT d'ouvrir le dialogue
                                    await loadGalleryImages([product.id]);
                                    setShowAiConfigDialog(true);
                                  }}
                                  disabled={generatingAiBg}
                                  className="hover:bg-purple-50 dark:hover:bg-purple-950"
                                >
                                  {generatingAiBg && selectedProducts.has(product.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Palette className="h-4 w-4 text-purple-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.contentOptimization.tooltips.aiBg}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Vérifier les limites AVANT d'ouvrir le dialog
                                    if (!canDoAction("optimizations")) {
                                      toast.error(t.contentOptimization.toasts.limitReached);
                                      setShowUpgradeDialog(true);
                                      return;
                                    }
                                    setSelectedLandingProduct(product);
                                    setShowLandingConfigDialog(true);
                                  }}
                                  className="hover:bg-primary/10"
                                >
                                  <Sparkles className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.contentOptimization.tooltips.generateLanding}</p>
                              </TooltipContent>
                            </Tooltip>

                            {product.shopify_id && (hasRichHtmlDescription(product) || product.seo_title) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const toastId = toast.loading(t.contentOptimization.buttons.synchronizing);
                                      try {
                                        const { error } = await supabase.functions.invoke("sync-seo-to-shopify", {
                                          body: {
                                            productId: product.id,
                                            shopifyId: product.shopify_id,
                                            seoTitle: product.seo_title,
                                            seoDescription: product.seo_description,
                                          },
                                        });

                                        if (error) throw error;
                                        toast.success(t.contentOptimization.toasts.productsSynced, { id: toastId });
                                      } catch (error) {
                                        console.error("Sync error:", error);
                                        toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
                                      }
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t.contentOptimization.tooltips.sync}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductToDelete(product);
                                    setShowDeleteDialog(true);
                                  }}
                                  disabled={deletingProductId === product.id}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  {deletingProductId === product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supprimer le produit</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">{t.contentOptimization.empty.title}</div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div className="p-4">
              <TooltipProvider>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                      onClick={() => {
                        setPreviewProduct(product);
                        setShowPreviewDialog(true);
                      }}
                    >
                      {/* Image with action buttons */}
                      <div className="aspect-square bg-muted/50 relative overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryProduct(product);
                              setShowGalleryDialog(true);
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryProduct(product);
                              setShowGalleryDialog(true);
                            }}
                          >
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Status badge - top left - CLICKABLE */}
                        <div className="absolute top-2 left-2">
                          <Badge
                            className={`cursor-pointer transition-all hover:scale-105 ${
                              product.status === "active"
                                ? "bg-green-600 text-white shadow-sm hover:bg-green-700"
                                : "bg-gray-100 text-gray-600 shadow-sm hover:bg-gray-200"
                            }`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!product.shopify_id) {
                                toast.error("Ce produit n'est pas synchronisé avec Shopify");
                                return;
                              }
                              if (!selectedStore) {
                                toast.error("Aucun store sélectionné");
                                return;
                              }
                              const newStatus = product.status === "active" ? "draft" : "active";
                              const toastId = toast.loading("Mise à jour du statut...");
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) throw new Error("Session non trouvée");
                                const { data, error } = await supabase.functions.invoke("update-product-status", {
                                  body: {
                                    productId: product.id,
                                    shopifyId: product.shopify_id,
                                    newStatus: newStatus,
                                    storeId: selectedStore.id,
                                  },
                                });
                                if (error) throw error;
                                if (!data?.success) throw new Error("Échec de la mise à jour");
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
                                );
                                toast.success(newStatus === "active" ? "Produit publié" : "Produit en brouillon", { id: toastId });
                              } catch (error) {
                                console.error("Error updating status:", error);
                                toast.error("Erreur lors de la mise à jour du statut", { id: toastId });
                              }
                            }}
                          >
                            {product.status === "active" ? (
                              <>
                                <Power className="h-3 w-3 mr-1" />
                                Actif
                              </>
                            ) : (
                              <>
                                <PowerOff className="h-3 w-3 mr-1" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Action buttons - always visible */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canDoAction("optimizations")) {
                                    toast.error(t.contentOptimization.toasts.limitReached);
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  setSelectedProducts(new Set([product.id]));
                                  // Auto-détecter si le produit a des variantes
                                  const hasVariants = product.variants && product.variants.length > 0;
                                  setWhiteBgApplyTo(hasVariants ? "variants" : "simple");
                                  setShowWhiteBgConfigDialog(true);
                                  loadGalleryImages([product.id]);
                                }}
                                disabled={generatingWhiteBg}
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.contentOptimization.tooltips.whiteBg}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!canDoAction("optimizations")) {
                                    toast.error(t.contentOptimization.toasts.limitReached);
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  setSelectedProducts(new Set([product.id]));
                                  await loadGalleryImages([product.id]);
                                  setShowAiConfigDialog(true);
                                }}
                                disabled={generatingAiBg}
                              >
                                <Palette className="h-4 w-4 text-purple-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.contentOptimization.tooltips.aiBg}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canDoAction("optimizations")) {
                                    toast.error(t.contentOptimization.toasts.limitReached);
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  setSelectedLandingProduct(product);
                                  setShowLandingConfigDialog(true);
                                }}
                              >
                                <Sparkles className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.contentOptimization.tooltips.generateLanding}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!canDoAction("optimizations")) {
                                    toast.error(t.contentOptimization.toasts.limitReached);
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  setSelectedProducts(new Set([product.id]));
                                  setShowSmartBgDialog(true);
                                }}
                              >
                                <Wand2 className="h-4 w-4 text-emerald-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Smart Background</p>
                            </TooltipContent>
                          </Tooltip>

                          {product.shopify_id && (hasRichHtmlDescription(product) || product.seo_title) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const toastId = toast.loading(t.contentOptimization.buttons.synchronizing);
                                    try {
                                      const { error } = await supabase.functions.invoke("sync-seo-to-shopify", {
                                        body: {
                                          productId: product.id,
                                          shopifyId: product.shopify_id,
                                          seoTitle: product.seo_title,
                                          seoDescription: product.seo_description,
                                        },
                                      });

                                      if (error) throw error;
                                      toast.success(t.contentOptimization.toasts.productsSynced, { id: toastId });
                                    } catch (error) {
                                      console.error("Error syncing:", error);
                                      toast.error("Erreur lors de la synchronisation", { id: toastId });
                                    }
                                  }}
                                >
                                  <Upload className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.contentOptimization.tooltips.sync}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-white/90 hover:bg-white hover:bg-destructive/10 shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProductToDelete(product);
                                  setShowDeleteDialog(true);
                                }}
                                disabled={deletingProductId === product.id}
                              >
                                {deletingProductId === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Supprimer le produit</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Product info */}
                      <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => handleSelectProduct(product.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                              {product.seo_title || product.title}
                            </h3>
                            <input
                              type="text"
                              defaultValue={product.vendor || ''}
                              placeholder="Marque..."
                              className="text-xs border rounded px-1.5 py-0.5 w-full max-w-[140px] bg-background"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={async (e) => {
                                const newVendor = e.target.value.trim();
                                if (newVendor !== (product.vendor || '')) {
                                  try {
                                    await supabase
                                      .from('shopify_products')
                                      .update({ vendor: newVendor })
                                      .eq('id', product.id);
                                    setProducts(prev => prev.map(p => 
                                      p.id === product.id ? { ...p, vendor: newVendor } : p
                                    ));
                                    toast.success('Marque mise à jour');
                                  } catch (error) {
                                    toast.error('Erreur lors de la mise à jour');
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          SKU: {(product as any).sku || (product as any).variants?.[0]?.sku || '—'}
                        </p>
                        
                        {/* Price info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Prix: </span>
                            <span className="font-medium">
                              {(product as any).variants?.[0]?.price 
                                ? `${Number((product as any).variants[0].price).toFixed(2)} €` 
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Coût: </span>
                            <span className="font-medium">
                              {(product as any).variants?.[0]?.cost_price 
                                ? `${Number((product as any).variants[0].cost_price).toFixed(2)} €` 
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {hasRichHtmlDescription(product) ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Landing
                              </Badge>
                            ) : product.seo_title || product.seo_description ? (
                              <Badge variant="secondary" className="text-xs">
                                {t.contentOptimization.table.status.basicContent} ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t.contentOptimization.table.status.toOptimize}
                              </Badge>
                            )}
                          </div>
                          {/* Status toggle button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!product.shopify_id) {
                                toast.error("Ce produit n'est pas synchronisé avec Shopify");
                                return;
                              }
                              if (!selectedStore) {
                                toast.error("Aucun store sélectionné");
                                return;
                              }
                              const newStatus = product.status === "active" ? "draft" : "active";
                              const toastId = toast.loading("Mise à jour du statut...");
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) throw new Error("Session non trouvée");
                                const { data, error } = await supabase.functions.invoke("update-product-status", {
                                  body: {
                                    productId: product.id,
                                    shopifyId: product.shopify_id,
                                    newStatus: newStatus,
                                    storeId: selectedStore.id,
                                  },
                                });
                                if (error) throw error;
                                if (!data?.success) throw new Error("Échec de la mise à jour");
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
                                );
                                toast.success(newStatus === "active" ? "Produit publié" : "Produit en brouillon", { id: toastId });
                              } catch (error) {
                                console.error("Error updating status:", error);
                                toast.error("Erreur lors de la mise à jour du statut", { id: toastId });
                              }
                            }}
                            className={`h-6 px-2 text-xs ${product.status === "active" ? "text-green-600" : "text-muted-foreground"}`}
                          >
                            {product.status === "active" ? "Actif" : "Draft"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TooltipProvider>

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">{t.contentOptimization.empty.title}</div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center py-4 border-t overflow-x-auto">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      {/* White Background Configuration Dialog */}
      <Dialog open={showWhiteBgConfigDialog} onOpenChange={setShowWhiteBgConfigDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-primary" />
              {t.contentOptimization.dialogs.whiteBg.title}
            </DialogTitle>
            <DialogDescription>{t.contentOptimization.dialogs.whiteBg.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Mode Selection: Standard vs Google Shopping */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Mode de génération</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    whiteBgMode === "standard"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setWhiteBgMode("standard")}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      whiteBgMode === "standard" ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {whiteBgMode === "standard" && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Standard</h4>
                      <p className="text-xs text-muted-foreground">Fond blanc simple</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    whiteBgMode === "google_shopping"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setWhiteBgMode("google_shopping")}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      whiteBgMode === "google_shopping" ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {whiteBgMode === "google_shopping" && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Google Shopping</h4>
                      <p className="text-xs text-muted-foreground">Optimisé SERP & CTR</p>
                    </div>
                  </div>
                </div>
              </div>
              {whiteBgMode === "google_shopping" && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Mode Google Shopping :</strong> Fond blanc pur (#FFFFFF), ombre légère naturelle, bords nets, centrage parfait, sans texte ni logo. Optimisé pour un CTR maximal sur Google Merchant Center.
                  </p>
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Format d'image</Label>
              <Select value={selectedImageFormat} onValueChange={setSelectedImageFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1:1)</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                  <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gallery Image Selection */}
            {Array.from(selectedProducts).length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t.contentOptimization.dialogs.whiteBg.imageSelection}
                </Label>
                {Array.from(selectedProducts).map((productId) => {
                  const product = products.find((p) => p.id === productId);
                  const images = galleryImages.get(productId) || [];
                  const hasGallery = images.length > 0;

                  if (!product) return null;

                  return (
                    <Card key={productId} className="p-4">
                      <h4 className="font-semibold mb-3 text-sm">{product.title}</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {/* Image principale */}
                        <div
                          className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                            !selectedGalleryImages.get(productId) ||
                            selectedGalleryImages.get(productId) === product.image_url
                              ? "border-primary ring-2 ring-primary"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => {
                            const newMap = new Map(selectedGalleryImages);
                            newMap.set(productId, product.image_url!);
                            setSelectedGalleryImages(newMap);
                          }}
                        >
                          <img
                            src={product.image_url || ""}
                            alt={t.productTitleDescription.labels.mainImage}
                            className="w-full h-24 object-cover rounded"
                          />
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                            {t.productTitleDescription.labels.main}
                          </div>
                        </div>

                        {/* Images de galerie */}
                        {images.map((img, idx) => (
                          <div
                            key={img.id}
                            className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                              selectedGalleryImages.get(productId) === img.src
                                ? "border-primary ring-2 ring-primary"
                                : "border-muted hover:border-primary/50"
                            }`}
                            onClick={() => {
                              const newMap = new Map(selectedGalleryImages);
                              newMap.set(productId, img.src);
                              setSelectedGalleryImages(newMap);
                            }}
                          >
                            <img
                              src={img.src}
                              alt={img.alt_text || `Galerie ${idx + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <div className="absolute top-1 right-1 bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!hasGallery && (
                        <p className="text-xs text-muted-foreground mt-2">Aucune image de galerie disponible</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Sélection des variantes pour produits avec variantes */}
            {(() => {
              const selectedProductsList = Array.from(selectedProducts)
                .map((id) => products.find((p) => p.id === id))
                .filter(Boolean);

              // Ne montrer la section variantes que si au moins un produit a des variantes
              const productsWithVariants = selectedProductsList.filter(
                (product) => product?.variants && product.variants.length > 0,
              );

              if (productsWithVariants.length === 0) return null;

              return (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Sélection des variantes
                  </Label>
                  {productsWithVariants.map((product) => {
                    if (!product) return null;

                    // Pour produits avec variantes, afficher les variantes

                    return (
                      <Card
                        key={product.id}
                        className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20"
                      >
                        {/* Product Header avec Image */}
                        <div className="flex items-start gap-4 mb-4 pb-4 border-b">
                          {product.image_url && (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0 ring-2 ring-primary/20">
                              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-base line-clamp-2">{product.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                {product.variants.length} variante{product.variants.length > 1 ? "s" : ""}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {whiteBgSelectedVariants.get(product.id)?.length || 0} sélectionnée
                                {(whiteBgSelectedVariants.get(product.id)?.length || 0) > 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Selection Actions */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allVariantIds = product.variants?.map((v) => v.id) || [];
                              const newMap = new Map(whiteBgSelectedVariants);
                              newMap.set(product.id, allVariantIds);
                              setWhiteBgSelectedVariants(newMap);
                            }}
                            className="flex-1"
                          >
                            <Check className="mr-2 h-3.5 w-3.5" />
                            Tout sélectionner
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newMap = new Map(whiteBgSelectedVariants);
                              newMap.set(product.id, []);
                              setWhiteBgSelectedVariants(newMap);
                            }}
                            className="flex-1"
                          >
                            Tout désélectionner
                          </Button>
                        </div>

                        {/* Variants Grid */}
                        <ScrollArea className="max-h-[250px]">
                          <div className="grid gap-2 pr-3">
                            {product.variants.map((variant) => {
                              const isSelected = whiteBgSelectedVariants.get(product.id)?.includes(variant.id) || false;

                              return (
                                <Card
                                  key={variant.id}
                                  className={`p-3 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                                      : "hover:bg-accent/50 hover:border-primary/40"
                                  }`}
                                  onClick={() => {
                                    const currentVariants = whiteBgSelectedVariants.get(product.id) || [];
                                    const newVariants = isSelected
                                      ? currentVariants.filter((id) => id !== variant.id)
                                      : [...currentVariants, variant.id];
                                    const newMap = new Map(whiteBgSelectedVariants);
                                    newMap.set(product.id, newVariants);
                                    setWhiteBgSelectedVariants(newMap);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                      }`}
                                    >
                                      {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                                    </div>

                                    {/* Image de la variante */}
                                    {(() => {
                                      const productImages = galleryImages.get(product.id) || [];
                                      // Chercher l'image par image_id de la variante
                                      const variantImage = variant.image_id
                                        ? productImages.find((img) => img.id === variant.image_id)
                                        : undefined;
                                      const imageUrl = variantImage?.src || product.image_url;

                                      return imageUrl ? (
                                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-secondary flex-shrink-0 border">
                                          <img
                                            src={imageUrl}
                                            alt={variant.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : null;
                                    })()}

                                    <span className={`flex-1 text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                                      {variant.title}
                                    </span>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhiteBgConfigDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleWhiteBackground}
              disabled={whiteBgApplyTo === "variants" && Array.from(whiteBgSelectedVariants.values()).every(arr => arr.length === 0)}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhiteBackgroundPreviewDialog
        open={showWhiteBgDialog}
        onOpenChange={setShowWhiteBgDialog}
        previews={whiteBgPreviews}
        onApply={handleApplyWhiteBackground}
        onRegenerate={handleRegenerateWhiteBg}
      />

      {/* AI Background Dialog - Unifié */}
      <AiBackgroundDialog
        open={showAiConfigDialog}
        onOpenChange={setShowAiConfigDialog}
        selectedProducts={products.filter((p) => selectedProducts.has(p.id))}
        productImages={galleryImages}
        onConfirm={async (config: AiBackgroundConfig) => {
          // Si des variantes sont sélectionnées, afficher la confirmation
          if (config.applyTo === "variants" && config.selectedVariants.size > 0) {
            setPendingAiConfig(config);
            setShowAiConfigDialog(false);
            setShowVariantConfirmDialog(true);
            return;
          }

          // Sinon, continuer directement
          setShowAiConfigDialog(false);
          await generateAiBackgrounds(config);
        }}
      />

      {/* Dialogue de confirmation des variantes */}
      <VariantSelectionConfirmDialog
        open={showVariantConfirmDialog}
        onOpenChange={setShowVariantConfirmDialog}
        selectedProducts={products.filter((p) => selectedProducts.has(p.id))}
        selectedVariants={pendingAiConfig?.selectedVariants || new Map()}
        applyTo={pendingAiConfig?.applyTo || "simple"}
        onConfirm={async () => {
          setShowVariantConfirmDialog(false);
          if (pendingAiConfig) {
            // Si on vient du dialogue de config (avant génération)
            await generateAiBackgrounds(pendingAiConfig);
            setPendingAiConfig(null);
          } else if (pendingApplyProductIds.length > 0) {
            // Si on vient du dialogue de prévisualisation (après génération)
            setShowVariantConfirmDialog(false);
            await applyAiBackgroundImages(pendingApplyProductIds);
          }
        }}
      />

      <BackgroundDialog
        open={showAiBgDialog}
        onOpenChange={setShowAiBgDialog}
        previews={aiBgPreviews}
        onApply={handleApplyAiBackground}
        onRegenerate={handleRegenerateAiBg}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
      />

      <ProductTitleLandingDialog
        open={showLandingPreviewDialog}
        onOpenChange={setShowLandingPreviewDialog}
        products={optimizedProducts}
        isGenerating={isOptimizing}
        currentProcessing={currentProcessing}
        onCancel={generating ? handleCancelGeneration : undefined}
        onSync={handleSyncToShopify}
        syncLoading={syncingToShopify}
      />

      {/* Landing Config Dialog */}
      <LandingConfigDialog
        open={showLandingConfigDialog}
        onOpenChange={setShowLandingConfigDialog}
        onConfirm={handleLandingConfigConfirm}
        productTitle={selectedLandingProduct?.title}
      />

      {/* Bulk Landing Config Dialog */}
      <LandingConfigDialog
        open={showBulkLandingConfigDialog}
        onOpenChange={setShowBulkLandingConfigDialog}
        onConfirm={(config) => {
          setBulkLandingConfig(config);
          setShowBulkLandingConfigDialog(false);
          setShowBulkLandingDialog(true);
        }}
        productTitle={`${selectedProducts.size} produit(s) sélectionné(s)`}
      />

      {/* Bulk Landing Progress Dialog */}
      {showBulkLandingDialog && bulkLandingConfig && selectedStore && (
        <BulkLandingProgressDialog
          open={showBulkLandingDialog}
          onOpenChange={setShowBulkLandingDialog}
          products={products
            .filter(p => selectedProducts.has(p.id))
            .map(p => ({ id: p.id, title: p.title, image_url: p.image_url, vendor: p.vendor }))}
          config={bulkLandingConfig}
          storeId={selectedStore.id}
          onComplete={() => {
            fetchProducts();
            setSelectedProducts(new Set());
          }}
        />
      )}

      {/* Landing Page Generator Dialog */}
      <Dialog open={showLandingDialog} onOpenChange={setShowLandingDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {t.landingGeneration.dialog.title}
            </DialogTitle>
            <DialogDescription>{t.landingGeneration.dialog.description}</DialogDescription>
          </DialogHeader>
          {selectedLandingProduct && landingConfig && showLandingDialog && (
            <RegenerateLanding
              product={{
                ...selectedLandingProduct,
                // Utiliser seo_title si disponible pour synchronisation
                title: selectedLandingProduct.seo_title || selectedLandingProduct.title
              }}
              config={landingConfig}
              autoGenerate={true}
              onGenerated={async (html) => {
                console.log("🎉 [Landing] Generated HTML:", html.substring(0, 100));

                // Mettre à jour le state products immédiatement pour afficher le badge
                setProducts(prev => prev.map(p => 
                  p.id === selectedLandingProduct.id 
                    ? { ...p, landing_page: html, has_landing_page: true }
                    : p
                ));

                // Mettre à jour directement le produit avec le HTML généré
                const updatedProduct = {
                  ...selectedLandingProduct,
                  landing_page: html,
                  has_landing_page: true,
                };

                // Fermer le dialog de génération et ouvrir le preview immédiatement
                setShowLandingDialog(false);
                setPreviewProduct(updatedProduct);
                setShowPreviewDialog(true);

                // Rafraîchir le tableau en arrière-plan
                console.log("🔄 [Landing] Refreshing products table...");
                fetchProducts();
              }}
              onClose={() => setShowLandingDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <OptimizationConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onConfirm={handleConfigConfirm}
        productCount={filteredProducts.length}
        productImages={
          filteredProducts[0]?.id
            ? (galleryImages.get(filteredProducts[0].id) || []).map((img) => ({
                id: img.id,
                image_url: img.src,
                alt_text: img.alt_text || undefined,
              }))
            : []
        }
        mainImageUrl={filteredProducts[0]?.image_url}
      />

      <OptimizationConfirmDialog
        open={showOptimizationConfirm}
        onOpenChange={setShowOptimizationConfirm}
        onConfirm={() => handleOptimizeSelected()}
        selectedCount={selectedProducts.size}
        currentUsage={limits?.usage.optimizations_count || 0}
        maxOptimizations={limits?.limits.max_optimizations || 50}
        isTrialing={limits?.isTrialing || false}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count}
        limit={limits?.limits.max_optimizations}
        onUpgradeComplete={() => {
          refreshLimits();
          setShowUpgradeDialog(false);
        }}
      />

      {/* Removed ImageSelectionDialog - now integrated in AiBackgroundDialog */}

      <LandingPagePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        productId={previewProduct?.id || ""}
        productTitle={previewProduct?.title || ""}
        productHandle={previewProduct?.handle || ""}
        currentLandingPage={previewProduct?.landing_page}
        onGenerateClick={() => {
          if (previewProduct) {
            setSelectedLandingProduct(previewProduct);
            setShowLandingConfigDialog(true);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Supprimer le produit
            </DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer ce produit ?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold text-sm">{productToDelete?.title}</p>
              {productToDelete?.vendor && (
                <p className="text-xs text-muted-foreground mt-1">{productToDelete.vendor}</p>
              )}
            </div>
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>Attention :</strong> Cette action supprimera immédiatement le produit de Shopify et ne peut pas
                être annulée.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setProductToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!productToDelete) return;

                setDeletingProductId(productToDelete.id);
                const toastId = toast.loading("Suppression du produit...");

                try {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  if (!session) throw new Error(t.productTitleDescription.toasts.notAuthenticated);

                  const { data, error } = await supabase.functions.invoke("delete-shopify-product", {
                    body: { productId: productToDelete.id },
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  });

                  if (error) throw error;
                  if (!data.success) throw new Error(data.error || t.productTitleDescription.toasts.unknownError);

                  setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
                  toast.success(t.productTitleDescription.toasts.productDeleted, { id: toastId });
                  setShowDeleteDialog(false);
                  setProductToDelete(null);
                } catch (error) {
                  console.error("Error deleting product:", error);
                  toast.error(t.productTitleDescription.toasts.deleteError, { id: toastId });
                } finally {
                  setDeletingProductId(null);
                }
              }}
              disabled={deletingProductId === productToDelete?.id}
              className="gap-2"
            >
              {deletingProductId === productToDelete?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Gallery Dialog */}
      <ProductGalleryDialog
        open={showGalleryDialog}
        onOpenChange={setShowGalleryDialog}
        product={galleryProduct}
        storeId={selectedStore?.id || null}
      />

      {/* Smart Background Dialog */}
      <SmartBackgroundDialog
        open={showSmartBgDialog}
        onOpenChange={setShowSmartBgDialog}
        selectedProducts={products
          .filter(p => selectedProducts.has(p.id))
          .map(p => ({ 
            id: p.id, 
            title: p.title, 
            image_url: p.image_url, 
            vendor: p.vendor, 
            handle: p.handle,
            variants: p.variants?.map(v => ({ id: v.id, title: v.title, image_url: v.image_url }))
          }))}
        onComplete={() => {
          fetchProducts();
          refreshLimits();
        }}
        storeUrl={selectedStore?.store_url || null}
      />
    </div>
  );
}
