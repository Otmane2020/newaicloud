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
};

type CatalogStats = {
  total: number;
  incomplete: number;
  missingImages: number;
  missingSeo: number;
  missingTags: number;
  enriched: number;
  lastSync: string | null;
};

const initialStats: CatalogStats = {
  total: 0, incomplete: 0, missingImages: 0, missingSeo: 0, missingTags: 0, enriched: 0, lastSync: null,
};

export default function CatalogOptimizeDashboard() {
  const { user } = useAuth();
  const { selectedStore, stores, loading: storesLoading } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [stats, setStats] = useState<CatalogStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(false);

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
            .select("id,title,seo_title,seo_description,image_url,tags,enrichment_status")
            .eq("store_id", selectedStore.id)
            .range(0, 9999),
          supabase.from("sync_history").select("created_at,status").eq("store_id", selectedStore.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (countResult.error) throw countResult.error;
        if (productsResult.error) throw productsResult.error;
        const products = (productsResult.data || []) as ProductHealthRow[];
        const missingSeo = products.filter((p) => !p.seo_title?.trim() || !p.seo_description?.trim()).length;
        const missingImages = products.filter((p) => !p.image_url?.trim()).length;
        const missingTags = products.filter((p) => !p.tags || (Array.isArray(p.tags) ? p.tags.length === 0 : !String(p.tags).trim())).length;
        const incomplete = products.filter((p) => !p.title?.trim() || !p.seo_description?.trim() || !p.image_url?.trim()).length;
        const enriched = products.filter((p) => ["completed", "optimized", "enriched"].includes((p.enrichment_status || "").toLowerCase())).length;

        if (mounted) setStats({
          total: countResult.count || products.length,
          incomplete, missingImages, missingSeo, missingTags, enriched,
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
  }, [user?.id, selectedStore?.id]);

  const health = useMemo(() => {
    if (!stats.total) return null;
    const issueWeight = Math.min(stats.total, Math.max(stats.incomplete, stats.missingSeo, stats.missingImages, stats.missingTags));
    return Math.max(0, Math.round((1 - issueWeight / stats.total) * 100));
  }, [stats]);

  const issues = [
    { label: fr ? "Produits incomplets" : "Incomplete products", value: stats.incomplete, href: "/products/title-description", icon: FileText },
    { label: fr ? "SEO produit incomplet" : "Incomplete product SEO", value: stats.missingSeo, href: "/seo?tab=products", icon: Sparkles },
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
              <p className="mt-2 max-w-2xl text-muted-foreground">{fr ? "Une fois connecté, Catalog Optimize importe vos produits, variantes, collections et images, puis affiche uniquement les problèmes réellement détectés." : "Once connected, Catalog Optimize imports products, variants, collections and images, then reports only the issues it actually detects."}</p>
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
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="outline" className="border-violet-200 text-violet-700">AI PRODUCT OPERATIONS</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{fr ? "Santé du catalogue" : "Catalog health"}</h1>
          <p className="mt-1 text-muted-foreground">{selectedStore.store_name || selectedStore.store_url}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/products?panel=import"><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Importer" : "Import products"}</Link></Button>
          <Button asChild className="bg-violet-600 hover:bg-violet-700"><Link to="/products/title-description"><ScanSearch className="mr-2 h-4 w-4" />{fr ? "Corriger le catalogue" : "Fix catalog issues"}</Link></Button>
        </div>
      </div>

      {scanError && (
        <Card className="border-amber-200 bg-amber-50"><CardContent className="flex items-center gap-3 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{fr ? "L'audit n'a pas pu charger toutes les données. Réessayez après la prochaine synchronisation." : "The scan could not load all catalog data. Try again after the next sync."}</CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{fr ? "Santé du catalogue" : "Catalog health"}</p>{loading ? <Loader2 className="mt-4 h-6 w-6 animate-spin" /> : health === null ? <p className="mt-3 text-xl font-semibold">{fr ? "Audit requis" : "Scan required"}</p> : <><p className="mt-2 text-3xl font-semibold">{health}%</p><Progress value={health} className="mt-3" /></>}</CardContent></Card>
        <Card><CardContent className="p-5"><Package className="h-5 w-5 text-violet-600" /><p className="mt-4 text-3xl font-semibold">{loading ? "—" : stats.total}</p><p className="text-sm text-muted-foreground">{fr ? "Produits analysés" : "Products analyzed"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><AlertTriangle className="h-5 w-5 text-amber-500" /><p className="mt-4 text-3xl font-semibold">{loading ? "—" : stats.incomplete}</p><p className="text-sm text-muted-foreground">{fr ? "Produits incomplets" : "Incomplete products"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><RefreshCw className="h-5 w-5 text-blue-600" /><p className="mt-4 text-base font-semibold">{stats.lastSync ? new Date(stats.lastSync).toLocaleString(language) : (fr ? "Aucune synchronisation" : "No sync yet")}</p><p className="mt-2 text-sm text-muted-foreground">{fr ? "Dernière synchronisation" : "Last Shopify sync"}</p></CardContent></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{fr ? "Priorités" : "Prioritized issues"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{fr ? "Calculées à partir des données réellement importées." : "Calculated from your imported catalog data."}</p></div><Badge variant="secondary">{issues.reduce((sum, item) => sum + item.value, 0)} {fr ? "signaux" : "signals"}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue) => (
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
