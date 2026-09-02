import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Loader2, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OptimizationConfigDialog,
  type OptimizationConfig,
} from "@/components/seo/OptimizationConfigDialog";
import { useStore } from "@/contexts/StoreContext";
import { useProductContentOptimization } from "@/hooks/useProductContentOptimization";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

type StudioContentProduct = {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  product_type?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  product_images?: Array<{ id: string; src: string; alt_text?: string | null }> | null;
};

export default function StudioContentWorkflow() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const { optimizeProductContent, isOptimizingContent, optimizationProgress } = useProductContentOptimization();
  const [products, setProducts] = useState<StudioContentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<StudioContentProduct[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  const loadProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, vendor, product_type, seo_title, seo_description, product_images(id, src, alt_text)")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setProducts((data || []) as StudioContentProduct[]);
    } catch (error) {
      console.error("[STUDIO_CONTENT] Could not load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore?.id]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""} ${product.seo_title || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.has(product.id)),
    [products, selectedIds],
  );

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const openSingle = (product: StudioContentProduct) => {
    setTargets([product]);
    setShowConfig(true);
  };

  const openBulk = () => {
    if (selectedProducts.length === 0) return;
    setTargets(selectedProducts);
    setShowConfig(true);
  };

  const handleOptimize = async (config: OptimizationConfig) => {
    const optimized = await optimizeProductContent(targets, config);
    if (optimized.length > 0) {
      setSelectedIds(new Set());
      await loadProducts();
    }
  };

  const singleTarget = targets.length === 1 ? targets[0] : null;
  const configImages = singleTarget?.product_images || [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-violet-600 hover:bg-violet-600"><FileText className="mr-1.5 h-3.5 w-3.5" />SEO Content</Badge>
                <Badge variant="secondary">{fr ? "Moteur existant réutilisé" : "Existing engine reused"}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">
                {fr ? "Optimisez les titres et descriptions depuis Studio" : "Optimize titles and descriptions from Studio"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {fr
                  ? "Même génération que /products/title-description : SEO title, meta description, Vision AI et configuration du contenu."
                  : "Same generation as /products/title-description: SEO title, meta description, Vision AI and content configuration."}
              </p>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={fr ? "Rechercher un produit…" : "Search a product…"}
                className="h-11 pl-9"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-slate-50/50 p-4">
          {loading ? (
            <div className="grid min-h-80 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
              {fr ? "Aucun produit trouvé." : "No products found."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const selected = selectedIds.has(product.id);
                const optimized = Boolean(product.seo_title && product.seo_description);

                return (
                  <div
                    key={product.id}
                    className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:shadow-md"}`}
                  >
                    <button type="button" onClick={() => openSingle(product)} className="block w-full text-left">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="h-full w-full object-contain p-3" />
                        ) : (
                          <div className="grid h-full place-items-center"><FileText className="h-8 w-8 text-slate-300" /></div>
                        )}
                        <Badge className={`absolute bottom-3 left-3 ${optimized ? "bg-emerald-600 hover:bg-emerald-600" : "bg-slate-900 hover:bg-slate-900"}`}>
                          {optimized ? (fr ? "SEO optimisé" : "SEO optimized") : (fr ? "À optimiser" : "Needs optimization")}
                        </Badge>
                      </div>
                      <div className="p-3 pr-11">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{product.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{product.vendor || product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</p>
                        {product.seo_title && <p className="mt-2 line-clamp-1 text-[11px] text-violet-700">SEO · {product.seo_title}</p>}
                        <p className="mt-2 text-[11px] font-semibold text-violet-700">{fr ? "Configurer et générer →" : "Configure and generate →"}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSelection(product.id)}
                      aria-label={fr ? "Ajouter à la sélection groupée" : "Add to bulk selection"}
                      className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border shadow-sm transition ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white/95 text-transparent hover:border-violet-300"}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-3 xl:sticky xl:top-[72px] xl:self-start">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="h-5 w-5" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{fr ? "Génération groupée" : "Bulk generation"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {fr ? "Sélectionnez plusieurs produits puis appliquez la même configuration à toute la sélection." : "Select multiple products and apply the same configuration to the entire selection."}
          </p>
          <div className="mt-5 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">{fr ? "Sélection" : "Selection"}</span><strong>{selectedProducts.length}</strong></div>
            {isOptimizingContent && optimizationProgress && (
              <p className="mt-2 truncate text-xs text-violet-700">{optimizationProgress.index}/{optimizationProgress.total} · {optimizationProgress.title}</p>
            )}
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={openBulk} disabled={selectedProducts.length === 0 || isOptimizingContent}>
            {isOptimizingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {fr ? `Optimiser · ${selectedProducts.length}` : `Optimize · ${selectedProducts.length}`}
          </Button>
          {selectedProducts.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setSelectedIds(new Set())} disabled={isOptimizingContent}>
              {fr ? "Effacer la sélection" : "Clear selection"}
            </Button>
          )}
        </section>
      </aside>

      <OptimizationConfigDialog
        key={`${targets.map((product) => product.id).join("-")}-${showConfig ? "open" : "closed"}`}
        open={showConfig}
        onOpenChange={setShowConfig}
        onConfirm={(config) => void handleOptimize(config)}
        productCount={targets.length}
        mainImageUrl={singleTarget?.image_url || undefined}
        productImages={configImages.map((image) => ({
          id: image.id,
          image_url: image.src,
          alt_text: image.alt_text || undefined,
        }))}
      />
    </div>
  );
}
