import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Layout,
  Loader2,
  Monitor,
  Scan,
  Send,
  Smartphone,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

export type LandingGenerationStatus = {
  progress: number;
  message: string;
  loading: boolean;
  ready: boolean;
  hasError: boolean;
};

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
  regenerateExisting?: boolean;
  onGenerated?: (html: string) => void;
  onClose?: () => void;
  onStatusChange?: (status: LandingGenerationStatus) => void;
}

const normalizeContentLength = (value: string): "short" | "medium" | "long" => {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("short") || normalized.includes("courte") || normalized.includes("400")) return "short";
  if (normalized.includes("long") || normalized.includes("longue") || normalized.includes("1500")) return "long";
  return "medium";
};

const fallbackLanding = (
  title: string,
  description: string | undefined,
  imageUrl: string | undefined,
  lang: "fr" | "en",
) => {
  const fr = lang === "fr";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,sans-serif}.card{max-width:980px;margin:auto;overflow:hidden;border:1px solid #e2e8f0;border-radius:24px;background:#fff}.hero{padding:48px 28px;text-align:center;background:#111827;color:#fff}h1{margin:0 0 16px;font-size:clamp(30px,5vw,52px);line-height:1.05}.copy{max-width:720px;margin:auto;color:#e2e8f0}.product{display:block;width:100%;max-height:560px;object-fit:contain;padding:28px}.note{padding:18px;text-align:center;color:#64748b}</style></head><body><main class="card"><section class="hero"><h1>${title}</h1>${description ? `<p class="copy">${description.slice(0, 260)}</p>` : ""}</section>${imageUrl ? `<img class="product" src="${imageUrl}" alt="${title}">` : ""}<p class="note">⚡ ${fr ? "Landing page générée en mode simplifié" : "Landing page generated in simplified mode"}</p></main></body></html>`;
};

export default function RegenerateLanding({
  product,
  config,
  autoGenerate = false,
  regenerateExisting = false,
  onGenerated,
  onClose,
  onStatusChange,
}: RegenerateLandingProps) {
  const { language } = useTranslation();
  const fr = language === "fr";
  const contentLength = normalizeContentLength(config.contentLength);

  const copy = useMemo(() => fr ? {
    preparing: "Préparation de la génération…",
    vendor: "Récupération de la marque…",
    title: "Optimisation du titre SEO…",
    vision: "Analyse du visuel avec Vision IA…",
    content: "Génération du contenu de la landing page…",
    finalizing: "Finalisation du design et du HTML…",
    generated: "Landing page générée",
    failed: "La génération de la landing page a échoué",
    partial: "Génération partielle",
    partialDesc: "La génération complète a échoué. Un modèle simplifié a été créé.",
    retryFast: "Réessayer en mode rapide",
    timeout: "Génération trop longue",
    timeoutDesc: "La génération a dépassé le délai maximal. Vous pouvez réessayer.",
    unknownBrand: "Marque inconnue",
    brand: "Marque",
    generatedBrand: "Marque générée",
    optimizedTitle: "Titre optimisé SEO",
    titleSync: "Synchronisez avec Shopify pour appliquer le nouveau titre.",
    generationTitle: "Génération IA de la landing page",
    visionAi: "Vision IA",
    progress: [
      "Initialisation des modèles IA…",
      "Analyse de l’image produit avec Vision IA",
      "Extraction des attributs visuels et du style",
      "Analyse du contexte produit",
      "Rédaction du contenu de conversion",
      "Création des sections principales",
      "Construction de la structure responsive",
      "Application du design",
      "Optimisation mobile",
      "Optimisation finale",
      "Landing page prête !",
    ],
    stages: ["Initialisation IA", "Analyse visuelle", "Analyse du contexte", "Génération du contenu", "Optimisation du layout", "Assemblage final", "Terminé"],
    badges: ["Vision IA", "UX optimisée", "Mobile First", "Optimisée conversion"],
    preview: "Prévisualisation",
    desktop: "Ordinateur",
    mobile: "Mobile",
    download: "Télécharger HTML",
    downloaded: "Fichier HTML téléchargé",
    sync: "Synchroniser avec Shopify",
    syncing: "Synchronisation…",
    synced: "Landing page synchronisée avec Shopify",
    syncError: "Impossible de synchroniser avec Shopify",
    importRequired: "Ce produit doit d’abord être importé depuis Shopify",
    importRequiredDesc: "Reconnectez ou importez le produit depuis les intégrations.",
    viewLive: "Visualiser en ligne",
    close: "Fermer",
    retry: "Réessayer",
    existing: "HTML existant chargé",
    readyDesc: "Responsive, mobile-first et prête à être vérifiée avant synchronisation.",
  } : {
    preparing: "Preparing generation…",
    vendor: "Resolving brand information…",
    title: "Optimizing SEO title…",
    vision: "Analyzing product visual with Vision AI…",
    content: "Generating landing page content…",
    finalizing: "Finalizing design and HTML…",
    generated: "Landing page generated",
    failed: "Landing page generation failed",
    partial: "Partial generation",
    partialDesc: "Full generation failed. A simplified fallback template was created.",
    retryFast: "Retry in fast mode",
    timeout: "Generation took too long",
    timeoutDesc: "Generation exceeded the maximum duration. You can retry.",
    unknownBrand: "Unknown brand",
    brand: "Brand",
    generatedBrand: "Generated brand",
    optimizedTitle: "SEO-optimized title",
    titleSync: "Sync with Shopify to apply the new title.",
    generationTitle: "AI-Powered Landing Generation",
    visionAi: "Vision AI",
    progress: [
      "Initializing AI models…",
      "Analyzing product image with Vision AI",
      "Extracting visual attributes and styling",
      "Analyzing product context",
      "Generating conversion-focused copy",
      "Crafting hero sections",
      "Building responsive structure",
      "Applying design patterns",
      "Optimizing for mobile",
      "Final optimization",
      "Landing page ready!",
    ],
    stages: ["AI Initialization", "Vision Analysis", "Context Processing", "Content Generation", "Layout Optimization", "Final Assembly", "Complete"],
    badges: ["Vision AI", "UX Optimized", "Mobile First", "Conversion Focused"],
    preview: "Preview",
    desktop: "Desktop",
    mobile: "Mobile",
    download: "Download HTML",
    downloaded: "HTML file downloaded",
    sync: "Sync with Shopify",
    syncing: "Syncing…",
    synced: "Landing page synced with Shopify",
    syncError: "Unable to sync with Shopify",
    importRequired: "This product must first be imported from Shopify",
    importRequiredDesc: "Reconnect or import the product from Integrations.",
    viewLive: "View live",
    close: "Close",
    retry: "Retry",
    existing: "Existing HTML loaded",
    readyDesc: "Responsive, mobile-first and ready to review before syncing.",
  }, [fr]);

  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState(copy.preparing);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [error, setError] = useState<string | null>(null);
  const [optimizedTitle, setOptimizedTitle] = useState<string | null>(null);
  const [titleNeedsSync, setTitleNeedsSync] = useState(false);
  const [syncedProductUrl, setSyncedProductUrl] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoadingExisting(true);
    setHtmlContent("");
    setProgress(0);
    setError(null);
    setOptimizedTitle(null);
    setTitleNeedsSync(false);
    hasGeneratedRef.current = false;
    isGeneratingRef.current = false;

    const load = async () => {
      try {
        const { data, error: loadError } = await supabase
          .from("shopify_products")
          .select("landing_page")
          .eq("id", product.id)
          .single();
        if (loadError) throw loadError;
        if (mounted && data?.landing_page) setHtmlContent(data.landing_page);
      } catch (loadError) {
        console.error("[Landing] Existing landing load failed", loadError);
      } finally {
        if (mounted) setLoadingExisting(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [product.id]);

  const resolveVendor = async () => {
    if (config.vendorSource === "shopify") {
      const { data } = await supabase.from("shopify_products").select("vendor").eq("id", product.id).single();
      return data?.vendor || copy.unknownBrand;
    }
    if (config.vendorSource === "extract") {
      const words = product.title.split(/\s+/).filter(Boolean);
      return words.find((word) => word.length > 2 && /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(word)) || words.find((word) => word.length > 3) || copy.brand;
    }
    try {
      const { data } = await supabase.functions.invoke("generate-vendor-name", {
        body: { productTitle: product.title, productDescription: product.description },
      });
      if (data?.vendor) return data.vendor;
    } catch (vendorError) {
      console.error("[Landing] Vendor generation failed", vendorError);
    }
    return copy.generatedBrand;
  };

  const analyzeImage = async () => {
    if (!product.image_url) return "";
    setProgress(35);
    setProgressMessage(copy.vision);
    try {
      const { data, error: visionError } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: { imageUrl: product.image_url, productContext: product.title },
      });
      if (visionError) throw visionError;
      return data?.attributes ? JSON.stringify(data.attributes) : "";
    } catch (visionError) {
      console.error("[Landing] Vision analysis failed", visionError);
      return "";
    }
  };

  const generate = async (forceFastMode = false) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    hasGeneratedRef.current = true;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError(copy.timeoutDesc);
      toast.error(copy.timeout, { description: copy.timeoutDesc });
    }, 90000);

    try {
      setLoading(true);
      setError(null);
      setProgress(5);
      setProgressMessage(copy.preparing);
      await new Promise((resolve) => window.setTimeout(resolve, 120));

      setProgress(10);
      setProgressMessage(copy.vendor);
      const vendor = await resolveVendor();
      if (config.vendorSource === "generate" && vendor !== copy.generatedBrand) {
        await supabase.from("shopify_products").update({ vendor }).eq("id", product.id);
      }

      setProgress(20);
      setProgressMessage(copy.title);
      let generatedTitle: string | null = null;
      if (config.regenerateTitle !== false) {
        try {
          const { data, error: titleError } = await supabase.functions.invoke("smart-title", {
            body: { productId: product.id, language },
          });
          if (titleError) throw titleError;
          if (data?.success && data?.optimizedTitle) {
            generatedTitle = data.optimizedTitle;
            setOptimizedTitle(data.optimizedTitle);
            setTitleNeedsSync(true);
          }
        } catch (titleError) {
          console.warn("[Landing] Smart title failed", titleError);
        }
      }

      const imageAnalysis = await analyzeImage();
      setProgress(50);
      setProgressMessage(copy.content);
      const { data, error: generationError } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productId: product.id,
          productTitle: generatedTitle || product.title,
          seo_title: product.seo_title,
          imageUrl: product.image_url,
          description: product.description,
          vendor,
          imageAnalysis,
          language,
          fastMode: forceFastMode || contentLength === "short",
          options: {
            colorScheme: config.colorScheme,
            layout: config.layout,
            designStyle: config.designStyle || "modern",
            contentLength,
            customHighlights: config.customHighlights,
            theme: config.theme || "light",
          },
        },
      });
      if (generationError) throw generationError;
      if (!data?.html?.trim()) throw new Error(copy.failed);
      if (timedOut) return;

      setProgress(85);
      setProgressMessage(copy.finalizing);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      setHtmlContent(data.html);
      setProgress(100);
      setProgressMessage(copy.generated);
      toast.success(copy.generated);
      onGenerated?.(data.html);
    } catch (generationError: any) {
      console.error("[Landing] Generation failed", generationError);
      const message = generationError?.message || copy.failed;
      setError(message);
      const fallback = fallbackLanding(product.title, product.description, product.image_url, fr ? "fr" : "en");
      setHtmlContent(fallback);
      setProgress(100);
      setProgressMessage(copy.partial);
      toast.error(copy.partial, {
        description: copy.partialDesc,
        action: { label: copy.retryFast, onClick: () => void generate(true) },
        duration: 10000,
      });
      onGenerated?.(fallback);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    if (!autoGenerate || loadingExisting || hasGeneratedRef.current || isGeneratingRef.current) return;
    if (htmlContent && !regenerateExisting) return;
    void generate(false);
  }, [autoGenerate, loadingExisting, htmlContent, regenerateExisting]);

  useEffect(() => {
    onStatusChange?.({
      progress,
      message: progressMessage,
      loading,
      ready: Boolean(htmlContent) && !loading && (hasGeneratedRef.current || !regenerateExisting),
      hasError: Boolean(error),
    });
  }, [progress, progressMessage, loading, htmlContent, error, regenerateExisting, onStatusChange]);

  const download = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${product.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_landing.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(copy.downloaded);
  };

  const sync = async () => {
    if (!htmlContent) return;
    try {
      setSyncing(true);
      const { data, error: syncError } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: { productId: product.id, productTitle: product.title, productHandle: product.handle, htmlContent },
      });
      if (syncError) throw syncError;
      if (data?.error) {
        if (data?.needsImport || String(data.error).includes("non synchronisé") || String(data.error).includes("not synchronized")) {
          toast.error(copy.importRequired, { description: copy.importRequiredDesc });
        } else toast.error(String(data.error));
        return;
      }
      setTitleNeedsSync(false);
      if (data?.productUrl) setSyncedProductUrl(data.productUrl);
      toast.success(copy.synced);
    } catch (syncError: any) {
      toast.error(syncError?.message || copy.syncError);
    } finally {
      setSyncing(false);
    }
  };

  const progressStep = progress >= 100 ? copy.progress[10] : copy.progress[Math.min(9, Math.max(0, Math.floor(progress / 10)))];
  const stage = progress < 15 ? copy.stages[0] : progress < 30 ? copy.stages[1] : progress < 45 ? copy.stages[2] : progress < 65 ? copy.stages[3] : progress < 85 ? copy.stages[4] : progress < 100 ? copy.stages[5] : copy.stages[6];
  const StageIcon = progress < 15 ? Loader2 : progress < 30 ? Scan : progress < 45 ? Brain : progress < 65 ? Wand2 : progress < 85 ? Layout : Sparkles;

  return (
    <div className="space-y-5">
      {optimizedTitle && titleNeedsSync && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div><p className="text-sm font-semibold text-violet-950">{copy.optimizedTitle}</p><p className="mt-1 text-sm text-violet-900">{optimizedTitle}</p><p className="mt-1 text-xs font-medium text-violet-700">⚠️ {copy.titleSync}</p></div>
        </div>
      )}

      {loading && (
        <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white"><Sparkles className="h-5 w-5 animate-pulse" /></span>
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-slate-950 sm:text-lg">{copy.generationTitle}</h3><Badge variant="secondary" className="bg-violet-100 text-violet-700"><Zap className="mr-1 h-3 w-3" />{copy.visionAi}</Badge></div><p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />{progressStep}</p></div>
            </div>
            <strong className="text-2xl tabular-nums text-slate-950">{progress}%</strong>
          </div>
          <Progress value={progress} className="mt-5 h-2" />
          <div className="mt-3 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700"><StageIcon className={`h-4 w-4 ${progress < 15 ? "animate-spin" : ""}`} />{stage}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{copy.badges.map((label, index) => { const icons = [Scan, Brain, Smartphone, Target]; const Icon = icons[index]; const active = progress >= [20, 50, 70, 90][index]; return <span key={label} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${active ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-400"}`}><Icon className="h-3.5 w-3.5" />{label}</span>; })}</div>
        </section>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" /><div className="flex-1"><p className="text-sm font-semibold text-amber-900">{copy.partial}</p><p className="mt-1 text-xs text-amber-800">{error}</p></div><Button variant="outline" size="sm" onClick={() => void generate(false)}>{copy.retry}</Button></div>
      )}

      {htmlContent && !loading && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-800">{hasGeneratedRef.current ? copy.generated : copy.existing}</p><p className="mt-1 text-xs text-emerald-700/80">{copy.readyDesc}</p></div></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="flex items-center gap-2 text-base font-semibold text-slate-950"><Eye className="h-4 w-4 text-violet-600" />{copy.preview}</h3><Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as "desktop" | "mobile")}><TabsList><TabsTrigger value="desktop"><Monitor className="mr-1.5 h-4 w-4" />{copy.desktop}</TabsTrigger><TabsTrigger value="mobile"><Smartphone className="mr-1.5 h-4 w-4" />{copy.mobile}</TabsTrigger></TabsList></Tabs></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={download}><Download className="mr-2 h-4 w-4" />{copy.download}</Button>{!syncedProductUrl ? <Button size="sm" onClick={() => void sync()} disabled={syncing}>{syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{syncing ? copy.syncing : copy.sync}</Button> : <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => window.open(syncedProductUrl, "_blank")}><ExternalLink className="mr-2 h-4 w-4" />{copy.viewLive}</Button>}{onClose && <Button variant="ghost" size="sm" onClick={onClose}>{copy.close}</Button>}</div>
          <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${previewMode === "mobile" ? "mx-auto h-[650px] w-full max-w-[390px]" : "h-[680px] w-full"}`}><iframe srcDoc={htmlContent} className="h-full w-full border-0" sandbox="allow-same-origin allow-scripts" title={copy.preview} /></div>
        </div>
      )}

      {!loading && !htmlContent && !error && (
        <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center"><div><Loader2 className="mx-auto h-5 w-5 animate-spin text-violet-600" /><p className="mt-2 text-sm text-slate-500">{copy.preparing}</p></div></div>
      )}
    </div>
  );
}
