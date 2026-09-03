import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

type SeoExecutionBannerProps = {
  active: boolean;
  title?: string;
  message?: string;
  progress?: number | null;
  current?: number | null;
  total?: number | null;
  productId?: string | null;
  productTitle?: string | null;
  lookupTitle?: string | null;
  imageUrls?: Array<string | null | undefined>;
  className?: string;
};

type ProductMedia = {
  id: string;
  image_url: string | null;
};

const uniqueUrls = (urls: Array<string | null | undefined>) =>
  Array.from(new Set(urls.map((url) => url?.trim()).filter(Boolean) as string[]));

export function SeoExecutionBanner({
  active,
  title,
  message,
  progress = null,
  current = null,
  total = null,
  productId,
  productTitle,
  lookupTitle,
  imageUrls = [],
  className = "",
}: SeoExecutionBannerProps) {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const reduceMotion = useReducedMotion();
  const [resolvedProduct, setResolvedProduct] = useState<ProductMedia | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const resolveProduct = async () => {
      if (!active) return;

      if (productId) {
        setResolvedProduct((previous) =>
          previous?.id === productId ? previous : { id: productId, image_url: null },
        );
        return;
      }

      const titleToFind = lookupTitle?.trim() || productTitle?.trim();
      if (!titleToFind || !selectedStore?.id) {
        setResolvedProduct(null);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("shopify_products")
          .select("id, image_url")
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id)
          .eq("title", titleToFind)
          .limit(1)
          .maybeSingle();

        if (!cancelled) setResolvedProduct((data as ProductMedia | null) || null);
      } catch (error) {
        console.warn("[SEO banner] Product media lookup failed:", error);
        if (!cancelled) setResolvedProduct(null);
      }
    };

    void resolveProduct();
    return () => {
      cancelled = true;
    };
  }, [active, lookupTitle, productId, productTitle, selectedStore?.id]);

  const resolvedProductId = productId || resolvedProduct?.id || null;

  useEffect(() => {
    let cancelled = false;

    const loadGallery = async () => {
      if (!active || !resolvedProductId) {
        setGalleryUrls([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("product_images")
          .select("src, position")
          .eq("product_id", resolvedProductId)
          .order("position", { ascending: true })
          .limit(8);

        if (error) throw error;
        if (!cancelled) setGalleryUrls(uniqueUrls((data || []).map((image: any) => image.src)));
      } catch (error) {
        console.warn("[SEO banner] Product gallery lookup failed:", error);
        if (!cancelled) setGalleryUrls([]);
      }
    };

    void loadGallery();
    return () => {
      cancelled = true;
    };
  }, [active, resolvedProductId]);

  const mediaUrls = useMemo(
    () => uniqueUrls([...imageUrls, resolvedProduct?.image_url, ...galleryUrls]).slice(0, 8),
    [galleryUrls, imageUrls, resolvedProduct?.image_url],
  );

  if (!active) return null;

  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;
  const hasCounter = Boolean(total && total > 0 && current && current > 0);
  const statusTitle = title || (fr ? "Optimisation SEO en cours" : "SEO optimization in progress");
  const statusMessage =
    message ||
    (productTitle
      ? fr
        ? `Analyse et optimisation de ${productTitle}`
        : `Analyzing and optimizing ${productTitle}`
      : fr
        ? "Analyse du catalogue et génération du contenu optimisé…"
        : "Analyzing catalog data and generating optimized content…");

  const renderMediaCard = (url: string, index: number, duplicate = false) => (
    <div
      key={`${duplicate ? "copy" : "original"}-${index}-${url}`}
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm sm:h-[72px] sm:w-[72px]"
    >
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="eager"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
    </div>
  );

  return (
    <motion.section
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm sm:p-5 ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl"
        animate={reduceMotion ? undefined : { scale: [1, 1.14, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
            {!reduceMotion && <span className="absolute inset-0 animate-ping rounded-xl bg-violet-400/30" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{statusTitle}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                <Loader2 className={`h-3 w-3 ${reduceMotion ? "" : "animate-spin"}`} />
                {fr ? "En cours" : "Running"}
              </span>
              {hasCounter && (
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                  {current}/{total}
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{statusMessage}</p>
          </div>
          {safeProgress !== null && (
            <span className="shrink-0 text-sm font-bold tabular-nums text-violet-700">{Math.round(safeProgress)}%</span>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 p-2.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/75 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/75 to-transparent" />

          {mediaUrls.length > 0 ? (
            <div className="overflow-hidden">
              <motion.div
                className="flex w-max gap-2.5"
                animate={
                  reduceMotion || mediaUrls.length < 2
                    ? undefined
                    : { x: [0, -(mediaUrls.length * 82)] }
                }
                transition={
                  reduceMotion || mediaUrls.length < 2
                    ? undefined
                    : { duration: Math.max(10, mediaUrls.length * 2.2), repeat: Infinity, ease: "linear" }
                }
              >
                {mediaUrls.map((url, index) => renderMediaCard(url, index))}
                {!reduceMotion && mediaUrls.length > 1 && mediaUrls.map((url, index) => renderMediaCard(url, index, true))}
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={index}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 sm:h-[72px] sm:w-[72px]"
                  animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.12 }}
                >
                  <ImageIcon className="h-4 w-4 text-slate-300" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {safeProgress !== null ? (
          <Progress value={safeProgress} className="h-2 bg-violet-100" />
        ) : (
          <div className="h-2 overflow-hidden rounded-full bg-violet-100">
            <motion.div
              className="h-full w-1/3 rounded-full bg-violet-600"
              animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          {fr
            ? "Vous pouvez laisser cette fenêtre ouverte pendant l’analyse. Les visuels affichés proviennent du produit et de sa galerie."
            : "You can keep this window open during analysis. Displayed visuals come from the product and its gallery."}
        </p>
      </div>
    </motion.section>
  );
}

export default SeoExecutionBanner;
