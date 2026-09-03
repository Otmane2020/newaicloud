import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Monitor,
  Send,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeoExecutionBanner } from "@/components/seo/SeoExecutionBanner";
import type { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

type LandingProductSource = {
  title: string;
  description: string;
  seoTitle?: string;
  imageUrl?: string;
  vendor?: string;
  handle?: string;
};

const clean = (value?: string | null) => value?.trim() || "";

const generateFallbackLandingPage = (
  title: string,
  description: string | undefined,
  imageUrl: string | undefined,
): string => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #222; background: #f8fafc; padding: 24px; }
    .container { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(15,23,42,.08); }
    .hero { padding: 48px 32px; text-align: center; }
    h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.05; margin-bottom: 18px; }
    .description { max-width: 720px; margin: 0 auto; color: #64748b; font-size: 1.05rem; }
    .image { width: 100%; max-height: 620px; object-fit: contain; background: #fff; }
  </style>
</head>
<body>
  <main class="container">
    <section class="hero">
      <h1>${title}</h1>
      ${description ? `<div class="description">${description}</div>` : ""}
    </section>
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="image" />` : ""}
  </main>
</body>
</html>`;

interface RegenerateLandingProps {
  product: {
    id: string;
    title: string;
    seo_title?: string;
    handle?: string;
    description?: string;
    image_url?: string;
  };
  config: LandingConfig;
  autoGenerate?: boolean;
  onGenerated?: (html: string) => void;
  onClose?: () => void;
}

export default function RegenerateLanding({
  product,
  config,
  autoGenerate = false,
  onGenerated,
  onClose,
}: RegenerateLandingProps) {
  const { language } = useTranslation();
  const fr = language === "fr";
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [syncedProductUrl, setSyncedProductUrl] = useState<string | null>(null);
  const [optimizedTitle, setOptimizedTitle] = useState<string | null>(null);
  const [titleNeedsSync, setTitleNeedsSync] = useState(false);
  const [currentSource, setCurrentSource] = useState<LandingProductSource | null>(null);

  const hasGeneratedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  const getLatestProductSource = async (): Promise<LandingProductSource> => {
    const { data, error: sourceError } = await supabase
      .from("shopify_products")
      .select(
        "title, description, body_html, seo_title, optimized_title, regenerated_title, optimized_description, image_url, vendor, handle",
      )
      .eq("id", product.id)
      .single();

    if (sourceError) {
      console.warn("[Landing] Could not refresh product source, using provided product:", sourceError);
    }

    const row = data as any;
    const title =
      clean(row?.optimized_title) ||
      clean(row?.regenerated_title) ||
      clean(row?.seo_title) ||
      clean(row?.title) ||
      clean(product.seo_title) ||
      product.title;

    const description =
      clean(row?.optimized_description) ||
      clean(row?.body_html) ||
      clean(row?.description) ||
      clean(product.description);

    return {
      title,
      description,
      seoTitle: clean(row?.seo_title) || clean(product.seo_title) || undefined,
      imageUrl: clean(row?.image_url) || clean(product.image_url) || undefined,
      vendor: clean(row?.vendor) || undefined,
      handle: clean(row?.handle) || clean(product.handle) || undefined,
    };
  };

  const persistLanding = async (html: string) => {
    const generatedAt = new Date().toISOString();
    const { error: persistError } = await supabase
      .from("shopify_products")
      .update({
        landing_page: html,
        landing_page_html: html,
        has_landing_page: true,
        last_landing_generation_at: generatedAt,
        updated_at: generatedAt,
      } as any)
      .eq("id", product.id);

    if (persistError) {
      console.warn("[Landing] Generated HTML could not be fully persisted:", persistError);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadingExisting(true);
      setHtmlContent("");
      setError(null);
      setSyncedProductUrl(null);
      hasGeneratedRef.current = false;
      isGeneratingRef.current = false;

      try {
        const [{ data, error: landingError }, source] = await Promise.all([
          supabase
            .from("shopify_products")
            .select("landing_page, landing_page_html")
            .eq("id", product.id)
            .single(),
          getLatestProductSource(),
        ]);

        if (landingError) throw landingError;
        if (!active) return;

        setCurrentSource(source);
        const existing = clean((data as any)?.landing_page_html) || clean((data as any)?.landing_page);
        setHtmlContent(existing);
      } catch (loadError) {
        console.error("[Landing] Existing landing load failed:", loadError);
        if (active) {
          setCurrentSource({
            title: product.seo_title || product.title,
            description: product.description || "",
            seoTitle: product.seo_title,
            imageUrl: product.image_url,
            handle: product.handle,
          });
        }
      } finally {
        if (active) setLoadingExisting(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const resolveVendor = async (source: LandingProductSource): Promise<string> => {
    if (config.vendorSource === "shopify") {
      return source.vendor || (fr ? "Marque inconnue" : "Unknown brand");
    }

    if (config.vendorSource === "extract") {
      const words = source.title.split(/\s+/).filter(Boolean);
      return (
        words.find(
          (word) =>
            word.length > 2 &&
            word[0] === word[0].toUpperCase() &&
            word.slice(1) === word.slice(1).toLowerCase(),
        ) ||
        words.find((word) => word.length > 3) ||
        (fr ? "Marque" : "Brand")
      );
    }

    if (config.vendorSource === "generate") {
      try {
        const { data } = await supabase.functions.invoke("generate-vendor-name", {
          body: {
            productTitle: source.title,
            productDescription: source.description,
          },
        });
        if (data?.vendor) return data.vendor;
      } catch (vendorError) {
        console.warn("[Landing] Vendor generation failed:", vendorError);
      }
    }

    return source.vendor || (fr ? "Marque inconnue" : "Unknown brand");
  };

  const analyzeImageWithAI = async (imageUrl: string, title: string): Promise<string> => {
    try {
      setProgress(35);
      setProgressMessage(fr ? "Analyse du produit et de ses visuels…" : "Analyzing product and visuals…");
      const { data, error: visionError } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: { imageUrl, productContext: title },
      });
      if (visionError) throw visionError;
      return data?.attributes ? JSON.stringify(data.attributes) : "";
    } catch (visionError) {
      console.warn("[Landing] Vision analysis skipped:", visionError);
      return "";
    }
  };

  const handleGenerate = async (forceFastMode = false) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const timeoutId = window.setTimeout(() => {
      setError(fr ? "La génération prend trop de temps." : "Generation is taking too long.");
      setLoading(false);
    }, 90000);

    let source: LandingProductSource =
      currentSource || {
        title: product.seo_title || product.title,
        description: product.description || "",
        seoTitle: product.seo_title,
        imageUrl: product.image_url,
        handle: product.handle,
      };

    try {
      setLoading(true);
      setError(null);
      setProgress(5);
      setProgressMessage(fr ? "Actualisation du contenu produit…" : "Refreshing product content…");

      // Always refresh here so /product and Titles & Descriptions use the exact same latest data.
      source = await getLatestProductSource();
      setCurrentSource(source);

      setProgress(15);
      setProgressMessage(fr ? "Préparation de la Landing Page…" : "Preparing landing page…");
      const resolvedVendor = await resolveVendor(source);

      if (config.vendorSource === "generate" && resolvedVendor) {
        await supabase.from("shopify_products").update({ vendor: resolvedVendor } as any).eq("id", product.id);
      }

      let generationTitle = source.title;

      if (config.regenerateTitle !== false) {
        try {
          setProgress(25);
          setProgressMessage(fr ? "Optimisation du titre…" : "Optimizing title…");
          const { data: smartTitleData, error: smartTitleError } = await supabase.functions.invoke("smart-title", {
            body: { productId: product.id, language },
          });

          if (smartTitleError) throw smartTitleError;
          if (smartTitleData?.success && clean(smartTitleData?.optimizedTitle)) {
            generationTitle = clean(smartTitleData.optimizedTitle);
            setOptimizedTitle(generationTitle);
            setTitleNeedsSync(true);
          }
        } catch (smartTitleError) {
          console.warn("[Landing] Smart title optimization skipped:", smartTitleError);
        }
      }

      const imageAnalysis = source.imageUrl
        ? await analyzeImageWithAI(source.imageUrl, generationTitle)
        : "";

      setProgress(55);
      setProgressMessage(fr ? "Génération du contenu et du design…" : "Generating content and design…");

      const { data, error: generationError } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productId: product.id,
          productTitle: generationTitle,
          seo_title: source.seoTitle,
          imageUrl: source.imageUrl,
          description: source.description,
          vendor: resolvedVendor,
          imageAnalysis,
          language,
          fastMode: forceFastMode || config.contentLength === "short",
          options: {
            colorScheme: config.colorScheme,
            layout: config.layout,
            designStyle: config.designStyle || "modern",
            contentLength: config.contentLength,
            customHighlights: config.customHighlights,
            theme: config.theme || "light",
          },
        },
      });

      if (generationError) throw generationError;
      if (!data?.html?.trim()) throw new Error(fr ? "Aucun HTML généré." : "No HTML generated.");

      const html = data.html.trim();
      setProgress(90);
      setProgressMessage(fr ? "Enregistrement de la Landing Page…" : "Saving landing page…");
      await persistLanding(html);

      setHtmlContent(html);
      setProgress(100);
      setProgressMessage(fr ? "Landing Page prête" : "Landing page ready");
      setError(null);
      onGenerated?.(html);
      toast.success(fr ? "Landing Page régénérée avec le dernier contenu produit" : "Landing page regenerated from the latest product content");
    } catch (generationError: any) {
      console.error("[Landing] Generation failed:", generationError);
      const message = generationError?.message || (fr ? "La génération a échoué." : "Generation failed.");
      setError(message);

      const fallbackHtml = generateFallbackLandingPage(source.title, source.description, source.imageUrl);
      setHtmlContent(fallbackHtml);
      setProgress(100);
      await persistLanding(fallbackHtml);
      onGenerated?.(fallbackHtml);

      toast.error(fr ? "Génération partielle" : "Partial generation", {
        description: fr
          ? "Le moteur complet a échoué. Une version de secours basée sur le dernier contenu produit a été créée."
          : "The full engine failed. A fallback based on the latest product content was created.",
      });
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  // A generator dialog must regenerate even when a previous landing already exists.
  useEffect(() => {
    if (
      autoGenerate &&
      !loadingExisting &&
      !loading &&
      !hasGeneratedRef.current &&
      !isGeneratingRef.current
    ) {
      hasGeneratedRef.current = true;
      void handleGenerate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, loadingExisting, product.id]);

  const handleDownloadHTML = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(currentSource?.title || product.title).replace(/[^a-z0-9]/gi, "_").toLowerCase()}_landing.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleSyncToShopify = async () => {
    if (!htmlContent) return;

    try {
      setSyncing(true);
      const source = await getLatestProductSource();
      const { data, error: syncError } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          productTitle: source.title,
          productHandle: source.handle,
          htmlContent,
        },
      });

      if (syncError) throw syncError;
      if (data?.error) throw new Error(data.error);

      setTitleNeedsSync(false);
      if (data?.productUrl) setSyncedProductUrl(data.productUrl);
      toast.success(fr ? "Landing Page synchronisée avec Shopify" : "Landing page synced to Shopify");
    } catch (syncError: any) {
      toast.error(syncError?.message || (fr ? "Synchronisation impossible" : "Could not sync"));
    } finally {
      setSyncing(false);
    }
  };

  if (loadingExisting && !loading) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-slate-200 bg-slate-50/40">
        <div className="text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          {fr ? "Chargement du produit…" : "Loading product…"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <p className="font-medium text-slate-900">{fr ? "Flux Landing Page unifié" : "Unified landing page flow"}</p>
            <Badge variant="outline" className="rounded-full bg-white text-[11px]">
              {fr ? "Contenu produit à jour" : "Latest product content"}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {currentSource?.title || product.title}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl"
          onClick={() => void handleGenerate(false)}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
          {fr ? "Régénérer" : "Regenerate"}
        </Button>
      </div>

      {optimizedTitle && titleNeedsSync && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-sm font-medium text-violet-900">{fr ? "Titre optimisé utilisé pour cette Landing" : "Optimized title used for this landing"}</p>
          <p className="mt-1 text-xs text-violet-700">{optimizedTitle}</p>
        </div>
      )}

      <SeoExecutionBanner
        active={loading}
        title={fr ? "Génération SEO de la Landing Page" : "SEO landing page generation"}
        message={progressMessage}
        progress={progress}
        productId={product.id}
        productTitle={currentSource?.title || product.title}
        imageUrls={[currentSource?.imageUrl, product.image_url]}
      />

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">{fr ? "Le moteur complet a rencontré une erreur" : "The full engine encountered an error"}</p>
            <p className="mt-1 text-xs text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {htmlContent && !loading && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{fr ? "Landing Page disponible" : "Landing page available"}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as "desktop" | "mobile")}>
                <TabsList className="h-9">
                  <TabsTrigger value="desktop" className="px-2.5"><Monitor className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="mobile" className="px-2.5"><Smartphone className="h-4 w-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={handleDownloadHTML}>
                <Download className="mr-1.5 h-4 w-4" />HTML
              </Button>
              {!syncedProductUrl ? (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void handleSyncToShopify()} disabled={syncing}>
                  {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                  Shopify
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => window.open(syncedProductUrl, "_blank")}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />{fr ? "Voir" : "View"}
                </Button>
              )}
              {onClose && (
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={onClose}>
                  {fr ? "Fermer" : "Close"}
                </Button>
              )}
            </div>
          </div>

          <div
            className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
              previewMode === "mobile" ? "mx-auto h-[650px] max-w-[390px]" : "h-[650px] w-full"
            }`}
          >
            <iframe
              title="Landing Page Preview"
              srcDoc={htmlContent}
              sandbox="allow-same-origin allow-scripts"
              className="h-full w-full border-0 bg-white"
            />
          </div>
        </div>
      )}

      {!htmlContent && !loading && !error && (
        <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-violet-200 bg-violet-50/20 p-6 text-center">
          <div>
            <Eye className="mx-auto mb-2 h-6 w-6 text-violet-500" />
            <p className="text-sm font-medium text-slate-700">{fr ? "Aucune Landing Page" : "No landing page yet"}</p>
            <Button className="mt-4 rounded-xl" onClick={() => void handleGenerate(false)}>
              <Sparkles className="mr-1.5 h-4 w-4" />{fr ? "Générer" : "Generate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
