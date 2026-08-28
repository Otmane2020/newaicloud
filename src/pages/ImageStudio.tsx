import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, History, Image as ImageIcon, Images, Palette, Search, Sparkles, Star } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { AIImagesDialog } from "@/components/seo/AIImagesDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function ProductStar({ imageCount }: { imageCount: number }) {
  const className = imageCount >= 4
    ? "fill-emerald-500 text-emerald-500"
    : imageCount >= 2
      ? "fill-orange-500 text-orange-500"
      : "fill-red-500 text-red-500";
  return <Star className={`h-4 w-4 ${className}`} />;
}

export default function ImageStudio() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [search, setSearch] = useState("");
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

  const openProductShot = () => {
    if (!selectedProduct?.image_url) return;
    setShowProductShot(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <WorkspacePageHeader
        section="Studio"
        page="Product images"
        count={products.length}
        title="Studio"
        description={fr ? "Sélectionnez un produit, puis créez vos visuels." : "Select a product, then create visuals."}
        actions={
          <Button onClick={openProductShot} disabled={!selectedProduct?.image_url}>
            <Camera className="mr-2 h-4 w-4" />Product Shot AI
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={openProductShot}
          disabled={!selectedProduct?.image_url}
          className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-left transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-5 w-5 text-violet-700" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Product Shot AI</p>
          <p className="mt-1 text-xs text-slate-500">Face · 45° · détails · décor</p>
        </button>

        <Link to="/products/title-description?view=images" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300">
          <ImageIcon className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-sm font-semibold text-slate-950">{fr ? "Fond blanc" : "White background"}</p>
          <p className="mt-1 text-xs text-slate-500">Shopping</p>
        </Link>

        <Link to="/products/title-description?view=images" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300">
          <Palette className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-sm font-semibold text-slate-950">{fr ? "Décor IA" : "AI scene"}</p>
          <p className="mt-1 text-xs text-slate-500">Lifestyle</p>
        </Link>

        <Link to="/seo?tab=alt" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300">
          <Sparkles className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-sm font-semibold text-slate-950">ALT</p>
          <p className="mt-1 text-xs text-slate-500">SEO</p>
        </Link>

        <Link to="/products/media-history" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300">
          <History className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-sm font-semibold text-slate-950">{fr ? "Historique" : "History"}</p>
          <p className="mt-1 text-xs text-slate-500">Versions</p>
        </Link>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={fr ? "Rechercher un produit" : "Search products"} className="h-9 pl-9" />
          </div>
          {selectedProduct && <span className="hidden text-xs text-slate-500 sm:inline">{selectedProduct.title}</span>}
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {filteredProducts.map((product) => {
            const selected = selectedProduct?.id === product.id;
            const imageCount = product.product_images?.length || (product.image_url ? 1 : 0);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
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
