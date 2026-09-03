import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { calculateArticleSeoScore } from "@/lib/seoQuality";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PAGE_SIZE = 30;

const scoreTone = (score: number) =>
  score >= 85
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : score >= 60
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-red-200 bg-red-50 text-red-600";

type Article = {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  status: string;
  featured_image: string | null;
  optimization_count: number | null;
  seo_title: string | null;
};

async function runInBatches(ids: string[], worker: (id: string) => Promise<boolean>, batchSize = 3) {
  let success = 0;
  let failed = 0;
  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (id) => {
      try { return await worker(id); } catch { return false; }
    }));
    success += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;
  }
  return { success, failed };
}

export function ArticleSeoWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!selectedStore?.id) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id,title,content,meta_description,keywords,status,featured_image,optimization_count,seo_title")
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as Article[]);
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Chargement du SEO des articles impossible" : "Could not load article SEO"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); setSelected(new Set()); setPage(1); }, [selectedStore?.id]);
  useEffect(() => setPage(1), [search]);

  const score = (article: Article) => calculateArticleSeoScore(
    article.title,
    article.seo_title || article.title,
    article.meta_description || "",
    Array.isArray(article.keywords) ? article.keywords : [],
    Boolean(article.featured_image),
    article.status === "published",
    article.optimization_count || 0,
    article.id,
  ).score;

  // Optimization behavior stays unchanged; only score colors use the 85 green threshold.
  const needsSeo = (article: Article) => score(article) < 80 || !article.meta_description || !article.seo_title;
  const filtered = useMemo(() => items.filter((article) => !search || `${article.title} ${article.seo_title || ""} ${article.meta_description || ""}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const missing = items.filter(needsSeo).length;
  const average = items.length ? Math.round(items.reduce((sum, item) => sum + score(item), 0) / items.length) : 0;
  const currentPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const optimize = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      setBusy(true);
      const result = await runInBatches(ids, async (id) => {
        const { data, error } = await supabase.functions.invoke("generate-article-seo", { body: { article_ids: [id], force: true } });
        return !error && data?.success !== false;
      });
      if (result.success) toast.success(fr ? `${result.success} article(s) optimisé(s)` : `${result.success} article(s) optimized`);
      if (result.failed) toast.error(fr ? `${result.failed} article(s) en échec` : `${result.failed} article(s) failed`);
      setSelected(new Set());
      await load();
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-none">
      <div className="border-b p-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher un article" : "Search articles"} className="h-9 pl-9" />
            </div>
            <Badge variant="outline" className={scoreTone(average)}>SEO {average}/100</Badge>
            <Badge variant="outline">{missing} {fr ? "à optimiser" : "need SEO"}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} ${fr ? "sélectionnés" : "selected"}` : `${filtered.length} articles`}</span>
            <Button size="sm" variant="outline" disabled={!missing || busy} onClick={() => optimize(items.filter(needsSeo).map((item) => item.id))}>
              <Sparkles className="mr-1.5 h-4 w-4" />Optimize All
            </Button>
            <Button size="sm" disabled={!selected.size || busy} onClick={() => optimize([...selected])}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {fr ? "Optimiser" : "Optimize"}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={load} aria-label={fr ? "Actualiser" : "Refresh"}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50/70 text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2"><Checkbox checked={currentPageSelected} onCheckedChange={() => setSelected(currentPageSelected ? new Set() : new Set(rows.map((row) => row.id)))} /></th>
                <th className="px-3 py-2 text-left">Article</th>
                <th className="px-3 py-2 text-left">SEO</th>
                <th className="px-3 py-2 text-left">{fr ? "Score" : "Score"}</th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((article) => {
                const articleScore = score(article);
                return (
                  <tr key={article.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2"><Checkbox checked={selected.has(article.id)} onCheckedChange={() => setSelected((current) => { const next = new Set(current); next.has(article.id) ? next.delete(article.id) : next.add(article.id); return next; })} /></td>
                    <td className="min-w-[260px] px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">{article.featured_image ? <img src={article.featured_image} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-slate-400" />}</div>
                        <div className="min-w-0"><p className="truncate font-medium">{article.title}</p><p className="text-xs capitalize text-muted-foreground">{article.status}</p></div>
                      </div>
                    </td>
                    <td className="max-w-[600px] px-3 py-2"><p className="truncate font-medium">{article.seo_title || article.title}</p><p className="truncate text-xs text-muted-foreground">{article.meta_description || (fr ? "Meta description manquante" : "Missing meta description")}</p></td>
                    <td className="px-3 py-2"><Badge variant="outline" className={scoreTone(articleScore)}>{Math.round(articleScore)}%</Badge>{articleScore >= 85 && <CheckCircle2 className="ml-2 inline h-4 w-4 text-emerald-600" />}</td>
                    <td className="px-3 py-2 text-right"><Button size="icon" variant="ghost" disabled={busy} onClick={() => optimize([article.id])}><Sparkles className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="grid min-h-48 place-items-center p-8 text-sm text-muted-foreground">{fr ? "Aucun article trouvé" : "No articles found"}</div>}

      {totalPages > 1 && <div className="flex items-center justify-between border-t px-3 py-2.5 text-xs text-muted-foreground"><span>Page {page}/{totalPages}</span><div className="flex gap-1"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>←</Button><Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>→</Button></div></div>}
    </Card>
  );
}
