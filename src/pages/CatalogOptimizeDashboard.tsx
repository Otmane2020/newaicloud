import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, FileText,
  Image, Images, Loader2, Package, RefreshCw, ScanSearch, ShoppingCart,
  Sparkles, Store, Tags
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type ProductHealthRow = {
  id: string;
  title: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  tags: string[] | string | null;
  enrichment_status: string | null;
  google_product_category: string | null;
  google_mpn: string | null;
  google_condition: string | null;
  google_gtin: string | null;
  google_white_background: boolean | null;
  seo_synced_to_shopify: boolean | null;
};

type CatalogStats = {
  total: number;
  incomplete: number;
  missingTitles: number;
  missingSeoTitles: number;
  missingSeoDescriptions: number;
  missingImages: number;
  missingSeo: number;
  missingTags: number;
  enriched: number;
  missingGoogleCategory: number;
  missingGtin: number;
  missingMpn: number;
  missingCondition: number;
  missingWhiteBackground: number;
  notSyncedToShopify: number;
  lastSync: string | null;
};

const initialStats: CatalogStats = {
  total: 0, incomplete: 0, missingTitles: 0, missingSeoTitles: 0, missingSeoDescriptions: 0, missingImages: 0, missingSeo: 0, missingTags: 0, enriched: 0, missingGoogleCategory: 0, missingGtin: 0, missingMpn: 0, missingCondition: 0, missingWhiteBackground: 0, notSyncedToShopify: 0, lastSync: null,
};

export default function CatalogOptimizeDashboard() {
  const { user } = useAuth();
  const { selectedStore, stores, loading: storesLoading } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [stats, setStats] = useState<CatalogStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [scanNonce, setScanNonce] = useState(0);

  useEffect(() => {
    if (!user?.id || !selectedStore?.id) {
      setStats(initialStats);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setScanError(false);
      try {
        const [countResult, productsResult, syncResult] = await Promise.all([
          supabase.from("shopify_products").select("*", { count: "exact", head: true }).eq("store_id", selectedStore.id),
          supabase.from("shopify_products")
            .select("id,title,seo_title,seo_description,image_url,tags,enrichment_status,google_product_category,google_mpn,google_condition,google_gtin,google_white_background,seo_synced_to_shopify")
            .eq("store_id", selectedStore.id)
            .range(0, 9999),
          supabase.from("sync_history").select("created_at,status").eq("store_id", selectedStore.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (countResult.error) throw countResult.error;
        if (productsResult.error) throw productsResult.error;
        const products = (productsResult.data || []) as ProductHealthRow[];
        const missingTitles = products.filter((p) => !p.title?.trim()).length;
        const missingSeoTitles = products.filter((p) => !p.seo_title?.trim()).length;
        const missingSeoDescriptions = products.filter((p) => !p.seo_description?.trim()).length;
        const missingSeo = products.filter((p) => !p.seo_title?.trim() || !p.seo_description?.trim()).length;
        const missingImages = products.filter((p) => !p.image_url?.trim()).length;
        const missingTags = products.filter((p) => !p.tags || (Array.isArray(p.tags) ? p.tags.length === 0 : !String(p.tags).trim())).length;
        const incomplete = products.filter((p) => !p.title?.trim() || !p.seo_description?.trim() || !p.image_url?.trim()).length;
        const enriched = products.filter((p) => ["completed", "optimized", "enriched"].includes((p.enrichment_status || "").toLowerCase())).length;
        const missingGoogleCategory = products.filter((p) => !p.google_product_category?.trim()).length;
        const missingGtin = products.filter((p) => !p.google_gtin?.trim()).length;
        const missingMpn = products.filter((p) => !p.google_mpn?.trim()).length;
        const missingCondition = products.filter((p) => !p.google_condition?.trim()).length;
        const missingWhiteBackground = products.filter((p) => !p.google_white_background).length;
        const notSyncedToShopify = products.filter((p) => !p.seo_synced_to_shopify).length;

        if (mounted) setStats({
          total: countResult.count || products.length,
          incomplete, missingTitles, missingSeoTitles, missingSeoDescriptions, missingImages, missingSeo, missingTags, enriched,
          missingGoogleCategory, missingGtin, missingMpn, missingCondition, missingWhiteBackground, notSyncedToShopify,
          lastSync: syncResult.data?.created_at || null,
        });
      } catch (error) {
        console.error("[CatalogOptimizeDashboard] catalog scan failed", error);
        if (mounted) setScanError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id, selectedStore?.id, scanNonce]);

  const health = useMemo(() => {
    if (!stats.total) return null;
    const totalChecks = stats.total * 12;
    const failedChecks =
      stats.missingTitles +
      stats.missingSeoTitles +
      stats.missingSeoDescriptions +
      stats.missingImages +
      stats.missingTags +
      Math.max(0, stats.total - stats.enriched) +
      stats.missingGoogleCategory +
      stats.missingGtin +
      stats.missingMpn +
      stats.missingCondition +
      stats.missingWhiteBackground +
      stats.notSyncedToShopify;
    return Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100));
  }, [stats]);

  const issues = [
    { label: fr ? "Titres produit manquants" : "Missing product titles", value: stats.missingTitles, href: "/products/title-description", icon: FileText },
    { label: fr ? "Titres SEO manquants" : "Missing SEO titles", value: stats.missingSeoTitles, href: "/seo?tab=products", icon: Sparkles },
    { label: fr ? "Descriptions SEO manquantes" : "Missing SEO descriptions", value: stats.missingSeoDescriptions, href: "/seo?tab=products", icon: FileText },
    { label: fr ? "Catégories Google manquantes" : "Missing Google categories", value: stats.missingGoogleCategory, href: "/shopping", icon: ShoppingCart },
    { label: fr ? "GTIN manquants" : "Missing GTINs", value: stats.missingGtin, href: "/shopping", icon: ShoppingCart },
    { label: fr ? "MPN manquants" : "Missing MPNs", value: stats.missingMpn, href: "/shopping", icon: ShoppingCart },
    { label: fr ? "État produit manquant" : "Missing product condition", value: stats.missingCondition, href: "/shopping", icon: ShoppingCart },
    { label: fr ? "Fond blanc Shopping manquant" : "Missing Shopping white background", value: stats.missingWhiteBackground, href: "/shopping", icon: Image },
    { label: fr ? "Modifications non synchronisées" : "Changes not synced", value: stats.notSyncedToShopify, href: "/products", icon: RefreshCw },
    { label: fr ? "Images principales manquantes" : "Missing primary images", value: stats.missingImages, href: "/products/title-description?view=images", icon: Image },
    { label: fr ? "Tags manquants" : "Missing tags", value: stats.missingTags, href: "/seo?tab=tags", icon: Tags },
  ].sort((a, b) => b.value - a.value);

  if (storesLoading) return <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>;

  if (!selectedStore || stores.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Badge variant="outline" className="border-violet-200 text-violet-700">CATALOG OPTIMIZE</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{fr ? "Connectez votre catalogue Shopify" : "Connect your Shopify catalog"}</h1>
          <p className="mt-2 text-muted-foreground">{fr ? "Installez l'application Shopify ou connectez manuellement une boutique pour lancer le premier audit." : "Install the Shopify app or connect a store manually to run your first catalog scan."}</p>
        </div>
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50">
          <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white"><Store className="h-6 w-6" /></span>
              <h2 className="mt-5 text-2xl font-semibold">{fr ? "Votre catalogue commence avec Shopify" : "Your catalog starts with Shopify"}</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{fr ? "Une fois connecté, CatalogueOptimize importe vos produits, variantes, collections et images, puis affiche uniquement les problèmes réellement détectés." : "Once connected, CatalogueOptimize imports products, variants, collections and images, then reports only the issues it actually detects."}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{fr ? "Installation Shopify" : "Shopify app install"}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{fr ? "Connexion OAuth manuelle" : "Manual OAuth connection"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="bg-violet-600 hover:bg-violet-700"><Link to="/account?tab=integrations">{fr ? "Connecter Shopify" : "Connect Shopify"} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button variant="outline" asChild><Link to="/shopify/guide">{fr ? "Guide d'installation" : "Installation guide"}</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 p-6 text-white shadow-xl shadow-violet-950/10 sm:p-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <Badge className="border border-white/10 bg-white/10 text-violet-100 hover:bg-white/10">AI PRODUCT OPERATIONS</Badge>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{fr ? "Pilotez la santé de votre catalogue" : "Run your catalog from one clear view"}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-300"><Store className="h-4 w-4 text-violet-300" />{selectedStore.store_name || selectedStore.store_url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setScanNonce((value) => value + 1)} disabled={loading} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
              {fr ? "Scanner maintenant" : "Scan now"}
            </Button>
            <Button variant="outline" asChild className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/products?panel=import"><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Importer" : "Import products"}</Link></Button>
            <Button asChild className="bg-violet-500 hover:bg-violet-400"><Link to="/products/title-description"><ScanSearch className="mr-2 h-4 w-4" />{fr ? "Corriger le catalogue" : "Fix catalog issues"}</Link></Button>
          </div>
        </div>
      </section>

      {scanError && (
        <Card className="border-amber-200 bg-amber-50"><CardContent className="flex items-center gap-3 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{fr ? "L'audit n'a pas pu charger toutes les données. Réessayez après la prochaine synchronisation." : "The scan could not load all catalog data. Try again after the next sync."}</CardContent></Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-violet-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{fr ? "Santé du catalogue" : "Catalog health"}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><Sparkles className="h-4 w-4" /></span></div>
            {loading ? <Loader2 className="mt-5 h-6 w-6 animate-spin text-violet-600" /> : health === null ? <p className="mt-5 text-xl font-semibold">{fr ? "Audit requis" : "Scan required"}</p> : <><p className="mt-4 text-3xl font-semibold tracking-tight">{health}%</p><Progress value={health} className="mt-3 h-2" /><p className="mt-2 text-xs text-slate-500">{fr ? "12 contrôles par produit : contenu, enrichissement et Shopping" : "12 checks per product: content, enrichment and Shopping"}</p></>}
          </CardContent>
        </Card>
        {[
          { label: fr ? "Produits analysés" : "Products analyzed", value: loading ? "—" : stats.total, detail: fr ? "Catalogue importé" : "Imported catalog", icon: Package, tone: "bg-blue-50 text-blue-700" },
          { label: fr ? "Produits incomplets" : "Incomplete products", value: loading ? "—" : stats.incomplete, detail: fr ? "À traiter en priorité" : "Priority work queue", icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
          { label: fr ? "Dernière synchronisation" : "Last Shopify sync", value: stats.lastSync ? new Date(stats.lastSync).toLocaleDateString(language) : "—", detail: stats.lastSync ? new Date(stats.lastSync).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) : (fr ? "Aucune synchronisation" : "No sync yet"), icon: RefreshCw, tone: "bg-emerald-50 text-emerald-700" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{fr ? "Priorités" : "Prioritized issues"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{fr ? "Calculées à partir des données réellement importées." : "Calculated from your imported catalog data."}</p></div><Badge variant="secondary">{issues.reduce((sum, item) => sum + item.value, 0)} {fr ? "signaux" : "signals"}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {issues.filter((issue) => issue.value > 0).sort((a, b) => b.value - a.value).map((issue) => (
              <Link key={issue.label} to={issue.href} className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50">
                <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600"><issue.icon className="h-4 w-4" /></span><span className="font-medium">{issue.label}</span></span>
                <span className="flex items-center gap-3"><strong>{loading ? "—" : issue.value}</strong><ArrowRight className="h-4 w-4 text-muted-foreground" /></span>
              </Link>
            ))}
            {!loading && issues.every((issue) => issue.value === 0) && <div className="rounded-xl bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mb-2 h-5 w-5" />{fr ? "Aucun problème prioritaire détecté dans les champs analysés." : "No priority issues detected in the analyzed fields."}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{fr ? "Actions rapides" : "Quick actions"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              [FileText, fr ? "Optimiser le contenu" : "Optimize content", "/products/title-description"],
              [Images, fr ? "Améliorer les images" : "Improve images", "/products/title-description?view=images"],
              [BadgeDollarSign, fr ? "Revoir les prix" : "Review pricing", "/pricing"],
              [ShoppingCart, fr ? "Corriger le flux Shopping" : "Fix Shopping feed", "/shopping"],
            ].map(([Icon,label,href]) => {
              const ActionIcon = Icon as typeof FileText;
              return <Button key={href as string} variant="outline" asChild className="h-auto w-full justify-start p-3"><Link to={href as string}><ActionIcon className="mr-3 h-4 w-4 text-violet-600" />{label as string}</Link></Button>;
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
