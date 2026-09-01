import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  DollarSign,
  Gauge,
  Loader2,
  Package,
  Percent,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  product_type: string | null;
  category: string | null;
  vendor: string | null;
  price: number | null;
  compare_at_price: number | null;
  currency: string | null;
  inventory_quantity: number | null;
};

type PricingStatus = "under" | "aligned" | "over" | "missing-cost";
type Strategy = "growth" | "balanced" | "margin";
type Filter = "all" | PricingStatus;

type PricingRow = ProductRow & {
  benchmarkMin: number;
  benchmarkMedian: number;
  benchmarkMax: number;
  benchmarkCount: number;
  benchmarkSource: string;
  cost: number | null;
  currentMargin: number | null;
  recommendedPrice: number;
  recommendedMargin: number | null;
  status: PricingStatus;
  delta: number;
  revenueImpact: number;
};

const median = (values: number[]) => {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
};

const roundPrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rounded = Math.round(value * 100) / 100;
  const integer = Math.floor(rounded);
  const cents = rounded - integer;
  if (cents > 0.94) return integer + 0.99;
  if (cents > 0.44) return integer + 0.49;
  return rounded;
};

export default function SmartPricing() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [targetMargin, setTargetMargin] = useState("35");
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const storageKey = selectedStore?.id ? `smart-pricing:${selectedStore.id}` : null;

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      if (saved?.costs && typeof saved.costs === "object") setCosts(saved.costs);
      if (saved?.targetMargin) setTargetMargin(String(saved.targetMargin));
      if (["growth", "balanced", "margin"].includes(saved?.strategy)) setStrategy(saved.strategy);
    } catch {
      // Ignore malformed local preferences.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify({ costs, targetMargin, strategy }));
  }, [storageKey, costs, targetMargin, strategy]);

  const { data: products = [], isLoading, refetch } = useQuery<ProductRow[]>({
    queryKey: ["smart-pricing-products", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, product_type, category, vendor, price, compare_at_price, currency, inventory_quantity")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const targetMarginValue = Math.min(90, Math.max(0, Number(targetMargin) || 0));

  const rows = useMemo<PricingRow[]>(() => {
    const catalogPrices = products.map((product) => Number(product.price) || 0).filter((price) => price > 0);

    return products.map((product) => {
      const currentPrice = Number(product.price) || 0;
      const groupLabel = product.category || product.product_type || product.vendor || (fr ? "Catalogue" : "Catalog");
      const comparable = products.filter((candidate) => {
        if (candidate.id === product.id) return false;
        if (product.category && candidate.category === product.category) return true;
        if (!product.category && product.product_type && candidate.product_type === product.product_type) return true;
        if (!product.category && !product.product_type && product.vendor && candidate.vendor === product.vendor) return true;
        return false;
      });

      let benchmarkPrices = comparable.map((candidate) => Number(candidate.price) || 0).filter((price) => price > 0);
      let benchmarkSource = groupLabel;
      if (benchmarkPrices.length < 2) {
        benchmarkPrices = catalogPrices.filter((price) => price !== currentPrice || catalogPrices.length === 1);
        benchmarkSource = fr ? "Catalogue global" : "Global catalog";
      }

      if (product.compare_at_price && Number(product.compare_at_price) > 0) {
        benchmarkPrices = [...benchmarkPrices, Number(product.compare_at_price)];
      }

      const benchmarkMedian = median(benchmarkPrices) || currentPrice;
      const benchmarkMin = benchmarkPrices.length ? Math.min(...benchmarkPrices) : currentPrice;
      const benchmarkMax = benchmarkPrices.length ? Math.max(...benchmarkPrices) : currentPrice;
      const rawCost = costs[product.id];
      const cost = rawCost !== undefined && rawCost !== "" && Number(rawCost) >= 0 ? Number(rawCost) : null;
      const currentMargin = cost !== null && currentPrice > 0 ? ((currentPrice - cost) / currentPrice) * 100 : null;
      const marginFloor = cost !== null && targetMarginValue < 100
        ? cost / Math.max(0.01, 1 - targetMarginValue / 100)
        : 0;

      const marketFactor = strategy === "growth" ? 0.96 : strategy === "margin" ? 1.05 : 1;
      const marketTarget = benchmarkMedian * marketFactor;
      const recommendedPrice = roundPrice(Math.max(marketTarget, marginFloor || 0, currentPrice ? currentPrice * 0.5 : 0));
      const recommendedMargin = cost !== null && recommendedPrice > 0
        ? ((recommendedPrice - cost) / recommendedPrice) * 100
        : null;
      const marketRatio = benchmarkMedian > 0 ? currentPrice / benchmarkMedian : 1;
      let status: PricingStatus = "aligned";
      if (cost === null) status = "missing-cost";
      else if (marketRatio < 0.9) status = "under";
      else if (marketRatio > 1.1) status = "over";

      const delta = recommendedPrice - currentPrice;
      const revenueImpact = delta * Math.max(0, Number(product.inventory_quantity) || 0);

      return {
        ...product,
        benchmarkMin,
        benchmarkMedian,
        benchmarkMax,
        benchmarkCount: benchmarkPrices.length,
        benchmarkSource,
        cost,
        currentMargin,
        recommendedPrice,
        recommendedMargin,
        status,
        delta,
        revenueImpact,
      };
    });
  }, [products, costs, targetMarginValue, strategy, fr]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      if (!q) return true;
      return [row.title, row.category, row.product_type, row.vendor]
        .some((value) => value?.toLowerCase().includes(q));
    });
  }, [rows, search, filter]);

  const summary = useMemo(() => {
    const priced = rows.filter((row) => Number(row.price) > 0);
    const withMargin = rows.filter((row) => row.currentMargin !== null);
    const avgPrice = priced.length ? priced.reduce((sum, row) => sum + Number(row.price || 0), 0) / priced.length : 0;
    const avgMargin = withMargin.length ? withMargin.reduce((sum, row) => sum + Number(row.currentMargin || 0), 0) / withMargin.length : null;
    const opportunities = rows.filter((row) => Math.abs(row.delta) >= Math.max(1, Number(row.price || 0) * 0.05)).length;
    const covered = rows.filter((row) => row.benchmarkCount >= 2).length;
    const potential = rows.reduce((sum, row) => sum + Math.max(0, row.revenueImpact), 0);
    return { avgPrice, avgMargin, opportunities, covered, potential };
  }, [rows]);

  const formatMoney = (value: number, currency?: string | null) => {
    const code = (currency || (fr ? "EUR" : "USD")).toUpperCase();
    try {
      return new Intl.NumberFormat(fr ? "fr-FR" : "en-US", { style: "currency", currency: code }).format(value || 0);
    } catch {
      return `${(value || 0).toFixed(2)} ${code}`;
    }
  };

  const statusLabel = (status: PricingStatus) => {
    if (status === "under") return fr ? "Sous-évalué" : "Underpriced";
    if (status === "over") return fr ? "Surévalué" : "Overpriced";
    if (status === "missing-cost") return fr ? "Coût manquant" : "Missing cost";
    return fr ? "Aligné" : "Aligned";
  };

  const statusClass = (status: PricingStatus) => {
    if (status === "under") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "over") return "border-orange-200 bg-orange-50 text-orange-700";
    if (status === "missing-cost") return "border-slate-200 bg-slate-50 text-slate-600";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const applyPrice = async (row: PricingRow) => {
    if (!row.recommendedPrice || row.recommendedPrice <= 0) return;
    try {
      setApplyingId(row.id);
      const { error } = await supabase
        .from("shopify_products")
        .update({ price: row.recommendedPrice, updated_at: new Date().toISOString() } as any)
        .eq("id", row.id);
      if (error) throw error;
      toast.success(fr ? "Prix recommandé appliqué" : "Recommended price applied", {
        description: `${row.title || "Product"}: ${formatMoney(row.recommendedPrice, row.currency)}`,
      });
      await refetch();
    } catch (error: any) {
      toast.error(fr ? "Impossible d'appliquer le prix" : "Could not apply price", {
        description: error?.message,
      });
    } finally {
      setApplyingId(null);
    }
  };

  const filterOptions: Array<{ id: Filter; label: string }> = [
    { id: "all", label: fr ? "Tous" : "All" },
    { id: "under", label: fr ? "Sous-évalués" : "Underpriced" },
    { id: "aligned", label: fr ? "Alignés" : "Aligned" },
    { id: "over", label: fr ? "Surévalués" : "Overpriced" },
    { id: "missing-cost", label: fr ? "Coût manquant" : "Missing cost" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <WorkspacePageHeader
        section={fr ? "Catalogue" : "Catalog"}
        page="Smart Pricing"
        count={products.length}
        title="Smart Pricing"
        description={fr
          ? "Benchmarkez vos prix, protégez votre marge et identifiez les produits à repricer en priorité."
          : "Benchmark prices, protect margin and identify the products that should be repriced first."}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{fr ? "Prix moyen" : "Avg. price"}</span><DollarSign className="h-4 w-4 text-violet-600" /></div><div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(summary.avgPrice, products[0]?.currency)}</div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{fr ? "Marge moyenne" : "Avg. margin"}</span><Percent className="h-4 w-4 text-violet-600" /></div><div className="mt-2 text-2xl font-semibold text-slate-950">{summary.avgMargin === null ? "—" : `${summary.avgMargin.toFixed(1)}%`}</div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Benchmark</span><BarChart3 className="h-4 w-4 text-violet-600" /></div><div className="mt-2 text-2xl font-semibold text-slate-950">{rows.length ? Math.round((summary.covered / rows.length) * 100) : 0}%</div><p className="mt-1 text-xs text-slate-500">{summary.covered}/{rows.length} {fr ? "couverts" : "covered"}</p></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{fr ? "Opportunités" : "Opportunities"}</span><Sparkles className="h-4 w-4 text-violet-600" /></div><div className="mt-2 text-2xl font-semibold text-slate-950">{summary.opportunities}</div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{fr ? "Impact stock potentiel" : "Potential stock impact"}</span><Target className="h-4 w-4 text-violet-600" /></div><div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(summary.potential, products[0]?.currency)}</div></CardContent></Card>
      </div>

      <Card className="border-violet-100 bg-gradient-to-r from-violet-50/70 to-white shadow-sm">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_220px_220px] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Gauge className="h-4 w-4 text-violet-600" />{fr ? "Moteur de recommandation" : "Recommendation engine"}</div>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{fr ? "Le benchmark compare chaque produit aux prix de produits similaires du même catalogue. Ajoutez le coût d'achat pour activer la protection de marge." : "Benchmarking compares every product with similar products in the same catalog. Add product cost to activate margin protection."}</p>
          </div>
          <div className="space-y-1.5"><Label>{fr ? "Marge cible" : "Target margin"}</Label><div className="relative"><Input type="number" min="0" max="90" value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} className="pr-8" /><Percent className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" /></div></div>
          <div className="space-y-1.5"><Label>{fr ? "Stratégie" : "Strategy"}</Label><Select value={strategy} onValueChange={(value) => setStrategy(value as Strategy)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="growth">{fr ? "Croissance · -4% benchmark" : "Growth · -4% benchmark"}</SelectItem><SelectItem value="balanced">{fr ? "Équilibrée · benchmark médian" : "Balanced · median benchmark"}</SelectItem><SelectItem value="margin">{fr ? "Marge · +5% benchmark" : "Margin · +5% benchmark"}</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle className="text-lg">{fr ? "Pricing par produit" : "Product pricing"}</CardTitle><p className="mt-1 text-sm text-slate-500">{fr ? "Prix actuel → benchmark → marge → prix recommandé." : "Current price → benchmark → margin → recommended price."}</p></div>
            <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={fr ? "Rechercher un produit…" : "Search products…"} className="pl-9" /></div>
          </div>
          <div className="flex flex-wrap gap-2">{filterOptions.map((option) => <Button key={option.id} size="sm" variant={filter === option.id ? "default" : "outline"} onClick={() => setFilter(option.id)}>{option.label}</Button>)}</div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid min-h-56 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
          ) : !filteredRows.length ? (
            <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-slate-500">{fr ? "Aucun produit ne correspond à ce filtre." : "No products match this filter."}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const currentPrice = Number(row.price) || 0;
                const deltaPct = currentPrice > 0 ? (row.delta / currentPrice) * 100 : 0;
                return (
                  <div key={row.id} className="grid gap-4 p-4 transition hover:bg-slate-50/70 xl:grid-cols-[minmax(250px,1.45fr)_minmax(210px,1fr)_150px_135px_175px_145px] xl:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">{row.image_url ? <img src={row.image_url} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><Package className="h-5 w-5 text-slate-300" /></div>}</div>
                      <div className="min-w-0"><div className="truncate font-medium text-slate-950">{row.title || (fr ? "Produit sans titre" : "Untitled product")}</div><div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge><span className="truncate text-xs text-slate-500">{row.category || row.product_type || row.vendor || "—"}</span></div></div>
                    </div>

                    <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Benchmark · {row.benchmarkCount} refs</div><div className="font-semibold text-slate-950">{formatMoney(row.benchmarkMedian, row.currency)}</div><div className="mt-1 text-xs text-slate-500">{formatMoney(row.benchmarkMin, row.currency)} — {formatMoney(row.benchmarkMax, row.currency)}</div><div className="mt-1 truncate text-[11px] text-slate-400">{row.benchmarkSource}</div></div>

                    <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fr ? "Coût" : "Cost"}</div><Input type="number" min="0" step="0.01" value={costs[row.id] ?? ""} onChange={(event) => setCosts((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="0.00" className="h-9" /></div>

                    <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fr ? "Marge" : "Margin"}</div><div className={`text-lg font-semibold ${row.currentMargin !== null && row.currentMargin < targetMarginValue ? "text-orange-600" : "text-slate-950"}`}>{row.currentMargin === null ? "—" : `${row.currentMargin.toFixed(1)}%`}</div><div className="text-xs text-slate-500">{fr ? "Cible" : "Target"} {targetMarginValue}%</div></div>

                    <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fr ? "Prix actuel → conseillé" : "Current → suggested"}</div><div className="flex items-center gap-2"><span className="text-sm text-slate-500">{formatMoney(currentPrice, row.currency)}</span><span className="text-slate-300">→</span><span className="font-semibold text-violet-700">{formatMoney(row.recommendedPrice, row.currency)}</span></div><div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${row.delta > 0 ? "text-emerald-600" : row.delta < 0 ? "text-orange-600" : "text-slate-500"}`}>{row.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : row.delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{deltaPct === 0 ? (fr ? "Déjà optimal" : "Already optimal") : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}{row.recommendedMargin !== null ? ` · ${row.recommendedMargin.toFixed(1)}% ${fr ? "marge" : "margin"}` : ""}</div></div>

                    <div className="xl:text-right"><Button size="sm" disabled={applyingId === row.id || !row.recommendedPrice || Math.abs(row.delta) < 0.01} onClick={() => applyPrice(row)} className="w-full xl:w-auto">{applyingId === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{fr ? "Appliquer" : "Apply"}</Button>{row.inventory_quantity ? <div className="mt-1.5 text-[11px] text-slate-400">{fr ? "Impact stock" : "Stock impact"}: {row.revenueImpact >= 0 ? "+" : ""}{formatMoney(row.revenueImpact, row.currency)}</div> : null}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
