import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Plus, Search, Filter, Package, Grid3x3, List, ChevronDown, RefreshCw, Infinity } from "lucide-react";
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
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, currentPage]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, statusFilter, sortBy]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Count total products first
      const { count } = await supabase
        .from("shopify_products")
        .select("*", { count: 'exact', head: true })
        .eq("seller_id", user?.id);
      
      setTotalCount(count || 0);
      
      // Load products with pagination
      const { data, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      setProducts(data || []);
      console.log(`📦 Loaded ${data?.length || 0} products (page ${currentPage}/${Math.ceil((count || 0) / ITEMS_PER_PAGE)})`);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error(t.products.loadError);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
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
              variant="ghost"
              size="icon"
              onClick={async () => {
                refreshLimits();
                await loadProducts();
                toast.success(t.common.dataRefreshed);
              }}
              className="h-9 w-9 flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
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

        {/* Quick filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {t.common.all}
          </Button>
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
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => {
                  const discount = calculateDiscount(product.price, product.compare_at_price);

                  return (
                    <Card
                      key={product.id}
                      onClick={() => navigate(`/product-landing/${product.id}`)}
                      className="cursor-pointer border-0 shadow-sm overflow-hidden transition-all active:scale-95 bg-white"
                    >
                      <div className="aspect-square bg-muted/50 relative overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        {/* Discount badge */}
                        {discount && (
                          <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5 py-0">
                            -{discount}%
                          </Badge>
                        )}
                         {/* Status badge */}
                        <Badge
                          className={`absolute top-2 right-2 text-xs px-1.5 py-0 ${
                            product.status === "active" ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                          }`}
                        >
                          {product.status === "active" ? t.common.active : t.common.draft}
                        </Badge>
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
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">{product.vendor || t.products.noVendor}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              product.inventory_quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tf('products.stock', { count: formatNumber(product.inventory_quantity) })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
    </div>
  );
}
