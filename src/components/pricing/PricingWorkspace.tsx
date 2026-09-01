import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeDollarSign,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketSelectorDialog } from "@/components/seo/MarketSelectorDialog";
import { toast } from "sonner";

type Workspace = "costs" | "competitors" | "recommendations";

type Competitor = {
  source?: string;
  title?: string;
  price?: number;
  currency?: string;
  url?: string;
  similarity?: number;
};

type Variant = {
  id: string;
  title: string | null;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
};

type PricingProduct = {
  id: string;
  title: string;
  vendor: string | null;
  image_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  shipping_cost: number | null;
  currency: string | null;
  market_price: number | null;
  smart_price: number | null;
  ai_reasoning: string | null;
  competitors: Competitor[];
  shopify_id: number | null;
  product_variants: Variant[];
};

const markets = [
  { code: "fr", label: "France" },
  { code: "be", label: "Belgique" },
  { code: "de", label: "Allemagne" },
  { code: "es", label: "Espagne" },
  { code: "it", label: "Italie" },
  { code: "uk", label: "Royaume-Uni" },
  { code: "nl", label: "Pays-Bas" },
  { code: "ch", label: "Suisse" },
];

const PAGE_SIZE = 50;

export function PricingWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const workspace: Workspace = requestedTab === "competitors"
    ? "competitors"
    : requestedTab === "recommendations"
      ? "recommendations"
      : "costs";

  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";

  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [taxRate, setTaxRate] = useState(20);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["fr"]);
  const [showMarkets, setShowMarkets] = useState(false);
  const [bulkMode, setBulkMode] = useState<"discount" | "increase">("discount");
  const [bulkAmount, setBulkAmount] = useState(0);
  const [page, setPage] = useState(1);

  const loadProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select(`
          id,title,vendor,image_url,price,compare_at_price,cost_price,shipping_cost,currency,
          market_price,smart_price,ai_reasoning,competitors,shopify_id,
          product_variants(id,title,sku,price,compare_at_price,cost_price)
        `)
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;

      setProducts((data || []).map((product: any) => ({
        ...product,
        competitors: Array.isArray(product.competitors) ? product.competitors : [],
        product_variants: Array.isArray(product.product_variants) ? product.product_variants : [],
      })) as PricingProduct[]);
    } catch (error: any) {
      console.error("[PRICING] load failed", error);
      toast.error(fr ? "Impossible de charger les prix" : "Unable to load pricing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
    loadProducts();
  }, [selectedStore?.id]);

  useEffect(() => {
    setPage(1);
  }, [query, workspace]);

  const displayProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.title.toLowerCase().includes(q) ||
      (product.vendor || "").toLowerCase().includes(q) ||
      product.product_variants.some((variant) => (variant.sku || "").toLowerCase().includes(q)),
    );
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(displayProducts.length / PAGE_SIZE));
  const pageProducts = displayProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedProducts = products.filter((product) => selected.has(product.id));
  const selectedCount = selected.size;

  const effectivePrice = (product: PricingProduct) =>
    product.price ?? product.product_variants[0]?.price ?? 0;

  const effectiveCost = (product: PricingProduct) =>
    product.cost_price ?? product.product_variants[0]?.cost_price ?? 0;

  const margin = (product: PricingProduct) => {
    const price = effectivePrice(product);
    const cost = effectiveCost(product);
    const shipping = product.shipping_cost || 0;
    if (!price) return { value: 0, percent: 0 };
    const netBeforeTax = (price - shipping) / (1 + taxRate / 100);
    const value = netBeforeTax - cost;
    return { value, percent: cost > 0 ? (value / cost) * 100 : 0 };
  };

  const money = (value: number | null | undefined, currency = "EUR") => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    try {
      return new Intl.NumberFormat(fr ? "fr-FR" : "en-US", {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 2,
      }).format(Number(value));
    } catch {
      return `${Number(value).toFixed(2)} €`;
    }
  };

  const updateField = async (
    productId: string,
    field: "price" | "cost_price" | "shipping_cost",
    value: number | null,
  ) => {
    setProducts((current) => current.map((product) =>
      product.id === productId ? { ...product, [field]: value } : product,
    ));

    const { error } = await supabase
      .from("shopify_products")
      .update({ [field]: value } as any)
      .eq("id", productId);

    if (error) {
      toast.error(fr ? "Modification non enregistrée" : "Change was not saved");
      loadProducts();
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const allPageSelected = pageProducts.length > 0 && pageProducts.every((product) => selected.has(product.id));
    setSelected((current) => {
      const next = new Set(current);
      pageProducts.forEach((product) => {
        if (allPageSelected) next.delete(product.id);
        else next.add(product.id);
      });
      return next;
    });
  };

  const importCosts = async () => {
    try {
      setBusy("import-costs");
      const { data, error } = await supabase.functions.invoke("import-costs-from-shopify", {
        body: { storeId: selectedStore?.id },
      });
      if (error) throw error;
      toast.success(fr ? `${data?.imported || 0} coûts importés` : `${data?.imported || 0} costs imported`);
      await loadProducts();
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Import des coûts impossible" : "Could not import costs"));
    } finally {
      setBusy(null);
    }
  };

  const applyBulk = async () => {
    const targets = selectedCount > 0 ? selectedProducts : displayProducts;
    if (!targets.length || bulkAmount <= 0) return;

    try {
      setBusy("bulk");
      for (const product of targets) {
        const current = effectivePrice(product);
        const factor = bulkMode === "discount" ? 1 - bulkAmount / 100 : 1 + bulkAmount / 100;
        const nextPrice = Math.max(0, Math.round(current * factor * 100) / 100);
        const update: Record<string, number | null> = { price: nextPrice };
        if (bulkMode === "discount") update.compare_at_price = current;
        const { error } = await supabase.from("shopify_products").update(update).eq("id", product.id);
        if (error) throw error;
      }
      toast.success(fr ? "Prix mis à jour" : "Prices updated");
      await loadProducts();
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Mise à jour impossible" : "Update failed"));
    } finally {
      setBusy(null);
    }
  };

  const analyzeMarket = async () => {
    const targets = selectedCount > 0 ? selectedProducts : displayProducts;
    if (!targets.length) return;

    try {
      setBusy("analyze");
      const { data, error } = await supabase.functions.invoke("analyze-competitor-pricing", {
        body: {
          productIds: targets.map((product) => product.id),
          taxRate,
          markets: selectedMarkets,
        },
      });
      if (error) throw error;
      if (!data?.results) throw new Error(fr ? "Réponse d'analyse invalide" : "Invalid analysis response");

      for (const result of data.results) {
        if (!result?.productId || result.error) continue;
        await supabase
          .from("shopify_products")
          .update({
            market_price: result.marketPrice || result.pricing?.median || null,
            smart_price: result.smartPrice || result.pricing?.recommendedPrice || null,
            ai_reasoning: result.reasoning || null,
            competitors: result.competitors || [],
            last_pricing_analysis: new Date().toISOString(),
          })
          .eq("id", result.productId);
      }

      toast.success(fr ? "Analyse marché terminée" : "Market analysis complete");
      await loadProducts();
    } catch (error: any) {
      console.error("[PRICING] market analysis failed", error);
      toast.error(error?.message || (fr ? "Analyse impossible" : "Analysis failed"));
    } finally {
      setBusy(null);
    }
  };

  const applyAndSyncRecommendations = async () => {
    const targets = (selectedCount > 0 ? selectedProducts : displayProducts)
      .filter((product) => product.smart_price != null);
    if (!targets.length) {
      toast.error(fr ? "Aucune recommandation à appliquer" : "No recommendations to apply");
      return;
    }

    try {
      setBusy("apply-sync");
      for (const product of targets) {
        const oldPrice = effectivePrice(product);
        const { error } = await supabase
          .from("shopify_products")
          .update({
            price: product.smart_price,
            compare_at_price: oldPrice || product.compare_at_price,
          })
          .eq("id", product.id);
        if (error) throw error;
      }

      const { error: syncError } = await supabase.functions.invoke("sync-pricing-to-shopify", {
        body: { product_ids: targets.map((product) => product.id) },
      });
      if (syncError) throw syncError;

      toast.success(fr ? `${targets.length} prix appliqués et synchronisés` : `${targets.length} prices applied and synced`);
      setSelected(new Set());
      await loadProducts();
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Application impossible" : "Could not apply recommendations"));
    } finally {
      setBusy(null);
    }
  };

  const syncCurrentPrices = async () => {
    const targets = selectedCount > 0 ? selectedProducts : displayProducts;
    if (!targets.length) return;
    try {
      setBusy("sync");
      const { error } = await supabase.functions.invoke("sync-pricing-to-shopify", {
        body: { product_ids: targets.map((product) => product.id) },
      });
      if (error) throw error;
      toast.success(fr ? "Prix synchronisés avec Shopify" : "Prices synced with Shopify");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Synchronisation impossible" : "Sync failed"));
    } finally {
      setBusy(null);
    }
  };

  if (!selectedStore) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        {fr ? "Sélectionnez une boutique pour gérer les prix." : "Select a store to manage pricing."}
      </Card>
    );
  }

  if (loading) {
    return <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  const title = workspace === "costs"
    ? (fr ? "Coûts & marges" : "Costs & Margins")
    : workspace === "competitors"
      ? (fr ? "Prix concurrents" : "Competitor Prices")
      : (fr ? "Recommandations" : "Recommendations");

  return (
    <div className="space-y-4">
      <WorkspacePageHeader
        section={fr ? "Tarification" : "Pricing"}
        page={title}
        count={products.length}
        title={title}
        description={
          workspace === "costs"
            ? (fr ? "Pilotez coût, prix et marge nette dans un seul tableau." : "Manage cost, selling price, and net margin in one table.")
            : workspace === "competitors"
              ? (fr ? "Comparez le marché uniquement quand vous en avez besoin." : "Run market comparisons only when you need them.")
              : (fr ? "Validez les Smart Prices avant toute modification Shopify." : "Review Smart Prices before any Shopify change.")
        }
      />

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
        {[
          { id: "costs", label: fr ? "Coûts & marges" : "Costs & margins", icon: Calculator },
          { id: "competitors", label: fr ? "Concurrents" : "Competitors", icon: Globe },
          { id: "recommendations", label: fr ? "Recommandations" : "Recommendations", icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            size="sm"
            variant={workspace === id ? "secondary" : "ghost"}
            className="h-8 gap-1.5"
            onClick={() => setSearchParams({ tab: id })}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </Button>
        ))}
      </div>

      <Card className="p-3 shadow-none">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={fr ? "Rechercher produit, marque ou SKU" : "Search product, vendor, or SKU"}
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{displayProducts.length} {fr ? "produits" : "products"}</Badge>
            {selectedCount > 0 && <Badge>{selectedCount} {fr ? "sélectionnés" : "selected"}</Badge>}

            {workspace === "costs" && (
              <>
                <div className="flex items-center gap-1 rounded-lg border px-2">
                  <span className="text-xs text-muted-foreground">TVA</span>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
                    className="h-8 w-16 border-0 px-1 text-right shadow-none focus-visible:ring-0"
                  />
                  <span className="text-xs">%</span>
                </div>
                <Button size="sm" variant="outline" onClick={importCosts} disabled={busy !== null}>
                  {busy === "import-costs" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                  {fr ? "Importer coûts" : "Import costs"}
                </Button>
                <Button size="sm" onClick={syncCurrentPrices} disabled={busy !== null}>
                  {busy === "sync" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                  {selectedCount > 0 ? (fr ? "Sync sélection" : "Sync selected") : (fr ? "Sync visibles" : "Sync visible")}
                </Button>
              </>
            )}

            {workspace === "competitors" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowMarkets(true)}>
                  <Globe className="mr-1.5 h-4 w-4" />
                  {selectedMarkets.length} {fr ? "marché(s)" : "market(s)"}
                </Button>
                <Button size="sm" onClick={analyzeMarket} disabled={busy !== null}>
                  {busy === "analyze" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {selectedCount > 0 ? (fr ? "Analyser sélection" : "Analyze selected") : (fr ? "Analyser visibles" : "Analyze visible")}
                </Button>
              </>
            )}

            {workspace === "recommendations" && (
              <>
                <Button size="sm" variant="outline" onClick={analyzeMarket} disabled={busy !== null}>
                  {busy === "analyze" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                  {fr ? "Actualiser" : "Refresh"}
                </Button>
                <Button size="sm" onClick={applyAndSyncRecommendations} disabled={busy !== null}>
                  {busy === "apply-sync" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                  {selectedCount > 0 ? (fr ? "Appliquer & sync" : "Apply & sync") : (fr ? "Appliquer visibles" : "Apply visible")}
                </Button>
              </>
            )}
          </div>
        </div>

        {workspace === "costs" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">{fr ? "Ajustement groupé" : "Bulk adjustment"}</span>
            <Select value={bulkMode} onValueChange={(value: "discount" | "increase") => setBulkMode(value)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">{fr ? "Réduction" : "Discount"}</SelectItem>
                <SelectItem value="increase">{fr ? "Hausse" : "Increase"}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-lg border">
              <Input
                type="number"
                min="0"
                max="100"
                value={bulkAmount || ""}
                onChange={(event) => setBulkAmount(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
                className="h-8 w-20 border-0 text-right shadow-none focus-visible:ring-0"
                placeholder="0"
              />
              <span className="pr-2 text-xs">%</span>
            </div>
            <Button size="sm" variant="secondary" onClick={applyBulk} disabled={bulkAmount <= 0 || busy !== null}>
              {busy === "bulk" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {selectedCount > 0 ? (fr ? "Appliquer sélection" : "Apply selected") : (fr ? "Appliquer visibles" : "Apply visible")}
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50/70 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2.5"><Checkbox checked={pageProducts.length > 0 && pageProducts.every((product) => selected.has(product.id))} onCheckedChange={togglePage} /></th>
                <th className="px-3 py-2.5">{fr ? "Produit" : "Product"}</th>
                {workspace === "costs" && <>
                  <th className="px-3 py-2.5">{fr ? "Prix" : "Price"}</th>
                  <th className="px-3 py-2.5">{fr ? "Coût" : "Cost"}</th>
                  <th className="px-3 py-2.5">{fr ? "Livraison" : "Shipping"}</th>
                  <th className="px-3 py-2.5">{fr ? "Marge nette" : "Net margin"}</th>
                </>}
                {workspace === "competitors" && <>
                  <th className="px-3 py-2.5">{fr ? "Prix actuel" : "Current"}</th>
                  <th className="px-3 py-2.5">{fr ? "Marché" : "Market"}</th>
                  <th className="px-3 py-2.5">{fr ? "Sources" : "Sources"}</th>
                  <th className="px-3 py-2.5">{fr ? "Écart" : "Gap"}</th>
                </>}
                {workspace === "recommendations" && <>
                  <th className="px-3 py-2.5">{fr ? "Actuel" : "Current"}</th>
                  <th className="px-3 py-2.5">{fr ? "Smart Price" : "Smart Price"}</th>
                  <th className="px-3 py-2.5">{fr ? "Variation" : "Change"}</th>
                  <th className="px-3 py-2.5">{fr ? "Pourquoi" : "Reason"}</th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageProducts.map((product) => {
                const price = effectivePrice(product);
                const cost = effectiveCost(product);
                const net = margin(product);
                const market = product.market_price;
                const smart = product.smart_price;
                const marketGap = market && price ? ((price - market) / market) * 100 : null;
                const smartChange = smart && price ? ((smart - price) / price) * 100 : null;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5"><Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggle(product.id)} /></td>
                    <td className="min-w-[260px] px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                          {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{product.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {product.vendor || (fr ? "Sans marque" : "No vendor")}
                            {product.product_variants.length > 1 ? ` · ${product.product_variants.length} variants` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {workspace === "costs" && <>
                      <td className="px-3 py-2.5"><CompactMoneyInput value={price} onCommit={(value) => updateField(product.id, "price", value)} /></td>
                      <td className="px-3 py-2.5"><CompactMoneyInput value={cost} onCommit={(value) => updateField(product.id, "cost_price", value)} /></td>
                      <td className="px-3 py-2.5"><CompactMoneyInput value={product.shipping_cost || 0} onCommit={(value) => updateField(product.id, "shipping_cost", value)} /></td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{money(net.value, product.currency || "EUR")}</div>
                        <div className={`text-xs ${net.percent < 0 ? "text-red-600" : net.percent < 20 ? "text-amber-600" : "text-emerald-600"}`}>{net.percent.toFixed(1)}%</div>
                      </td>
                    </>}

                    {workspace === "competitors" && <>
                      <td className="px-3 py-2.5 font-medium">{money(price, product.currency || "EUR")}</td>
                      <td className="px-3 py-2.5 font-medium">{money(market, product.currency || "EUR")}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline">{product.competitors.length}</Badge></td>
                      <td className="px-3 py-2.5">{marketGap == null ? "—" : <span className={Math.abs(marketGap) <= 5 ? "text-emerald-600" : "text-amber-600"}>{marketGap > 0 ? "+" : ""}{marketGap.toFixed(1)}%</span>}</td>
                    </>}

                    {workspace === "recommendations" && <>
                      <td className="px-3 py-2.5">{money(price, product.currency || "EUR")}</td>
                      <td className="px-3 py-2.5 font-semibold text-violet-700">{money(smart, product.currency || "EUR")}</td>
                      <td className="px-3 py-2.5">{smartChange == null ? "—" : <Badge variant="outline">{smartChange > 0 ? "+" : ""}{smartChange.toFixed(1)}%</Badge>}</td>
                      <td className="max-w-[360px] px-3 py-2.5 text-xs text-muted-foreground"><p className="line-clamp-2">{product.ai_reasoning || (fr ? "Analyse non disponible" : "No analysis yet")}</p></td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageProducts.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">{fr ? "Aucun produit trouvé." : "No products found."}</div>
        )}

        <div className="flex items-center justify-between border-t px-3 py-2.5">
          <span className="text-xs text-muted-foreground">{fr ? "Page" : "Page"} {page}/{pageCount}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      <MarketSelectorDialog
        open={showMarkets}
        onOpenChange={setShowMarkets}
        selectedMarkets={selectedMarkets}
        onMarketsChange={setSelectedMarkets}
      />
    </div>
  );
}

function CompactMoneyInput({ value, onCommit }: { value: number; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(value ? String(value) : "");

  useEffect(() => {
    setDraft(value ? String(value) : "");
  }, [value]);

  return (
    <div className="flex w-28 items-center rounded-lg border bg-white pr-2">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(draft === "" ? null : Number(draft))}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.currentTarget as HTMLInputElement).blur();
        }}
        className="h-8 border-0 px-2 text-right shadow-none focus-visible:ring-0"
      />
      <span className="text-xs text-muted-foreground">€</span>
    </div>
  );
}
