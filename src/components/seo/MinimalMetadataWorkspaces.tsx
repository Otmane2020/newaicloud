import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { calculateDetailedSeoScore, calculateTagsScore } from "@/lib/seoQuality";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PAGE_SIZE = 30;

type StatusFilter = "all" | "optimized" | "missing";

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">Page {page}/{totalPages}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge variant="outline" className={score >= 80 ? "text-emerald-700" : score >= 60 ? "text-amber-700" : "text-red-600"}>
      {Math.round(score)}%
    </Badge>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center text-sm text-muted-foreground">
      <div><Icon className="mx-auto mb-2 h-7 w-7 text-slate-300" />{text}</div>
    </div>
  );
}

async function runInBatches<T>(items: T[], worker: (item: T) => Promise<boolean>, batchSize = 4) {
  let success = 0;
  let failed = 0;
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (item) => {
      try { return await worker(item); } catch { return false; }
    }));
    success += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;
  }
  return { success, failed };
}

export function MinimalCollectionsWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!selectedStore?.id) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("shopify_collections")
        .select("id,title,handle,image_url,seo_title,seo_description,body_html,optimization_count,last_synced_at,products_count")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title");
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Chargement des collections impossible" : "Could not load collections"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); setSelected(new Set()); }, [selectedStore?.id]);
  useEffect(() => { setPage(1); }, [search, status]);

  const score = (item: any) => calculateDetailedSeoScore(
    item.seo_title || item.title,
    item.seo_description || item.body_html?.replace(/<[^>]+>/g, "").slice(0, 160) || "",
    Boolean(item.image_url),
    Boolean(item.handle),
    undefined,
    item.optimization_count || 0,
  ).score;

  const filtered = useMemo(() => items.filter((item) => {
    const optimized = (item.optimization_count || 0) > 0;
    if (status === "optimized" && !optimized) return false;
    if (status === "missing" && optimized) return false;
    if (search && !`${item.title} ${item.handle || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const missing = items.filter((item) => !(item.optimization_count > 0)).length;
  const average = items.length ? Math.round(items.reduce((sum, item) => sum + score(item), 0) / items.length) : 0;

  const optimize = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      setBusy(true);
      const result = await runInBatches(ids, async (id) => {
        const { data, error } = await supabase.functions.invoke("generate-collection-seo", { body: { collection_ids: [id], force: true } });
        return !error && data?.success !== false;
      });
      if (result.success) toast.success(fr ? `${result.success} collection(s) optimisée(s)` : `${result.success} collection(s) optimized`);
      if (result.failed) toast.error(fr ? `${result.failed} collection(s) en échec` : `${result.failed} collection(s) failed`);
      setSelected(new Set());
      await load();
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-none">
      <div className="border-b p-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher une collection" : "Search collections"} className="h-9 pl-9" />
            </div>
            <Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{fr ? "Toutes" : "All"}</SelectItem><SelectItem value="missing">{fr ? "À optimiser" : "Needs SEO"}</SelectItem><SelectItem value="optimized">{fr ? "Optimisées" : "Optimized"}</SelectItem></SelectContent>
            </Select>
            <Badge variant="outline">SEO {average}/100</Badge>
            <Badge variant="outline">{missing} {fr ? "à optimiser" : "missing"}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} sélectionnées` : `${filtered.length} collections`}</span>
            <Button size="sm" variant="outline" disabled={!missing || busy} onClick={() => optimize(items.filter((i) => !(i.optimization_count > 0)).map((i) => i.id))}><Sparkles className="mr-1.5 h-4 w-4" />{fr ? "Tout optimiser" : "Optimize All"}</Button>
            <Button size="sm" disabled={!selected.size || busy} onClick={() => optimize([...selected])}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{fr ? "Optimiser" : "Optimize"}</Button>
            <details className="relative"><summary className="list-none cursor-pointer rounded-lg border px-3 py-2 text-sm">{fr ? "Plus" : "More"}</summary><div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border bg-white p-2 shadow-xl"><Button variant="ghost" size="sm" className="justify-start" onClick={() => optimize(items.filter((i) => !(i.optimization_count > 0)).map((i) => i.id))}><Sparkles className="mr-2 h-4 w-4" />{fr ? "Optimiser manquantes" : "Optimize missing"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}</Button></div></details>
          </div>
        </div>
      </div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50/70 text-xs text-muted-foreground"><tr><th className="w-10 px-3 py-2"><Checkbox checked={rows.every((r) => selected.has(r.id))} onCheckedChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))} /></th><th className="px-3 py-2 text-left">Collection</th><th className="px-3 py-2 text-left">{fr ? "Produits" : "Products"}</th><th className="px-3 py-2 text-left">SEO</th><th className="px-3 py-2 text-left">{fr ? "Statut" : "Status"}</th><th className="w-24 px-3 py-2"></th></tr></thead><tbody className="divide-y">{rows.map((item) => { const itemScore = score(item); const optimized = item.optimization_count > 0; return <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-3 py-2"><Checkbox checked={selected.has(item.id)} onCheckedChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /></td><td className="px-3 py-2"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" />}</div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">/{item.handle}</p></div></div></td><td className="px-3 py-2">{item.products_count || 0}</td><td className="max-w-[420px] px-3 py-2"><p className="truncate font-medium">{item.seo_title || item.title}</p><p className="truncate text-xs text-muted-foreground">{item.seo_description || (fr ? "Description SEO manquante" : "Missing SEO description")}</p></td><td className="px-3 py-2"><div className="flex items-center gap-2"><ScoreBadge score={itemScore} />{optimized && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</div></td><td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" disabled={busy} onClick={() => optimize([item.id])}><Sparkles className="h-4 w-4" /></Button></td></tr>; })}</tbody></table></div> : <EmptyState icon={Package} text={fr ? "Aucune collection trouvée" : "No collections found"} />}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </Card>
  );
}

export function MinimalPagesWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!selectedStore?.id) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("shopify_pages").select("id,title,handle,body_html,seo_title,seo_description,optimization_count,last_synced_at").eq("user_id", user.id).eq("store_id", selectedStore.id).order("title");
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) { toast.error(error?.message || "Pages load failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); setSelected(new Set()); }, [selectedStore?.id]);
  useEffect(() => { setPage(1); }, [search, status]);

  const score = (item: any) => calculateDetailedSeoScore(item.seo_title || item.title, item.seo_description || item.body_html?.replace(/<[^>]+>/g, "").slice(0, 160) || "", false, Boolean(item.handle), undefined, item.optimization_count || 0).score;
  const filtered = useMemo(() => items.filter((item) => { const optimized = item.optimization_count > 0; if (status === "optimized" && !optimized) return false; if (status === "missing" && optimized) return false; return !search || `${item.title} ${item.handle}`.toLowerCase().includes(search.toLowerCase()); }), [items, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const average = items.length ? Math.round(items.reduce((sum, item) => sum + score(item), 0) / items.length) : 0;

  const optimize = async (ids: string[]) => { if (!ids.length) return; try { setBusy(true); const result = await runInBatches(ids, async (id) => { const { data, error } = await supabase.functions.invoke("generate-page-seo", { body: { pageId: id, storeId: selectedStore?.id, force: true } }); return !error && data?.success !== false; }); if (result.success) toast.success(fr ? `${result.success} page(s) optimisée(s)` : `${result.success} page(s) optimized`); if (result.failed) toast.error(fr ? `${result.failed} page(s) en échec` : `${result.failed} page(s) failed`); setSelected(new Set()); await load(); } finally { setBusy(false); } };
  const importPages = async () => { try { setBusy(true); const { data, error } = await supabase.functions.invoke("import-shopify-pages", { body: { storeId: selectedStore?.id } }); if (error) throw error; toast.success(fr ? `${data?.count || 0} page(s) importée(s)` : `${data?.count || 0} page(s) imported`); await load(); } catch (error: any) { toast.error(error?.message || "Import failed"); } finally { setBusy(false); } };

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <Card className="overflow-hidden border-slate-200 shadow-none"><div className="border-b p-3"><div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-1 flex-wrap items-center gap-2"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher une page" : "Search pages"} className="h-9 pl-9" /></div><Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{fr ? "Toutes" : "All"}</SelectItem><SelectItem value="missing">{fr ? "À optimiser" : "Needs SEO"}</SelectItem><SelectItem value="optimized">{fr ? "Optimisées" : "Optimized"}</SelectItem></SelectContent></Select><Badge variant="outline">SEO {average}/100</Badge></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} sélectionnées` : `${filtered.length} pages`}</span><Button size="sm" variant="outline" disabled={!items.some((i) => !(i.optimization_count > 0)) || busy} onClick={() => optimize(items.filter((i) => !(i.optimization_count > 0)).map((i) => i.id))}><Sparkles className="mr-1.5 h-4 w-4" />{fr ? "Tout optimiser" : "Optimize All"}</Button><Button size="sm" disabled={!selected.size || busy} onClick={() => optimize([...selected])}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{fr ? "Optimiser" : "Optimize"}</Button><details className="relative"><summary className="list-none cursor-pointer rounded-lg border px-3 py-2 text-sm">{fr ? "Plus" : "More"}</summary><div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border bg-white p-2 shadow-xl"><Button variant="ghost" size="sm" className="justify-start" onClick={() => optimize(items.filter((i) => !(i.optimization_count > 0)).map((i) => i.id))}><Sparkles className="mr-2 h-4 w-4" />{fr ? "Optimiser manquantes" : "Optimize missing"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={importPages}><Upload className="mr-2 h-4 w-4" />{fr ? "Importer Shopify" : "Import Shopify"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}</Button></div></details></div></div></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50/70 text-xs text-muted-foreground"><tr><th className="w-10 px-3 py-2"><Checkbox checked={rows.every((r) => selected.has(r.id))} onCheckedChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))} /></th><th className="px-3 py-2 text-left">Page</th><th className="px-3 py-2 text-left">SEO</th><th className="px-3 py-2 text-left">{fr ? "Statut" : "Status"}</th><th className="w-24 px-3 py-2"></th></tr></thead><tbody className="divide-y">{rows.map((item) => { const itemScore = score(item); return <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-3 py-2"><Checkbox checked={selected.has(item.id)} onCheckedChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /></td><td className="px-3 py-2"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">/pages/{item.handle}</p></td><td className="max-w-[520px] px-3 py-2"><p className="truncate font-medium">{item.seo_title || item.title}</p><p className="truncate text-xs text-muted-foreground">{item.seo_description || (fr ? "Description SEO manquante" : "Missing SEO description")}</p></td><td className="px-3 py-2"><div className="flex items-center gap-2"><ScoreBadge score={itemScore} />{item.optimization_count > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</div></td><td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => optimize([item.id])}><Sparkles className="h-4 w-4" /></Button></td></tr>; })}</tbody></table></div> : <EmptyState icon={FileText} text={fr ? "Aucune page trouvée" : "No pages found"} />}<Pager page={page} totalPages={totalPages} onChange={setPage} /></Card>;
}

export function MinimalTagsWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => { if (!selectedStore?.id) { setItems([]); setLoading(false); return; } try { setLoading(true); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data, error } = await supabase.from("shopify_products").select("id,title,tags,vendor,image_url,product_type,optimization_count,seo_synced_to_shopify").eq("seller_id", user.id).eq("store_id", selectedStore.id).order("title"); if (error) throw error; setItems(data || []); } catch (error: any) { toast.error(error?.message || "Tags load failed"); } finally { setLoading(false); } };
  useEffect(() => { load(); setSelected(new Set()); }, [selectedStore?.id]);
  useEffect(() => { setPage(1); }, [search, status]);
  const optimized = (item: any) => Boolean(item.tags?.trim()) && calculateTagsScore(item.tags) >= 8;
  const filtered = useMemo(() => items.filter((item) => { const ok = optimized(item); if (status === "optimized" && !ok) return false; if (status === "missing" && ok) return false; return !search || `${item.title} ${item.vendor || ""}`.toLowerCase().includes(search.toLowerCase()); }), [items, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); const missing = items.filter((item) => !optimized(item)).length;
  const generate = async (ids: string[]) => { if (!ids.length) return; try { setBusy(true); const result = await runInBatches(ids, async (id) => { const { data, error } = await supabase.functions.invoke("generate-tags", { body: { productId: id, force: true } }); return !error && data?.success !== false; }); if (result.success) toast.success(fr ? `${result.success} produit(s) traité(s)` : `${result.success} product(s) processed`); if (result.failed) toast.error(fr ? `${result.failed} produit(s) en échec` : `${result.failed} product(s) failed`); setSelected(new Set()); await load(); } finally { setBusy(false); } };
  const tagArray = (value: string | null) => { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return value.split(",").map((tag) => tag.trim()).filter(Boolean); } };
  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <Card className="overflow-hidden border-slate-200 shadow-none"><div className="border-b p-3"><div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-1 flex-wrap items-center gap-2"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher un produit" : "Search products"} className="h-9 pl-9" /></div><Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{fr ? "Tous" : "All"}</SelectItem><SelectItem value="missing">{fr ? "À optimiser" : "Needs tags"}</SelectItem><SelectItem value="optimized">{fr ? "Optimisés" : "Optimized"}</SelectItem></SelectContent></Select><Badge variant="outline">{missing} {fr ? "à optimiser" : "missing"}</Badge></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} sélectionnés` : `${filtered.length} produits`}</span><Button size="sm" variant="outline" disabled={!missing || busy} onClick={() => generate(items.filter((i) => !optimized(i)).map((i) => i.id))}><Sparkles className="mr-1.5 h-4 w-4" />{fr ? "Tout optimiser" : "Optimize All"}</Button><Button size="sm" disabled={!selected.size || busy} onClick={() => generate([...selected])}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{fr ? "Générer" : "Generate"}</Button><details className="relative"><summary className="list-none cursor-pointer rounded-lg border px-3 py-2 text-sm">{fr ? "Plus" : "More"}</summary><div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border bg-white p-2 shadow-xl"><Button variant="ghost" size="sm" className="justify-start" onClick={() => generate(items.filter((i) => !optimized(i)).map((i) => i.id))}><Sparkles className="mr-2 h-4 w-4" />{fr ? "Générer manquants" : "Generate missing"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}</Button></div></details></div></div></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50/70 text-xs text-muted-foreground"><tr><th className="w-10 px-3 py-2"><Checkbox checked={rows.every((r) => selected.has(r.id))} onCheckedChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))} /></th><th className="px-3 py-2 text-left">{fr ? "Produit" : "Product"}</th><th className="px-3 py-2 text-left">Tags</th><th className="px-3 py-2 text-left">{fr ? "Statut" : "Status"}</th><th className="w-24 px-3 py-2"></th></tr></thead><tbody className="divide-y">{rows.map((item) => { const tagsList = tagArray(item.tags); const ok = optimized(item); return <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-3 py-2"><Checkbox checked={selected.has(item.id)} onCheckedChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /></td><td className="px-3 py-2"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" />}</div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.vendor || item.product_type || "—"}</p></div></div></td><td className="max-w-[520px] px-3 py-2"><div className="flex flex-wrap gap-1">{tagsList.slice(0, 6).map((tag: string) => <Badge key={tag} variant="secondary" className="text-[11px]">{tag}</Badge>)}{tagsList.length > 6 && <Badge variant="outline" className="text-[11px]">+{tagsList.length - 6}</Badge>}{!tagsList.length && <span className="text-xs text-muted-foreground">{fr ? "Aucun tag" : "No tags"}</span>}</div></td><td className="px-3 py-2">{ok ? <Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />OK</Badge> : <Badge variant="outline" className="text-amber-700">{fr ? "À optimiser" : "Needs work"}</Badge>}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => generate([item.id])}><Sparkles className="h-4 w-4" /></Button></td></tr>; })}</tbody></table></div> : <EmptyState icon={Tags} text={fr ? "Aucun produit trouvé" : "No products found"} />}<Pager page={page} totalPages={totalPages} onChange={setPage} /></Card>;
}

type AltItem = { id: string; src: string; alt_text: string | null; optimization_count: number | null; last_synced_at: string | null; imageType: "product" | "collection" | "page" | "article" | "homepage" | "content"; title: string; subtitle: string };

export function MinimalAltWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [items, setItems] = useState<AltItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!selectedStore?.id) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      const [productResult, contentResult, collectionResult, pageResult, articleResult] = await Promise.all([
        supabase.from("product_images").select("id,src,alt_text,optimization_count,last_synced_at,product:shopify_products!inner(id,title,vendor,store_id)").eq("product.store_id", selectedStore.id),
        supabase.from("content_images").select("id,content_id,content_type,src,alt_text,optimization_count,last_synced_at").eq("store_id", selectedStore.id),
        supabase.from("shopify_collections").select("id,title").eq("store_id", selectedStore.id),
        supabase.from("shopify_pages").select("id,title").eq("store_id", selectedStore.id),
        supabase.from("blog_articles").select("id,title").eq("store_id", selectedStore.id),
      ]);
      if (productResult.error) throw productResult.error;
      if (contentResult.error) throw contentResult.error;
      const titles = new Map<string, string>();
      [...(collectionResult.data || []), ...(pageResult.data || []), ...(articleResult.data || [])].forEach((row: any) => titles.set(row.id, row.title));
      const productImages: AltItem[] = (productResult.data || []).map((row: any) => ({ id: row.id, src: row.src, alt_text: row.alt_text, optimization_count: row.optimization_count, last_synced_at: row.last_synced_at, imageType: "product", title: row.product?.title || "Product", subtitle: row.product?.vendor || "Product" }));
      const contentImages: AltItem[] = (contentResult.data || []).map((row: any) => ({ id: row.id, src: row.src, alt_text: row.alt_text, optimization_count: row.optimization_count, last_synced_at: row.last_synced_at, imageType: (row.content_type || "content") as AltItem["imageType"], title: row.content_type === "homepage" ? (fr ? "Page d'accueil" : "Homepage") : titles.get(row.content_id) || row.content_type || "Content", subtitle: row.content_type || "content" }));
      setItems([...productImages, ...contentImages]);
    } catch (error: any) { toast.error(error?.message || "Images load failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); setSelected(new Set()); }, [selectedStore?.id]);
  useEffect(() => { setPage(1); }, [search, status]);
  const optimized = (item: AltItem) => Boolean(item.alt_text?.trim()) && (item.optimization_count || 0) > 0;
  const filtered = useMemo(() => items.filter((item) => { const ok = optimized(item); if (status === "optimized" && !ok) return false; if (status === "missing" && ok) return false; return !search || `${item.title} ${item.subtitle} ${item.alt_text || ""}`.toLowerCase().includes(search.toLowerCase()); }), [items, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); const missing = items.filter((item) => !optimized(item)).length;
  const generate = async (targets: AltItem[]) => { if (!targets.length) return; try { setBusy(true); const failures: string[] = []; const result = await runInBatches(targets, async (item) => { const { data, error } = await supabase.functions.invoke("smart-alt-text", { body: { image_id: item.id, imageType: item.imageType, force: true } }); if (error || data?.success === false) { failures.push(data?.error || error?.message || item.title); return false; } return true; }, 3); if (result.success) toast.success(fr ? `${result.success} ALT généré(s)` : `${result.success} ALT text(s) generated`); if (result.failed) toast.error(fr ? `${result.failed} ALT en échec${failures[0] ? ` : ${failures[0]}` : ""}` : `${result.failed} ALT failed${failures[0] ? `: ${failures[0]}` : ""}`); setSelected(new Set()); await load(); } finally { setBusy(false); } };
  const importImages = async () => { try { setBusy(true); const { data, error } = await supabase.functions.invoke("import-content-images", { body: { storeId: selectedStore?.id, types: ["collections", "pages", "articles", "homepage"] } }); if (error) throw error; toast.success(fr ? `${data?.totalImported || 0} image(s) importée(s)` : `${data?.totalImported || 0} image(s) imported`); await load(); } catch (error: any) { toast.error(error?.message || "Import failed"); } finally { setBusy(false); } };
  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <Card className="overflow-hidden border-slate-200 shadow-none"><div className="border-b p-3"><div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-1 flex-wrap items-center gap-2"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher une image" : "Search images"} className="h-9 pl-9" /></div><Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{fr ? "Toutes" : "All"}</SelectItem><SelectItem value="missing">{fr ? "ALT manquant" : "Needs ALT"}</SelectItem><SelectItem value="optimized">{fr ? "Optimisées" : "Optimized"}</SelectItem></SelectContent></Select><Badge variant="outline">{missing} {fr ? "à optimiser" : "missing"}</Badge></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{selected.size ? `${selected.size} sélectionnées` : `${filtered.length} images`}</span><Button size="sm" variant="outline" disabled={!missing || busy} onClick={() => generate(items.filter((item) => !optimized(item)))}><Sparkles className="mr-1.5 h-4 w-4" />{fr ? "Tout optimiser" : "Optimize All"}</Button><Button size="sm" disabled={!selected.size || busy} onClick={() => generate(items.filter((item) => selected.has(item.id)))}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{fr ? "Générer ALT" : "Generate ALT"}</Button><details className="relative"><summary className="list-none cursor-pointer rounded-lg border px-3 py-2 text-sm">{fr ? "Plus" : "More"}</summary><div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border bg-white p-2 shadow-xl"><Button variant="ghost" size="sm" className="justify-start" onClick={() => generate(items.filter((item) => !optimized(item)))}><Sparkles className="mr-2 h-4 w-4" />{fr ? "Générer manquants" : "Generate missing"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={importImages}><Upload className="mr-2 h-4 w-4" />{fr ? "Importer images contenu" : "Import content images"}</Button><Button variant="ghost" size="sm" className="justify-start" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}</Button></div></details></div></div></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-slate-50/70 text-xs text-muted-foreground"><tr><th className="w-10 px-3 py-2"><Checkbox checked={rows.every((r) => selected.has(r.id))} onCheckedChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))} /></th><th className="w-16 px-3 py-2"></th><th className="px-3 py-2 text-left">{fr ? "Contenu" : "Content"}</th><th className="px-3 py-2 text-left">ALT</th><th className="px-3 py-2 text-left">{fr ? "Statut" : "Status"}</th><th className="w-24 px-3 py-2"></th></tr></thead><tbody className="divide-y">{rows.map((item) => { const ok = optimized(item); return <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-3 py-2"><Checkbox checked={selected.has(item.id)} onCheckedChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} /></td><td className="px-3 py-2"><div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-slate-100">{item.src ? <img src={item.src} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-slate-400" />}</div></td><td className="px-3 py-2"><p className="font-medium">{item.title}</p><p className="text-xs capitalize text-muted-foreground">{item.subtitle}</p></td><td className="max-w-[560px] px-3 py-2"><p className="line-clamp-2 text-sm">{item.alt_text || <span className="text-muted-foreground">{fr ? "ALT manquant" : "Missing ALT"}</span>}</p></td><td className="px-3 py-2">{ok ? <Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />OK</Badge> : <Badge variant="outline" className="text-amber-700">{fr ? "À générer" : "Generate"}</Badge>}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => generate([item])}><Sparkles className="h-4 w-4" /></Button></td></tr>; })}</tbody></table></div> : <EmptyState icon={ImageIcon} text={fr ? "Aucune image trouvée" : "No images found"} />}<Pager page={page} totalPages={totalPages} onChange={setPage} /></Card>;
}
