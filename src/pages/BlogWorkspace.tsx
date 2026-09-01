import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { calculateArticleSeoScore } from "@/lib/seoQuality";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { BlogWizard } from "@/components/blog/BlogWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type Article = {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  status: string;
  published_at: string | null;
  shopify_article_id: number | null;
  created_at: string;
  source: string | null;
  featured_image: string | null;
  optimization_count: number;
  seo_title: string | null;
  handle: string | null;
};

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

const getPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
};

export default function BlogWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = async () => {
    if (!selectedStore?.id) {
      setArticles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id,title,content,meta_description,keywords,status,published_at,shopify_article_id,created_at,source,featured_image,optimization_count,seo_title")
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles((data || []) as Article[]);

      const { data: categoryRows } = await supabase
        .from("shopify_products")
        .select("category")
        .eq("store_id", selectedStore.id)
        .not("category", "is", null);

      setCategories(Array.from(new Set((categoryRows || []).map((row: any) => row.category).filter(Boolean))));
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Chargement du blog impossible" : "Could not load blog"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    setSelected(new Set());
    setPage(1);
  }, [selectedStore?.id]);

  useEffect(() => setPage(1), [search, status, source, pageSize]);

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

  const filtered = useMemo(() => articles.filter((article) => {
    if (search && !`${article.title} ${article.meta_description || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== "all" && article.status !== status) return false;
    if (source === "ai" && article.source !== "ai_generated") return false;
    if (source === "shopify" && article.source !== "shopify_import") return false;
    return true;
  }), [articles, search, status, source]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const rows = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
  const pageStart = filtered.length ? pageStartIndex + 1 : 0;
  const pageEnd = Math.min(pageStartIndex + pageSize, filtered.length);
  const paginationItems = getPaginationItems(safePage, totalPages);
  const allRowsSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toOptimize = articles.filter((article) => !article.meta_description || (article.optimization_count || 0) === 0).length;
  const published = articles.filter((article) => article.status === "published").length;

  const toggleCurrentPage = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allRowsSelected) rows.forEach((row) => next.delete(row.id));
      else rows.forEach((row) => next.add(row.id));
      return next;
    });
  };

  const optimize = async (ids: string[]) => {
    if (!ids.length) return;

    try {
      setBusy(true);
      let success = 0;
      for (const id of ids) {
        const { error } = await supabase.functions.invoke("generate-article-seo", { body: { article_ids: [id] } });
        if (!error) success += 1;
      }
      toast.success(fr ? `${success} article(s) optimisé(s)` : `${success} article(s) optimized`);
      setSelected(new Set());
      await load();
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected.size || !window.confirm(fr ? `Supprimer ${selected.size} article(s) ?` : `Delete ${selected.size} article(s)?`)) return;

    try {
      setBusy(true);
      const { error } = await supabase.from("blog_articles").delete().in("id", [...selected]);
      if (error) throw error;
      toast.success(fr ? "Articles supprimés" : "Articles deleted");
      setSelected(new Set());
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!selectedStore) {
    return <Card className="p-6 text-sm text-muted-foreground">{fr ? "Sélectionnez une boutique pour afficher le blog." : "Select a store to view the blog."}</Card>;
  }

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Contenu" : "Content"}
        page="Blog"
        count={articles.length}
        title="Blog"
        description={fr ? "Créez, optimisez et publiez vos articles depuis un seul écran." : "Create, optimize, and manage articles from one screen."}
        actions={<Button size="sm" onClick={() => setShowWizard(true)}><Plus className="mr-1.5 h-4 w-4" />{fr ? "Nouvel article" : "New article"}</Button>}
      />

      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="border-b p-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher un article" : "Search articles"} className="h-9 pl-9" />
              </div>
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" />{fr ? "Filtres" : "Filters"}</Button></PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="end">
                  <div className="space-y-3">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{fr ? "Tous statuts" : "All statuses"}</SelectItem>
                        <SelectItem value="draft">{fr ? "Brouillon" : "Draft"}</SelectItem>
                        <SelectItem value="published">{fr ? "Publié" : "Published"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{fr ? "Toutes sources" : "All sources"}</SelectItem>
                        <SelectItem value="ai">IA</SelectItem>
                        <SelectItem value="shopify">Shopify</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
              <Badge variant="outline">{toOptimize} {fr ? "à optimiser" : "need SEO"}</Badge>
              <Badge variant="outline">{published} {fr ? "publiés" : "published"}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} ${fr ? "sélectionnés" : "selected"}` : `${filtered.length} articles`}</span>
              <Button size="sm" disabled={!selected.size || busy} onClick={() => optimize([...selected])}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {fr ? "Optimiser" : "Optimize"}
              </Button>
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-lg border px-3 py-2 text-sm">{fr ? "Plus" : "More"}</summary>
                <div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border bg-white p-2 shadow-xl">
                  <Button variant="ghost" size="sm" className="justify-start" onClick={() => optimize(articles.filter((article) => !article.meta_description || (article.optimization_count || 0) === 0).map((article) => article.id))}>
                    <Sparkles className="mr-2 h-4 w-4" />{fr ? "Optimiser manquants" : "Optimize missing"}
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-destructive" onClick={deleteSelected} disabled={!selected.size}>
                    <Trash2 className="mr-2 h-4 w-4" />{fr ? "Supprimer sélection" : "Delete selected"}
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={load}>
                    <RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}
                  </Button>
                </div>
              </details>
            </div>
          </div>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50/70 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2"><Checkbox checked={allRowsSelected} onCheckedChange={toggleCurrentPage} /></th>
                  <th className="px-3 py-2 text-left">Article</th>
                  <th className="px-3 py-2 text-left">SEO</th>
                  <th className="px-3 py-2 text-left">{fr ? "Statut" : "Status"}</th>
                  <th className="w-28 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((article) => {
                  const articleScore = score(article);
                  return (
                    <tr key={article.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selected.has(article.id)}
                          onCheckedChange={() => setSelected((current) => {
                            const next = new Set(current);
                            next.has(article.id) ? next.delete(article.id) : next.add(article.id);
                            return next;
                          })}
                        />
                      </td>
                      <td className="min-w-[280px] px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                            {article.featured_image ? <img src={article.featured_image} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-slate-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{article.title}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(article.created_at), "PP", { locale: fr ? frLocale : undefined })} · {article.source === "ai_generated" ? "AI" : "Shopify"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[560px] px-3 py-2">
                        <p className="truncate font-medium">{article.seo_title || article.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{article.meta_description || (fr ? "Meta description manquante" : "Missing meta description")}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={articleScore >= 80 ? "text-emerald-700" : articleScore >= 60 ? "text-amber-700" : "text-red-600"}>{Math.round(articleScore)}%</Badge>
                          {article.status === "published" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(`/article-landing/${article.id}`, "_blank")}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => optimize([article.id])}><Sparkles className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center p-8 text-sm text-muted-foreground">{fr ? "Aucun article trouvé" : "No articles found"}</div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{pageStart}–{pageEnd} {fr ? "sur" : "of"} {filtered.length}</span>
              <div className="flex items-center gap-2">
                <span>{fr ? "Par page" : "Per page"}</span>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-8 w-[78px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8 px-2" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />{fr ? "Précédent" : "Previous"}
              </Button>

              <div className="hidden items-center gap-1 sm:flex">
                {paginationItems.map((item, index) => item === "ellipsis-left" || item === "ellipsis-right" ? (
                  <span key={`${item}-${index}`} className="grid h-8 w-8 place-items-center text-xs text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={item}
                    size="icon"
                    variant={item === safePage ? "default" : "ghost"}
                    className="h-8 w-8"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              <span className="px-2 text-xs text-muted-foreground sm:hidden">{safePage}/{totalPages}</span>

              <Button size="sm" variant="outline" className="h-8 px-2" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                {fr ? "Suivant" : "Next"}<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showWizard && <BlogWizard onClose={() => { setShowWizard(false); void load(); }} categories={categories} />}
    </div>
  );
}
