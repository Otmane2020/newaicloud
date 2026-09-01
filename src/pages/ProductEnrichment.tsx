import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useTranslation } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

interface Product {
  id: string;
  title: string | null;
  image_url: string | null;
  enrichment_status: string | null;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
}

type ProductFilter = 'all' | 'enriched' | 'pending';

const isEnriched = (status: string | null) =>
  ['enriched', 'completed', 'optimized'].includes((status || '').toLowerCase());

export default function ProductEnrichment() {
  const { selectedStore, loading: storesLoading } = useStore();
  const { language } = useTranslation();
  const fr = language === 'fr';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');

  const fetchProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, image_url, enrichment_status, ai_color, ai_material, ai_shape')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(fr ? 'Impossible de charger les produits' : 'Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore?.id]);

  const handleBulkEnrich = async (productIds: string[], productId?: string) => {
    if (!productIds.length) return;

    setEnriching(true);
    setActiveProductId(productId || null);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let errorCount = 0;

    for (let index = 0; index < productIds.length; index += 1) {
      try {
        const { data, error } = await supabase.functions.invoke('enrich-product', {
          body: { productId: productIds[index] },
        });

        if (error) throw error;
        if (data?.success) successCount += 1;
        else errorCount += 1;
      } catch (error) {
        console.error('Error enriching product:', error);
        errorCount += 1;
      }

      setProgress({ current: index + 1, total: productIds.length });
    }

    setEnriching(false);
    setActiveProductId(null);

    if (errorCount > 0) {
      toast.warning(
        fr
          ? `${successCount} enrichi(s), ${errorCount} erreur(s)`
          : `${successCount} enriched, ${errorCount} error(s)`,
      );
    } else {
      toast.success(
        fr
          ? `${successCount} produit(s) enrichi(s)`
          : `${successCount} product(s) enriched`,
      );
    }

    await fetchProducts();
  };

  const enrichedCount = products.filter((product) => isEnriched(product.enrichment_status)).length;
  const pendingCount = products.length - enrichedCount;
  const enrichmentRate = products.length > 0 ? Math.round((enrichedCount / products.length) * 100) : 0;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const enriched = isEnriched(product.enrichment_status);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'enriched' && enriched) ||
        (filter === 'pending' && !enriched);

      const matchesQuery =
        !normalizedQuery ||
        (product.title || '').toLowerCase().includes(normalizedQuery) ||
        (product.ai_color || '').toLowerCase().includes(normalizedQuery) ||
        (product.ai_material || '').toLowerCase().includes(normalizedQuery) ||
        (product.ai_shape || '').toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [products, query, filter]);

  const handleEnrichAll = async () => {
    const pendingIds = products
      .filter((product) => !isEnriched(product.enrichment_status))
      .map((product) => product.id);

    if (!pendingIds.length) {
      toast.info(fr ? 'Tous les produits sont déjà enrichis' : 'All products are already enriched');
      return;
    }

    await handleBulkEnrich(pendingIds);
  };

  if (storesLoading || loading) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!selectedStore) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Package className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            {fr ? 'Sélectionnez une boutique' : 'Select a store'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {fr
              ? 'Choisissez une boutique Shopify pour afficher et enrichir ses produits.'
              : 'Choose a Shopify store to view and enrich its products.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>{fr ? 'Contenu' : 'Content'}</span>
            <span>·</span>
            <span>{selectedStore.store_name || selectedStore.store_url}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {fr ? 'Enrichissement produit' : 'Product enrichment'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {fr
              ? 'L’IA identifie automatiquement la couleur, le matériau et la forme de vos produits.'
              : 'AI automatically identifies product color, material and shape.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchProducts}
            disabled={enriching}
            aria-label={fr ? 'Actualiser' : 'Refresh'}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleEnrichAll}
            disabled={enriching || pendingCount === 0}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {enriching && !activeProductId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {fr ? `Enrichir les produits (${pendingCount})` : `Enrich products (${pendingCount})`}
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{fr ? 'Produits chargés' : 'Loaded products'}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="text-2xl font-semibold text-slate-950">{products.length}</strong>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm text-slate-500">{fr ? 'Enrichis' : 'Enriched'}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="text-2xl font-semibold text-emerald-700">{enrichedCount}</strong>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{fr ? 'À enrichir' : 'To enrich'}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="text-2xl font-semibold text-slate-950">{pendingCount}</strong>
            <Circle className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {fr ? 'Couverture d’enrichissement' : 'Enrichment coverage'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {enrichmentRate}% {fr ? 'des produits chargés sont enrichis' : 'of loaded products are enriched'}
            </p>
          </div>
          <span className="text-sm font-semibold text-violet-700">{enrichmentRate}%</span>
        </div>
        <Progress value={enrichmentRate} className="mt-3 h-1.5 [&>div]:bg-violet-600" />
      </section>

      {enriching && progress.total > 0 && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 font-medium text-violet-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              {fr ? 'Analyse IA en cours' : 'AI analysis in progress'}
            </span>
            <span className="text-violet-700">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress
            value={progress.total ? (progress.current / progress.total) * 100 : 0}
            className="mt-3 h-1.5 [&>div]:bg-violet-600"
          />
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {fr ? 'Produits' : 'Products'}
            </h2>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} {fr ? 'résultat(s)' : 'result(s)'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={fr ? 'Rechercher un produit' : 'Search products'}
                className="h-9 border-slate-200 bg-white pl-9"
              />
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              {([
                ['all', fr ? 'Tous' : 'All'],
                ['enriched', fr ? 'Enrichis' : 'Enriched'],
                ['pending', fr ? 'À enrichir' : 'To enrich'],
              ] as Array<[ProductFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    filter === value
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const enriched = isEnriched(product.enrichment_status);
              const attributes = [
                { label: fr ? 'Couleur' : 'Color', value: product.ai_color },
                { label: fr ? 'Matériau' : 'Material', value: product.ai_material },
                { label: fr ? 'Forme' : 'Shape', value: product.ai_shape },
              ];

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="relative aspect-[4/3] border-b border-slate-100 bg-slate-50">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title || (fr ? 'Produit' : 'Product')}
                        className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-300">
                        <Package className="h-10 w-10" />
                      </div>
                    )}

                    <span
                      className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        enriched
                          ? 'border-emerald-200 bg-white/95 text-emerald-700'
                          : 'border-slate-200 bg-white/95 text-slate-600'
                      }`}
                    >
                      {enriched ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      {enriched ? (fr ? 'Enrichi' : 'Enriched') : fr ? 'À enrichir' : 'To enrich'}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                      {product.title || (fr ? 'Produit sans titre' : 'Untitled product')}
                    </h3>

                    {enriched ? (
                      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 px-3">
                        {attributes.map((attribute) => (
                          <div key={attribute.label} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                            <span className="text-slate-500">{attribute.label}</span>
                            <span className="max-w-[60%] truncate font-medium text-slate-800">
                              {attribute.value || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3">
                        <p className="text-xs leading-5 text-slate-500">
                          {fr
                            ? 'Analysez ce produit pour détecter automatiquement ses attributs visuels.'
                            : 'Analyze this product to automatically detect its visual attributes.'}
                        </p>
                      </div>
                    )}

                    {!enriched && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full justify-between border-slate-200"
                        disabled={enriching}
                        onClick={() => handleBulkEnrich([product.id], product.id)}
                      >
                        <span className="flex items-center gap-2">
                          {activeProductId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                          )}
                          {fr ? 'Enrichir ce produit' : 'Enrich product'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {products.length === 0
                ? fr
                  ? 'Aucun produit disponible'
                  : 'No products available'
                : fr
                  ? 'Aucun produit trouvé'
                  : 'No products found'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {products.length === 0
                ? fr
                  ? 'Synchronisez votre catalogue Shopify puis actualisez cette page.'
                  : 'Sync your Shopify catalog, then refresh this page.'
                : fr
                  ? 'Essayez une autre recherche ou un autre filtre.'
                  : 'Try another search or filter.'}
            </p>
            {products.length === 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchProducts}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {fr ? 'Actualiser' : 'Refresh'}
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
