import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Images,
  Loader2,
  Package,
  Palette,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useShopifySync } from "@/hooks/useShopifySync";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

type Product = {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  price: number | null;
  cost_price: number | null;
  compare_at_price: number | null;
  currency: string | null;
  image_url: string | null;
  inventory_quantity: number | null;
  inventory_managed?: boolean | null;
  handle?: string | null;
  sku?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

const ITEMS_PER_PAGE = 15;

export default function Products3x5View() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { syncShopifyStore, isSyncing } = useShopifySync();
  const { language } = useTranslation();
  const fr = language === "fr";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, selectedStore?.id]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / ITEMS_PER_PAGE));

  const loadProducts = async () => {
    if (!user?.id || !selectedStore?.id) {
      setProducts([]);
      setTotalCount(0);
      setFilteredCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const baseCount = supabase
        .from("shopify_products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);

      const { count: catalogCount, error: catalogError } = await baseCount;
      if (catalogError) throw catalogError;
      setTotalCount(catalogCount || 0);

      let countQuery = supabase
        .from("shopify_products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);

      // `sku` lives on product_variants, not shopify_products. Selecting it here
      // makes PostgREST reject the whole request with "column ... sku does not exist".
      let dataQuery = supabase
        .from("shopify_products")
        .select(
          "id, title, description, vendor, product_type, status, price, cost_price, compare_at_price, currency, image_url, inventory_quantity, inventory_managed, handle, created_at, updated_at, seo_title, seo_description",
        )
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);

      if (statusFilter !== "all") {
        countQuery = countQuery.eq("status", statusFilter);
        dataQuery = dataQuery.eq("status", statusFilter);
      }

      const keywords = debouncedSearch
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8);

      for (const keyword of keywords) {
        // Do not filter shopify_products by `sku`: that field belongs to product_variants.
        const filter = ["title", "vendor", "product_type", "handle"]
          .map((column) => `${column}.ilike.%${keyword}%`)
          .join(",");
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setFilteredCount(count || 0);

      const sort = (() => {
        if (sortBy === "name-asc") return { column: "title", ascending: true };
        if (sortBy === "name-desc") return { column: "title", ascending: false };
        if (sortBy === "price-asc") return { column: "price", ascending: true };
        if (sortBy === "price-desc") return { column: "price", ascending: false };
        return { column: "updated_at", ascending: false };
      })();

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, error } = await dataQuery
        .order(sort.column, { ascending: sort.ascending })
        .range(start, start + ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error: any) {
      console.error("[CATALOG_3X5] Failed to load products:", error);
      toast.error(fr ? "Impossible de charger les produits" : "Could not load products", {
        description: error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedStore?.id, currentPage, debouncedSearch, statusFilter, sortBy]);

  const toggleStatus = async (product: Product) => {
    const nextStatus = product.status === "active" ? "draft" : "active";
    try {
      setUpdatingStatusId(product.id);
      const { error } = await supabase
        .from("shopify_products")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (error) throw error;
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, status: nextStatus } : item)),
      );
      toast.success(nextStatus === "active" ? (fr ? "Produit activé" : "Product activated") : (fr ? "Produit en brouillon" : "Product moved to draft"));
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Statut non modifié" : "Status could not be changed"));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const syncCatalog = async () => {
    if (!selectedStore) return;
    await syncShopifyStore(selectedStore);
    await loadProducts();
  };

  const pageLabel = useMemo(
    () => fr ? `Page ${currentPage} sur ${totalPages}` : `Page ${currentPage} of ${totalPages}`,
    [currentPage, totalPages, fr],
  );

  return (
    <div className="space-y-5 pb-10">
      <WorkspacePageHeader
        section="Catalog"
        page="Products · 3×5"
        count={totalCount}
        title={fr ? "Produits" : "Products"}
        description={fr
          ? `${totalCount} produits · vue 3 × 5 · ${selectedStore?.store_name || "catalogue Shopify"}`
          : `${totalCount} products · 3 × 5 view · ${selectedStore?.store_name || "Shopify catalog"}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => void syncCatalog()} disabled={!selectedStore || isSyncing}>
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {fr ? "Synchroniser" : "Sync"}
          </Button>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={fr ? "Rechercher par produit, marque ou référence…" : "Search product, brand or handle…"}
              className="h-10 rounded-xl border-0 bg-slate-50 pl-9 shadow-none focus-visible:ring-1"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["active", "draft", "all"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "default" : "outline"}
                className={statusFilter === value ? "rounded-xl bg-violet-600 hover:bg-violet-700" : "rounded-xl"}
                onClick={() => setStatusFilter(value)}
              >
                {value === "active" ? (fr ? "Actif" : "Active") : value === "draft" ? "Draft" : (fr ? "Tous" : "All")}
              </Button>
            ))}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[165px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{fr ? "Plus récents" : "Most recent"}</SelectItem>
                <SelectItem value="name-asc">A → Z</SelectItem>
                <SelectItem value="name-desc">Z → A</SelectItem>
                <SelectItem value="price-asc">{fr ? "Prix croissant" : "Price low to high"}</SelectItem>
                <SelectItem value="price-desc">{fr ? "Prix décroissant" : "Price high to low"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid min-h-[460px] place-items-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div><Package className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">{fr ? "Aucun produit trouvé" : "No products found"}</p></div>
        </div>
      ) : (
        <TooltipProvider>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const currency = product.currency || "EUR";
              const hasSeo = Boolean(product.seo_title || product.seo_description);
              const stock = product.inventory_quantity ?? 0;

              return (
                <Card
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-50">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                    ) : (
                      <div className="grid h-full place-items-center"><Package className="h-10 w-10 text-slate-300" /></div>
                    )}

                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); void toggleStatus(product); }}
                      disabled={updatingStatusId === product.id}
                      className={`absolute left-3 top-3 flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-sm transition ${
                        product.status === "active"
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-white/95 text-slate-600 hover:bg-white"
                      }`}
                    >
                      {updatingStatusId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : product.status === "active" ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                      {product.status === "active" ? (fr ? "Actif" : "Active") : "Draft"}
                    </button>

                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                      <CardAction icon={<Eye className="h-4 w-4" />} label={fr ? "Ouvrir le produit" : "Open product"} onClick={() => navigate(`/products/${product.id}`)} />
                      <CardAction icon={<FileText className="h-4 w-4 text-violet-600" />} label={fr ? "Titre & description IA" : "AI title & description"} onClick={() => navigate(`/products/${product.id}`)} />
                      <CardAction icon={<Palette className="h-4 w-4 text-purple-600" />} label={fr ? "Arrière-plan IA" : "AI background"} onClick={() => navigate("/studio?mode=backgrounds")} />
                      <CardAction icon={<Images className="h-4 w-4 text-indigo-600" />} label="Product Shot AI" onClick={() => navigate("/studio?mode=shots")} />
                      <CardAction icon={<Wand2 className="h-4 w-4 text-emerald-600" />} label="Studio" onClick={() => navigate("/studio")} />
                    </div>
                  </div>

                  <div className="flex min-h-[240px] flex-1 flex-col space-y-3 p-4">
                    <div className="min-h-[3.25rem]">
                      <h3 className="line-clamp-2 text-[17px] font-semibold leading-6 text-slate-950">
                        {product.seo_title || product.title}
                      </h3>
                    </div>

                    <div className="flex min-h-6 flex-wrap items-center gap-2">
                      {product.vendor && <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">{product.vendor}</Badge>}
                      {hasSeo && <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]"><Sparkles className="mr-1 h-3 w-3" />SEO</Badge>}
                    </div>

                    <p className="font-mono text-xs text-slate-500">SKU : {product.sku || "—"}</p>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm">
                      <div><span className="text-slate-500">{fr ? "Prix" : "Price"}: </span><strong className="text-slate-950">{Number(product.price || 0).toFixed(2)} {currency === "EUR" ? "€" : currency}</strong></div>
                      <div><span className="text-slate-500">{fr ? "Coût" : "Cost"}: </span><span className="font-medium text-slate-800">{product.cost_price != null ? `${Number(product.cost_price).toFixed(2)} ${currency === "EUR" ? "€" : currency}` : "—"}</span></div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-xs text-slate-500">{product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</span>
                      <Badge variant="outline" className={stock > 0 ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700" : "rounded-full border-rose-200 bg-rose-50 text-rose-700"}>
                        {fr ? `${formatNumber(stock)} en stock` : `${formatNumber(stock)} in stock`}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      {filteredCount > ITEMS_PER_PAGE && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" className="rounded-xl" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            <ChevronLeft className="mr-1 h-4 w-4" />{fr ? "Précédent" : "Previous"}
          </Button>
          <span className="rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{pageLabel}</span>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
            {fr ? "Suivant" : "Next"}<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CardAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-xl border border-white/70 bg-white/95 shadow-md backdrop-blur hover:bg-white"
          onClick={(event) => { event.stopPropagation(); onClick(); }}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left"><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}
