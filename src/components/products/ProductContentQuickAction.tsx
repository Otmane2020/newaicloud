import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  OptimizationConfigDialog,
  type OptimizationConfig,
} from "@/components/seo/OptimizationConfigDialog";
import { useStore } from "@/contexts/StoreContext";
import { useProductContentOptimization } from "@/hooks/useProductContentOptimization";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

type ProductContentRow = {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

type ProductImage = {
  id: string;
  src: string;
  alt_text: string | null;
};

const getProductId = (pathname: string) => {
  const match = pathname.match(/^\/products\/([0-9a-f-]{36})$/i);
  return match?.[1] || null;
};

export function ProductContentQuickAction({ pathname }: { pathname: string }) {
  const productId = useMemo(() => getProductId(pathname), [pathname]);
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const { optimizeProductContent, isOptimizingContent, optimizationProgress } = useProductContentOptimization();
  const [product, setProduct] = useState<ProductContentRow | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!productId) {
        setProduct(null);
        setImages([]);
        return;
      }

      const [{ data: productData, error: productError }, { data: imageData }] = await Promise.all([
        supabase
          .from("shopify_products")
          .select("id, title, image_url, vendor, seo_title, seo_description")
          .eq("id", productId)
          .maybeSingle(),
        supabase
          .from("product_images")
          .select("id, src, alt_text")
          .eq("product_id", productId)
          .order("position", { ascending: true })
          .limit(12),
      ]);

      if (cancelled) return;
      if (productError) {
        console.warn("[PRODUCT_CONTENT_QUICK_ACTION] Product load failed:", productError);
        setProduct(null);
        return;
      }

      setProduct((productData || null) as ProductContentRow | null);
      setImages((imageData || []) as ProductImage[]);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [productId, selectedStore?.id]);

  if (!productId || !product) return null;

  const handleOptimize = async (config: OptimizationConfig) => {
    const optimized = await optimizeProductContent([product], config);
    if (optimized[0]) setProduct(optimized[0] as ProductContentRow);
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden rounded-2xl border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">{fr ? "Titre + description IA" : "AI title + description"}</p>
                <Badge variant="secondary" className="rounded-full">SEO</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {fr
                  ? "Le même moteur que /products/title-description, directement dans la fiche produit."
                  : "The same engine as /products/title-description, directly in the product page."}
              </p>
              {(product.seo_title || product.seo_description) && (
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {product.seo_title && <p className="truncate"><strong className="text-slate-700">SEO:</strong> {product.seo_title}</p>}
                  {product.seo_description && <p className="line-clamp-1"><strong className="text-slate-700">Meta:</strong> {product.seo_description}</p>}
                </div>
              )}
            </div>
          </div>

          <Button
            className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700"
            onClick={() => setShowConfig(true)}
            disabled={isOptimizingContent}
          >
            {isOptimizingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isOptimizingContent
              ? `${optimizationProgress?.index || 1}/${optimizationProgress?.total || 1}`
              : (fr ? "Optimiser maintenant" : "Optimize now")}
          </Button>
        </CardContent>
      </Card>

      <OptimizationConfigDialog
        key={`${product.id}-${showConfig ? "open" : "closed"}`}
        open={showConfig}
        onOpenChange={setShowConfig}
        onConfirm={(config) => void handleOptimize(config)}
        productCount={1}
        mainImageUrl={product.image_url || undefined}
        productImages={images.map((image) => ({
          id: image.id,
          image_url: image.src,
          alt_text: image.alt_text || undefined,
        }))}
      />
    </>
  );
}
