import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, ChevronRight, History, Image as ImageIcon, Images, Palette, Search, Sparkles, Star } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { AIImagesDialog } from "@/components/seo/AIImagesDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

interface StudioProduct {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
  product_images?: Array<{ id: string; src: string }> | null;
}

const PAGE_SIZE = 20;

function ProductStar({ imageCount }: { imageCount: number }) {
  const className = imageCount >= 4
    ? "fill-emerald-500 text-emerald-500"
    : imageCount >= 2
      ? "fill-orange-500 text-orange-500"
      : "fill-red-500 text-red-500";
  return <Star className={`h-4 w-4 ${className}`} />;
}

export default function StudioImages() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProductId = searchParams.get("product");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<StudioProduct | null>(null);
  const [showProductShot, setShowProductShot] = useState(false);

  const { data: products = [], refetch } = useQuery({
    queryKey: ["studio-products", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async (): Promise<StudioProduct[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, vendor, handle, product_type, body_html, seo_description, product_images(id, src)")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StudioProduct[];
    },
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.title.toLowerCase().includes(q) || product.vendor?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, selectedStore?.id]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!requestedProductId || products.length === 0) return;
    const requested = products.find((product) => product.id === requestedProductId);
    if (requested && requested.id !== selectedProduct?.id) {
      setSelectedProduct(requested);
      const index = filteredProducts.findIndex((product) => product.id === requested.id);
      if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
    }
  }, [filteredProducts, products, requestedProductId, selectedProduct?.id]);

  const chooseProduct = (product: StudioProduct) => {
    setSelectedProduct(product);
    const next = new URLSearchParams(searchParams);
    next.set("product", product.id);
    if (!next.get("tool")) next.set("tool", "images");
    setSearchParams(next, { replace: true });
  };

  const openProductShot = () => {
    if (!selectedProduct?.image_url) return;
    setShowProductShot(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section="Studio"
        page="Product images"
        count={products.length}
        title={fr ? "Images produit" : "Product images"}
        description={fr ? "Sélectionnez un produit, puis créez vos visuels." : "Select a product, then create visuals."}
        actions={
          <Button size="sm" onClick={openProductShot} disabled={!selectedProduct?.image_url}>
            <Camera className="mr-2 h-4 w-4" />Product Shot AI
          </Button>
        }
      />

      <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <Button size="sm" variant="secondary" onClick={openProductShot} disabled={!selectedProduct?.image_url}>
          <Camera className="mr-1.5 h-4 w-4" />Product Shot AI
        </Button>
        <Button size="sm" variant="ghost" asChild><Link to="/products/title-description?view=images"><ImageIcon className="mr-1.5 h-4 w-4" />{fr ? "Fond blanc" : "White background"}</Link></Button>
        <Button size="sm" variant="ghost" asChild><Link to="/products/title-description?view=images"><Palette className="mr-1.5 h-4 w-4" />{fr ? "Décor IA" : "AI scene"}</Link></Button>
        <Button size="sm" variant="ghost" asChild><Link to="/seo?tab=alt"><Sparkles className="mr-1.5 h-4 w-4" />ALT</Link></Button>
        <Button size="sm" variant="ghost" asChild><Link to={`/studio?tool=library${selectedProduct ? `&product=${encodeURIComponent(selectedProduct.id)}` : ""}`}><History className="mr-1.5 h-4 w-4" />{fr ? "Historique" : "History"}</Link></Button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={fr ? "Rechercher un produit" : "Search products"} className="h-9 pl-9" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{filteredProducts.length} {fr ? "produits" : "products"}</span>
            {selectedProduct && <span className="hidden max-w-[240px] truncate sm:inline">· {selectedProduct.title}</span>}
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {paginatedProducts.map((product) => {
            const selected = selectedProduct?.id === product.id;
            const imageCount = product.product_images?.length || (product.image_url ? 1 : 0);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => chooseProduct(product)}
                className={`overflow-hidden rounded-xl border bg-white text-left transition ${selected ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="relative aspect-square bg-slate-50">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center"><Images className="h-8 w-8 text-slate-300" /></div>
                  )}
                  {selected && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-4 w-4" /></span>}
                </div>
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <ProductStar imageCount={imageCount} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{product.title}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-slate-400">{imageCount} {fr ? "image(s)" : "image(s)"}</p>
                </div>
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">{fr ? "Aucun produit trouvé." : "No products found."}</div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5">
            <span className="text-xs text-slate-500">{fr ? "Page" : "Page"} {page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <AIImagesDialog
        open={showProductShot}
        onOpenChange={setShowProductShot}
        selectedProducts={selectedProduct ? [{
          id: selectedProduct.id,
          title: selectedProduct.title,
          image_url: selectedProduct.image_url,
          vendor: selectedProduct.vendor,
          handle: selectedProduct.handle,
          product_type: selectedProduct.product_type,
          body_html: selectedProduct.body_html,
          seo_description: selectedProduct.seo_description,
        }] : []}
        onComplete={() => refetch()}
      />
    </div>
  );
}
