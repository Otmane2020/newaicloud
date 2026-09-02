import { useState, useEffect } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useImageOptimization } from "@/hooks/useImageOptimization";
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
  Zap,
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
  Edit2,
  Save,
  X,
  Copy,
  Layers,
  Download,
  FileSpreadsheet,
  History,
  ShoppingCart,
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
import { SmartBulkLandingDialog } from "@/components/seo/SmartBulkLandingDialog";
import { AIImagesDialog } from "@/components/seo/AIImagesDialog";
import { BulkAIImagesDialog } from "@/components/seo/BulkAIImagesDialog";
import { SyncProgressDialog } from "@/components/seo/SyncProgressDialog";
import { exportProductsToCSV, exportProductsToExcel } from "@/lib/exportProducts";
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

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  optimization_count?: number | null;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  landing_page: string | null;
  landing_page_html: string | null;
  has_landing_page: boolean | null;
  last_landing_generation_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  optimized_title?: string | null;
  regenerated_title?: string | null;
  optimized_description?: string | null;
  body_html?: string | null;
  image_url: string | null;
  shopify_id: number | null;
  vendor: string | null;
  handle: string | null;
  status: string | null;
  tags?: string | null;
  product_type?: string | null;
  category?: string | null;
  sub_category?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  currency?: string | null;
  inventory_quantity?: number | null;
  ai_color?: string | null;
  ai_material?: string | null;
  ai_pattern?: string | null;
  ai_shape?: string | null;
  ai_texture?: string | null;
  ai_finish?: string | null;
  style?: string | null;
  room?: string | null;
  height?: number | null;
  height_unit?: string | null;
  width?: number | null;
  width_unit?: string | null;
  length?: number | null;
  length_unit?: string | null;
  ai_weight?: number | null;
  ai_weight_unit?: string | null;
  vision_ai_data?: any;
  variants?: ProductVariant[];
  gallery_images?: ProductImage[];
  collection_ids?: string[];
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  price?: number;
  cost_price?: number;
  sku?: string | null;
  shopify_variant_id?: number | null;
  image_id?: string | null;
  image_url?: string | null;
  compare_at_price?: number | null;
}

const hasRichHtmlDescription = (product: Product): boolean => {
  if (product.has_landing_page) return true;
  if (product.landing_page) {
    const hasHtmlTags =
      product.landing_page.includes("<div") ||
      product.landing_page.includes("<section") ||
      product.landing_page.includes("<h1") ||
      product.landing_page.includes("<article") ||
      product.landing_page.length > 500;
    if (hasHtmlTags) return true;
  }
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view") || "content";
  const workspace = requestedView === "landing" ? "landing" : requestedView === "images" || requestedView === "gallery" ? "images" : requestedView === "bulk" ? "bulk" : "content";
  const { t, tf, language } = useTranslation();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { selectedStore } = useStore();
  const { saveToHistory } = useImageOptimization();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
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
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [collectionSearchTerm, setCollectionSearchTerm] = useState<string>("");
  const [collections, setCollections] = useState<Array<{id: string, title: string}>>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showVariantConfirmDialog, setShowVariantConfirmDialog] = useState(false);
  const [pendingAiConfig, setPendingAiConfig] = useState<AiBackgroundConfig | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingApplyProductIds, setPendingApplyProductIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [whiteBgApplyTo, setWhiteBgApplyTo] = useState<"simple" | "variants">("simple");
  const [whiteBgSelectedVariants, setWhiteBgSelectedVariants] = useState<Map<string, string[]>>(new Map());
  const [showBulkLandingConfigDialog, setShowBulkLandingConfigDialog] = useState(false);
  const [showBulkLandingDialog, setShowBulkLandingDialog] = useState(false);
  const [bulkLandingConfig, setBulkLandingConfig] = useState<LandingConfig | null>(null);
  const [showSmartBulkLandingDialog, setShowSmartBulkLandingDialog] = useState(false);
  const [showSmartBulkLandingConfig, setShowSmartBulkLandingConfig] = useState(false);
  const [generatingBulkLanding, setGeneratingBulkLanding] = useState(false);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [showSmartBgDialog, setShowSmartBgDialog] = useState(false);
  const [showAIImagesDialog, setShowAIImagesDialog] = useState(false);
  const [showBulkAIImagesDialog, setShowBulkAIImagesDialog] = useState(false);
  const [showSyncProgressDialog, setShowSyncProgressDialog] = useState(false);
  const [syncProducts, setSyncProducts] = useState<Product[]>([]);
  const [editingField, setEditingField] = useState<{productId: string, field: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [savingField, setSavingField] = useState<boolean>(false);

  useEffect(() => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm("");
    setStatusFilter("all");
    setCollectionFilter("all");
    setCollectionSearchTerm("");
    setCurrentPage(1);
    if (selectedStore?.id) {
      fetchProducts();
      fetchCollections();
    }
  }, [selectedStore]);

  const fetchCollections = async () => {
    if (!selectedStore) return;
    try {
      const { data, error } = await supabase
        .from("shopify_collections")
        .select("id, title")
        .eq("store_id", selectedStore.id)
        .order("title");
      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const fetchProducts = async () => {
    if (!selectedStore) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;
      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        const { data: pageData, error: pageError } = await supabase
          .from("shopify_products")
          .select("id, title, description, landing_page, has_landing_page, last_landing_generation_at, seo_title, seo_description, optimized_title, regenerated_title, optimized_description, image_url, shopify_id, vendor, handle, status, tags, product_type, category, sub_category, price, compare_at_price, cost_price, currency, inventory_quantity, store_id, collection_ids")
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id)
          .range(start, end)
          .order("imported_at", { ascending: false });
        if (pageError) throw pageError;
        if (pageData && pageData.length > 0) {
          allProducts = [...allProducts, ...pageData];
          if (pageData.length < PAGE_SIZE) hasMore = false;
          else page++;
        } else hasMore = false;
      }
      const rawProductsData = guardStoreData(allProducts, selectedStore.id, "product");
      if (rawProductsData && rawProductsData.length > 0) {
        setProducts(rawProductsData as Product[]);
        const productIds = rawProductsData.map((p) => p.id);
        let allVariants: any[] = [];
        let allImages: any[] = [];
        const batchSize = 50;
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          const [variantsResult, imagesResult] = await Promise.all([
            supabase.from("product_variants").select("id, product_id, title, option1, option2, option3, image_url, sku, price, compare_at_price, cost_price, shopify_variant_id").in("product_id", batch),
            supabase.from("product_images").select("id, product_id, src, alt_text, position").in("product_id", batch).order("position", { ascending: true }),
          ]);
          if (variantsResult.data) allVariants = [...allVariants, ...variantsResult.data];
          if (imagesResult.data) allImages = [...allImages, ...imagesResult.data];
        }
        const productsWithData = rawProductsData.map((product) => ({
          ...product,
          variants: allVariants.filter((v) => v.product_id === product.id),
          gallery_images: allImages.filter((img) => img.product_id === product.id),
        }));
        setProducts(productsWithData as Product[]);
        verifyStateCoherence(productsWithData, selectedStore.id, "ProductTitleDescription", "product");
      } else setProducts([]);
    } catch (error) {
      console.error("Error fetching products:", error);
      if (products.length === 0) toast.error(language === "fr" ? "Impossible de charger le catalogue produit" : "Unable to load product catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && products.length === 0 && selectedStore) setShowImportDialog(true);
  }, [loading, products.length, selectedStore]);

  const filteredProducts = products.filter((product) => {
    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return "";
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    };
    const searchKeywords = normalizeText(searchTerm).split(" ").filter((k) => k.length > 0);
    if (searchKeywords.length === 0) {
      if (collectionFilter !== "all") {
        const productCollectionIds = Array.isArray(product.collection_ids) ? product.collection_ids : [];
        if (!productCollectionIds.includes(collectionFilter)) return false;
      }
      if (statusFilter === "optimized") return hasRichHtmlDescription(product);
      if (statusFilter === "notOptimized") return !hasRichHtmlDescription(product);
      if (statusFilter === "toSync") return hasRichHtmlDescription(product);
      return true;
    }
    const searchableText = normalizeText([
      product.title, product.vendor, product.description, product.seo_title, product.seo_description,
      product.handle, product.status,
      ...(product.variants?.map((v) => [v.title, v.option1, v.option2, v.option3].filter(Boolean).join(" ")) || []),
    ].filter(Boolean).join(" "));
    if (!searchKeywords.every((keyword) => searchableText.includes(keyword))) return false;
    if (collectionFilter !== "all") {
      const productCollectionIds = Array.isArray(product.collection_ids) ? product.collection_ids : [];
      if (!productCollectionIds.includes(collectionFilter)) return false;
    }
    if (statusFilter === "optimized") return hasRichHtmlDescription(product);
    if (statusFilter === "notOptimized") return !hasRichHtmlDescription(product);
    if (statusFilter === "toSync") return hasRichHtmlDescription(product);
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, collectionFilter]);

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) setSelectedProducts(new Set());
    else setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
  };
  const handleSelectProduct = (productId: string) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) next.delete(productId); else next.add(productId);
    setSelectedProducts(next);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <WorkspacePageHeader
          section="Content"
          page={workspace === "content" ? "Product Optimizer" : workspace === "landing" ? "Landing Pages" : workspace === "images" ? "AI Images" : "Bulk Actions"}
          count={products.length}
          title={workspace === "content" ? "Product Optimizer" : workspace === "landing" ? "Product Landing Pages" : workspace === "images" ? "AI Image Studio" : "Bulk Optimization"}
          description={workspace === "content" ? "Improve titles and descriptions for selected Shopify products." : workspace === "landing" ? "Create richer product pages from your existing catalog data." : workspace === "images" ? "Create or improve product visuals without changing the product itself." : "Apply one controlled operation to several selected products."}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-muted/30 rounded-lg border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t.contentOptimization.search.placeholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 bg-background" />
          </div>
          <Select value={collectionFilter} onValueChange={(value) => { setCollectionFilter(value); setCollectionSearchTerm(""); }}>
            <SelectTrigger className="w-full sm:w-[280px] h-10 bg-background"><SelectValue placeholder={t.contentOptimization.filters.selectCollection} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.contentOptimization.filters.allCollections}</SelectItem>
              {collections.filter((collection) => collectionSearchTerm === "" || collection.title.toLowerCase().includes(collectionSearchTerm.toLowerCase())).map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>{collection.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center overflow-hidden rounded-lg border bg-background">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} className="rounded-none px-3"><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="rounded-none px-3"><Grid3x3 className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {viewMode === "table" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-12"><Checkbox checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0} onCheckedChange={handleSelectAll} /></TableHead><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell><Checkbox checked={selectedProducts.has(product.id)} onCheckedChange={() => handleSelectProduct(product.id)} /></TableCell>
                      <TableCell>{product.image_url ? <img src={product.image_url} alt={product.title} className="w-12 h-12 object-cover rounded" /> : <Package className="h-6 w-6" />}</TableCell>
                      <TableCell>{product.seo_title || product.title}</TableCell>
                      <TableCell>{hasRichHtmlDescription(product) ? <Badge>Optimisé</Badge> : <Badge variant="outline">À optimiser</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4">
              <div className={`grid gap-4 ${gridColumns === 2 ? "grid-cols-1 sm:grid-cols-2" : gridColumns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className="group overflow-hidden flex flex-col">
                    <div className="aspect-square bg-muted/50 relative">
                      {product.image_url ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground" /></div>}
                      <div className="absolute top-2 left-2"><Badge className={product.status === "active" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}>{product.status === "active" ? "Actif" : "Draft"}</Badge></div>
                    </div>
                    <div className="flex-1 flex flex-col p-4 space-y-3">
                      <h3 className="font-semibold text-sm line-clamp-2">{product.seo_title || product.title}</h3>
                      {product.vendor && <Badge variant="outline" className="w-fit text-[10px]">{product.vendor}</Badge>}
                      <p className="text-xs text-muted-foreground font-mono">SKU: {product.variants?.[0]?.sku || "—"}</p>
                      <div className="mt-auto flex items-center justify-between border-t pt-3">
                        <Checkbox checked={selectedProducts.has(product.id)} onCheckedChange={() => handleSelectProduct(product.id)} />
                        {hasRichHtmlDescription(product) ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Optimisé</Badge> : <Badge variant="outline">À optimiser</Badge>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center py-4 border-t overflow-x-auto">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem><PaginationPrevious onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) return <PaginationItem key={page}><PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink></PaginationItem>;
                    if (page === currentPage - 2 || page === currentPage + 2) return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>;
                    return null;
                  })}
                  <PaginationItem><PaginationNext onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
