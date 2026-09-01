import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Home, Loader2, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SeoConfidenceBadge } from "./SeoConfidenceBadge";
import { toast } from "sonner";

export function HomePageSeo() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const loadExistingSeoData = async () => {
    if (!selectedStore?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("homepage_seo")
        .select("seo_title,seo_description")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      setSeoTitle(data?.seo_title || "");
      setSeoDescription(data?.seo_description || "");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Impossible de charger le SEO de la page d’accueil" : "Could not load homepage SEO"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadExistingSeoData(); }, [selectedStore?.id]);

  const generateSeoWithAI = async () => {
    if (!selectedStore?.id) return;
    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-page-seo", {
        body: { pageId: "homepage", isHomepage: true, storeId: selectedStore.id, force: true },
      });
      if (error) throw error;
      if (data?.seo_title) setSeoTitle(data.seo_title);
      if (data?.seo_description) setSeoDescription(data.seo_description);
      toast.success(fr ? "SEO de la page d’accueil optimisé" : "Homepage SEO optimized");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Optimisation impossible" : "Optimization failed"));
    } finally {
      setGenerating(false);
    }
  };

  const syncToShopify = async () => {
    if (!selectedStore?.id || !seoTitle || !seoDescription) {
      toast.error(fr ? "Complétez le titre et la meta description" : "Complete the title and meta description");
      return;
    }
    try {
      setSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const { error: saveError } = await supabase.from("homepage_seo").upsert({
        user_id: user.id,
        store_id: selectedStore.id,
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,store_id", ignoreDuplicates: false });
      if (saveError) throw saveError;
      const { error } = await supabase.functions.invoke("sync-homepage-seo", {
        body: { seoTitle, seoDescription, storeId: selectedStore.id },
      });
      if (error) throw error;
      toast.success(fr ? "SEO synchronisé avec Shopify" : "SEO synced to Shopify");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Synchronisation impossible" : "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!selectedStore) {
    return <Card className="rounded-2xl border-slate-200 p-6 text-sm text-muted-foreground">{fr ? "Sélectionnez une boutique Shopify." : "Select a Shopify store."}</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700"><Home className="h-4 w-4" /></span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Homepage SEO</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{fr ? "Optimisez le titre SEO et la meta description de votre page d’accueil, puis synchronisez-les avec Shopify." : "Optimize your homepage SEO title and meta description, then sync them with Shopify."}</p>
            </div>
          </div>
          <Button size="sm" onClick={generateSeoWithAI} disabled={generating} className="rounded-xl">
            {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            Optimize Homepage
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="rounded-2xl border-slate-200 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="homepage-seo-title">SEO title</Label><span className="text-xs text-muted-foreground">{seoTitle.length}/60</span></div>
              <Input id="homepage-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={60} placeholder={fr ? "Titre SEO de la page d’accueil" : "Homepage SEO title"} className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="homepage-seo-description">Meta description</Label><span className="text-xs text-muted-foreground">{seoDescription.length}/160</span></div>
              <Textarea id="homepage-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={160} rows={4} placeholder={fr ? "Meta description de la page d’accueil" : "Homepage meta description"} className="rounded-xl" />
            </div>

            {(seoTitle || seoDescription) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-medium text-slate-500">Google preview</span><SeoConfidenceBadge seoTitle={seoTitle} seoDescription={seoDescription} /></div>
                <p className="truncate text-base font-medium text-blue-700">{seoTitle || "Homepage title"}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{seoDescription || (fr ? "Ajoutez une meta description." : "Add a meta description.")}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={generateSeoWithAI} disabled={generating} className="rounded-xl"><Sparkles className="mr-1.5 h-4 w-4" />Optimize Homepage</Button>
              <Button size="sm" onClick={syncToShopify} disabled={syncing || !seoTitle || !seoDescription} className="rounded-xl">{syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}{fr ? "Synchroniser Shopify" : "Sync to Shopify"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-200 bg-amber-50/35 shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-200 bg-white text-amber-700"><AlertCircle className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-semibold text-slate-950">{fr ? "Guide homepage Shopify" : "Shopify homepage guide"}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{fr ? "NewAI peut gérer les métadonnées SEO, mais ne modifie pas automatiquement les sections de votre thème Shopify." : "NewAI can manage SEO metadata, but it does not automatically edit your Shopify theme sections."}</p></div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><p className="font-medium text-slate-800">1. Shopify → Online Store → Themes</p><p className="text-xs text-slate-500">{fr ? "Ouvrez Customize sur le thème actif." : "Open Customize on the active theme."}</p></div></div>
              <div className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><p className="font-medium text-slate-800">2. {fr ? "Sélectionnez Home page" : "Select Home page"}</p><p className="text-xs text-slate-500">{fr ? "Travaillez le H1, le hero et le texte d’introduction avec votre mot-clé principal." : "Improve the H1, hero, and intro copy around your primary keyword."}</p></div></div>
              <div className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><p className="font-medium text-slate-800">3. {fr ? "Gardez la page simple" : "Keep the page focused"}</p><p className="text-xs text-slate-500">{fr ? "Un H1 clair, une proposition de valeur, vos catégories importantes et du texte utile suffisent." : "A clear H1, value proposition, key categories, and useful copy are enough."}</p></div></div>
            </div>

            <div className="rounded-xl border border-amber-200/70 bg-white/70 p-3 text-xs leading-5 text-slate-600">{fr ? "À faire ici : title + meta description. À faire dans le thème : H1, hero, sections, textes visibles et structure de la homepage." : "Do here: title + meta description. Do in the theme: H1, hero, sections, visible copy, and homepage structure."}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
