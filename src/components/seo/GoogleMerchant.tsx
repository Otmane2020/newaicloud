import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";

interface FeedStatus {
  lastFetch: string | null;
  itemCount: number | null;
  status: "success" | "error" | "loading" | "idle";
  error?: string;
}

const PUBLIC_FEED_ORIGIN = "https://catalogoptimize.com";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");

export function GoogleMerchant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedStore } = useStore();
  const [copied, setCopied] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    lastFetch: null,
    itemCount: null,
    status: "idle",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [optimizationScore, setOptimizationScore] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [optimizedProducts, setOptimizedProducts] = useState(0);

  const sellerId = user?.id || "YOUR_SELLER_ID";
  const feedUrl = `${PUBLIC_FEED_ORIGIN}/shoppingfeed/${sellerId}/xml`;
  const directFeedUrl = useMemo(
    () => `${SUPABASE_URL}/functions/v1/shopping-feed/shoppingfeed/${sellerId}/xml`,
    [sellerId],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testFeed = async () => {
    if (!user?.id || !SUPABASE_URL) return;

    setIsTesting(true);
    setFeedStatus((prev) => ({ ...prev, status: "loading", error: undefined }));

    try {
      // Always test the backend attached to the current Lovable/Supabase project.
      // The old hardcoded Supabase project was the source of false 400 domain errors.
      const response = await fetch(directFeedUrl, { cache: "no-store" });
      const body = await response.text();

      if (!response.ok) {
        let detail = body;
        try {
          const parsed = JSON.parse(body);
          detail = parsed?.error || parsed?.message || body;
        } catch {
          // Keep raw response body.
        }
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      }

      if (!body.includes("<?xml") || !body.includes("<rss")) {
        throw new Error(t.merchant.feed.errors.invalidFormat);
      }

      const itemCount = (body.match(/<item>/g) || []).length;
      setFeedStatus({
        lastFetch: new Date().toISOString(),
        itemCount,
        status: "success",
      });
    } catch (error) {
      setFeedStatus({
        lastFetch: null,
        itemCount: null,
        status: "error",
        error: error instanceof Error ? error.message : t.merchant.feed.errors.unknown,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const fetchOptimizationScore = async () => {
    try {
      if (!selectedStore?.id) {
        setTotalProducts(0);
        setOptimizedProducts(0);
        setOptimizationScore(0);
        return;
      }

      const [{ count: total }, { count: optimized }] = await Promise.all([
        supabase
          .from("shopify_products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", selectedStore.id),
        supabase
          .from("shopify_products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", selectedStore.id)
          .not("google_product_category", "is", null)
          .not("google_gtin", "is", null)
          .eq("google_white_background", true),
      ]);

      const totalCount = total || 0;
      const optimizedCount = optimized || 0;
      setTotalProducts(totalCount);
      setOptimizedProducts(optimizedCount);
      setOptimizationScore(totalCount > 0 ? Math.round((optimizedCount / totalCount) * 100) : 0);
    } catch (error) {
      console.error("Error fetching optimization score:", error);
    }
  };

  const regenerateFeed = async () => {
    setRegenerating(true);
    try {
      await testFeed();
      await fetchOptimizationScore();
      toast.success(t.merchant.feed.success.regenerated);
    } catch (error) {
      console.error("Error regenerating feed:", error);
      toast.error(t.merchant.feed.errors.regenerateFailed);
    } finally {
      setRegenerating(false);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info(t.merchant.feed.status.generating);

      if (!selectedStore) {
        toast.error(t.toasts.dashboard.noStoreSelected);
        return;
      }

      const { data: products, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("store_id", selectedStore.id)
        .order("title");

      if (error) throw error;
      if (!products || products.length === 0) {
        toast.error(t.merchant.feed.errors.noProducts);
        return;
      }

      const headers = [
        t.merchant.feed.csv.headers.id,
        t.merchant.feed.csv.headers.title,
        t.merchant.feed.csv.headers.description,
        t.merchant.feed.csv.headers.price,
        t.merchant.feed.csv.headers.url,
        t.merchant.feed.csv.headers.imageUrl,
        t.merchant.feed.csv.headers.availability,
        t.merchant.feed.csv.headers.brand,
        t.merchant.feed.csv.headers.category,
        t.merchant.feed.csv.headers.gtin,
        t.merchant.feed.csv.headers.mpn,
        t.merchant.feed.csv.headers.condition,
        t.merchant.feed.csv.headers.whiteBackground,
      ];

      const rows = products.map((product: any) => [
        product.shopify_product_id || product.shopify_id || "",
        product.title || "",
        (product.body_html || product.description || "").replace(/"/g, '""').replace(/\n/g, " "),
        product.price || "",
        product.handle ? `${PUBLIC_FEED_ORIGIN}/products/${product.handle}` : "",
        product.image_url || "",
        product.status === "active" ? t.merchant.feed.csv.inStock : t.merchant.feed.csv.outOfStock,
        product.vendor || "",
        product.google_product_category || "",
        product.google_gtin || "",
        product.google_mpn || "",
        product.google_condition || "new",
        product.google_white_background ? t.merchant.feed.csv.yes : t.merchant.feed.csv.no,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `google-shopping-feed-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t.merchant.feed.success.exported.replace("{{count}}", products.length.toString()));
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error(t.merchant.feed.errors.exportFailed);
    }
  };

  useEffect(() => {
    if (!selectedStore) {
      setFeedStatus({ lastFetch: null, itemCount: null, status: "idle" });
      setOptimizationScore(0);
      setTotalProducts(0);
      setOptimizedProducts(0);
      return;
    }

    void testFeed();
    void fetchOptimizationScore();
    const interval = window.setInterval(() => void fetchOptimizationScore(), 10000);
    return () => window.clearInterval(interval);
  }, [selectedStore?.id, user?.id]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.merchant.feed.status.never;
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = () => {
    switch (feedStatus.status) {
      case "success":
        return <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">✓ {t.merchant.feed.status.operational}</Badge>;
      case "error":
        return <Badge variant="destructive">✗ {t.merchant.feed.status.error}</Badge>;
      case "loading":
        return <Badge variant="secondary"><RefreshCw className="mr-1 h-3 w-3 animate-spin" />{t.merchant.feed.status.testing}</Badge>;
      default:
        return <Badge variant="outline">{t.merchant.feed.status.notTested}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact feed summary — no duplicate hero/banner */}
      <Card className="p-4 shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <span className="text-sm text-muted-foreground">
                {feedStatus.itemCount ?? 0} {t.merchant.feed.products}
                {totalProducts > 0 ? ` · ${totalProducts} ${t.merchant.feed.inDatabase}` : ""}
              </span>
            </div>

            <div className="min-w-[220px] max-w-sm flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                <span className="font-medium">{t.merchant.feed.optimizationScore}</span>
                <span className="font-semibold">{optimizationScore}%</span>
              </div>
              <Progress value={optimizationScore} className="h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                {optimizedProducts} / {totalProducts} {t.merchant.feed.products}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate("/shopping")}>
              <Zap className="mr-1.5 h-4 w-4" />
              {t.merchant.feed.actions.optimizeAll}
            </Button>
            <Button size="sm" variant="outline" onClick={testFeed} disabled={isTesting}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
              {t.merchant.feed.actions.testFeed}
            </Button>
            <Button size="sm" variant="outline" onClick={regenerateFeed} disabled={regenerating}>
              <Download className={`mr-1.5 h-4 w-4 ${regenerating ? "animate-pulse" : ""}`} />
              {t.merchant.feed.actions.regenerate}
            </Button>
          </div>
        </div>
      </Card>

      <Alert className="border-slate-200 bg-slate-50/70">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="text-sm font-medium text-foreground">{t.merchant.feed.enrichment.title}</strong>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.merchant.feed.enrichment.description}</p>
          </div>
          <Button onClick={() => navigate("/shopping")} variant="outline" size="sm" className="shrink-0">
            {t.merchant.feed.enrichment.action}
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5 shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t.merchant.feed.statusTitle}</h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">{t.merchant.feed.lastTest}</p>
              <p className="mt-1 truncate text-sm font-medium">{feedStatus.status === "loading" ? "…" : formatDate(feedStatus.lastFetch)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t.merchant.feed.detectedProducts}</p>
              <p className="mt-1 text-sm font-medium">{feedStatus.status === "loading" ? "…" : feedStatus.itemCount ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t.merchant.feed.format}</p>
              <p className="mt-1 text-sm font-medium">XML</p>
            </div>
          </div>

          {feedStatus.status === "error" && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{feedStatus.error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={testFeed} disabled={isTesting} size="sm">
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
              {isTesting ? t.merchant.feed.status.testing : t.merchant.feed.actions.testFeed}
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 h-4 w-4" />
                {t.merchant.feed.actions.downloadXML}
              </a>
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              {t.merchant.feed.actions.exportCSV}
            </Button>
          </div>
        </Card>

        <Card className="p-5 shadow-none">
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-muted/40">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.merchant.feed.url.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.merchant.feed.url.description}</p>
            </div>
          </div>

          <label className="text-xs font-medium">{t.merchant.feed.url.label}</label>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={feedUrl} className="h-9 flex-1 font-mono text-xs" />
            <Button onClick={handleCopy} variant="outline" size="sm">
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t.merchant.feed.url.copied : t.merchant.feed.url.copy}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <strong>catalogoptimize.com</strong> est l’URL publique à fournir à Google Merchant Center. Le test interne utilise automatiquement le backend Supabase du projet actif.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {t.merchant.feed.url.preview}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://business.google.com/merchant-center/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {t.merchant.openMerchantCenter}
              </a>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">{t.merchant.feed.info.format.title}</p>
          <p className="mt-1 text-sm font-medium">{t.merchant.feed.info.format.description}</p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">{t.merchant.feed.info.update.title}</p>
          <p className="mt-1 text-sm font-medium">{t.merchant.feed.info.update.description}</p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">{t.merchant.feed.info.schedule.title}</p>
          <p className="mt-1 text-sm font-medium">{t.merchant.feed.info.schedule.description}</p>
        </Card>
      </div>
    </div>
  );
}
