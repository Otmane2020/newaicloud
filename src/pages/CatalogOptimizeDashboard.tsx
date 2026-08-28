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
import { useShopifySync } from "@/hooks/useShopifySync";
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
  const { isSyncing, syncShopifyStore } = useShopifySync();
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

  const contentScore = useMemo(() => {
    if (!stats.total) return null;
    const checks = stats.total * 3;
    const failures = stats.missingTitles + stats.missingImages + stats.missingTags;
    return Math.max(0, Math.round(((checks - failures) / checks) * 100));
  }, [stats]);

  const seoScore = useMemo(() => {
    if (!stats.total) return null;
    const checks = stats.total * 2;
    const failures = stats.missingSeoTitles + stats.missingSeoDescriptions;
    return Math.max(0, Math.round(((checks - failures) / checks) * 100));
  }, [stats]);

  // Catalog health is an explainable composite: 60% catalog content + 40% SEO.
  const health = useMemo(() => {
    if (contentScore === null || seoScore === null) return null;
    return Math.round(contentScore * 0.6 + seoScore * 0.4);
  }, [contentScore, seoScore]);

  const shoppingReadiness = useMemo(() => {
    if (!stats.total) return null;
    const totalChecks = stats.total * 5;
    const failedChecks =
      stats.missingGoogleCategory +
      stats.missingGtin +
      stats.missingMpn +
      stats.missingCondition +
      stats.missingWhiteBackground;
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
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Overview</span><span>·</span><span>{selectedStore.store_name || selectedStore.store_url}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{fr ? "Santé du catalogue" : "Catalog health"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} {fr ? "produits" : "products"} · {fr ? "Dernière analyse" : "Last scan"} {stats.lastSync ? new Date(stats.lastSync).toLocaleString(language) : "—"}
          </p>
        </div>
        <Button asChild className="bg-violet-600 hover:bg-violet-700">
          <Link to="/products/title-description"><Sparkles className="mr-2 h-4 w-4" />{fr ? "Corriger les problèmes" : "Fix issues"}</Link>
        </Button>
      </header>

      {scanError && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5" />{fr ? "L'analyse n'a pas pu charger toutes les données." : "The scan could not load all catalog data."}
        </div>
      )}

      <section className="grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm text-slate-500">{fr ? "Santé globale" : "Overall health"}</p>
          <div className="mt-2 flex items-end gap-3"><strong className="text-3xl text-slate-950">{loading || health === null ? "—" : `${health}%`}</strong><Progress value={health ?? 0} className="mb-2 h-1.5 w-24" /></div>
          <p className="mt-1 text-xs text-slate-500">{fr ? "60 % contenu · 40 % SEO" : "60% content · 40% SEO"}</p>
        </div>
        <div><p className="text-sm text-slate-500">{fr ? "Produits analysés" : "Products analyzed"}</p><strong className="mt-2 block text-3xl text-slate-950">{loading ? "—" : stats.total}</strong></div>
        <div><p className="text-sm text-slate-500">{fr ? "Produits à corriger" : "Products to fix"}</p><strong className="mt-2 block text-3xl text-amber-700">{loading ? "—" : stats.incomplete}</strong></div>
        <div>
          <p className="text-sm text-slate-500">{fr ? "Dernière synchronisation" : "Last sync"}</p>
          <strong className="mt-2 block text-lg text-slate-950">{stats.lastSync ? new Date(stats.lastSync).toLocaleDateString(language) : "—"}</strong>
          <Button type="button" variant="link" className="mt-1 h-auto p-0 text-violet-700" onClick={async () => { if (!selectedStore) return; await syncShopifyStore(selectedStore); setScanNonce((value) => value + 1); }} disabled={loading || isSyncing}>
            {loading || isSyncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}{fr ? "Analyser maintenant" : "Scan now"}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="text-lg font-semibold text-slate-950">{fr ? "À traiter maintenant" : "Needs attention"}</h2><p className="text-sm text-slate-500">{fr ? "Problèmes classés par impact." : "Issues ranked by impact."}</p></div>
          <span className="text-sm text-slate-500">{issues.filter((item) => item.value > 0).length} {fr ? "types de problèmes" : "issue types"}</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {issues.filter((issue) => issue.value > 0).slice(0, 7).map((issue, index) => (
            <Link key={issue.label} to={issue.href} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 transition hover:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}>
              <span className="flex items-center gap-3 text-sm font-medium text-slate-800"><issue.icon className="h-4 w-4 text-amber-600" />{issue.label}</span>
              <strong className="text-sm text-slate-950">{loading ? "—" : issue.value}</strong>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
          {!loading && issues.every((issue) => issue.value === 0) && <div className="flex items-center gap-3 p-5 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />{fr ? "Aucun problème prioritaire détecté." : "No priority issues detected."}</div>}
        </div>
      </section>

      <section className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
        {[
          { label: fr ? "Contenu" : "Content", value: contentScore },
          { label: "SEO", value: seoScore },
          { label: "Google Shopping", value: shoppingReadiness },
        ].map((score) => (
          <Link key={score.label} to={score.label === "Google Shopping" ? "/shopping" : score.label === "SEO" ? "/seo?tab=products" : "/products/title-description"} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-violet-300">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">{score.label}</span><strong>{score.value === null ? "—" : `${score.value}%`}</strong></div>
            <Progress value={score.value ?? 0} className="mt-3 h-1.5" />
          </Link>
        ))}
      </section>
    </div>
  );
}
