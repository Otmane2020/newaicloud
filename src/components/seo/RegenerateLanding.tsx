import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Eye,
  Monitor,
  Smartphone,
  Download,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Scan,
  Brain,
  Wand2,
  Layout,
  ExternalLink,
  Zap,
  Target,
  Palette,
  FileCode,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

interface RegenerateLandingProps {
  product: {
    id: string;
    title: string;
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
  const { t, language } = useTranslation();

  // UI States
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

  // Internal refs to avoid double-generation
  const hasGeneratedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  // Load existing landing HTML from DB
  useEffect(() => {
    let active = true;

    const loadExisting = async () => {
      try {
        const { data } = await supabase
          .from("shopify_products")
          .select("landing_page_html")
          .eq("id", product.id)
          .maybeSingle();

        if (active && data?.landing_page_html) {
          setHtmlContent(data.landing_page_html);
        }
      } catch (e) {
        console.error("Load existing landing error:", e);
      } finally {
        if (active) setLoadingExisting(false);
      }
    };

    loadExisting();
    return () => { active = false };
  }, [product.id]);

  // Reset on product change
  useEffect(() => {
    hasGeneratedRef.current = false;
    isGeneratingRef.current = false;
    setHtmlContent("");
    setError(null);
    setProgress(0);
    setProgressMessage("");
  }, [product.id]);

  // Auto-generate handler
  useEffect(() => {
    if (
      autoGenerate &&
      !loading &&
      !htmlContent &&
      !hasGeneratedRef.current &&
      !isGeneratingRef.current
    ) {
      hasGeneratedRef.current = true;
      isGeneratingRef.current = true;

      handleGenerate().finally(() => {
        isGeneratingRef.current = false;
      });
    }
  }, [autoGenerate, loading]);

  /** ------------------------------------------
   * Load ALL product images via product_images
   -------------------------------------------*/
  const loadProductImages = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("product_images")
      .select("src")
      .eq("product_id", product.id)
      .order("position");

    if (error) {
      console.error("Image load error:", error);
      return product.image_url ? [product.image_url] : [];
    }

    const urls = (data || []).map((img) => img.src);

    if (urls.length === 0 && product.image_url) {
      urls.push(product.image_url);
    }

    return urls;
  };

  /** ------------------------------------------
   * Resolve vendor
   -------------------------------------------*/
  const resolveVendor = async (): Promise<string> => {
    const { data } = await supabase
      .from("shopify_products")
      .select("vendor")
      .eq("id", product.id)
      .maybeSingle();

    return data?.vendor || "Unknown Vendor";
  };
  /** ------------------------------------------
   * Generate Landing Page (new backend format)
   -------------------------------------------*/
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress(5);
      setProgressMessage("Préparation...");

      // 🔹 Load images
      setProgress(10);
      setProgressMessage("Chargement des images...");
      const images = await loadProductImages();

      // 🔹 Load vendor
      setProgress(20);
      setProgressMessage("Analyse du produit...");
      const vendor = await resolveVendor();

      // 🔹 Get user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      // 🔹 Get store ID
      const { data: productData } = await supabase
        .from("shopify_products")
        .select("store_id")
        .eq("id", product.id)
        .maybeSingle();

      const storeId = productData?.store_id || null;

      // 🔹 Try to load user default preferences
      const { data: pref } = await supabase
        .from("landing_page_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .maybeSingle();

      const combinedOptions = pref
        ? {
            // USER DEFAULT OVERRIDES EVERYTHING
            layout: pref.layout,
            designStyle: pref.design_style,
            contentLength: pref.content_length,
            colorScheme: {
              primary: pref.color_primary,
              secondary: pref.color_secondary,
              accent: pref.color_accent,
              background: pref.color_background,
              surface: pref.color_surface,
              text: pref.color_text,
              textMuted: pref.color_text_muted,
            },
            customHighlights: pref.custom_highlights || [],
          }
        : {
            // FALLBACK: UI SESSION CONFIG
            layout: config.layout,
            designStyle: config.designStyle,
            contentLength: config.contentLength,
            colorScheme: {
              primary: config.colorScheme.primary,
              secondary: config.colorScheme.secondary,
              accent: config.colorScheme.accent,
              background: config.colorScheme.background,
              surface: config.colorScheme.surface,
              text: config.colorScheme.text,
              textMuted: config.colorScheme.textMuted,
            },
            customHighlights: config.customHighlights || [],
          };

      console.log("🧩 Final Options Sent to Backend:", combinedOptions);

      setProgress(35);
      setProgressMessage("Préparation du prompt IA...");

      // 🔥 CALL EDGE FUNCTION generate-landing-ai
      const { data, error } = await supabase.functions.invoke(
        "generate-landing-ai",
        {
          method: "POST",
          body: {
            productId: product.id,
            productTitle: product.title,
            description: product.description || "",
            vendor,
            images,
            language,
            userId,
            storeId,
            options: combinedOptions,
          },
        }
      );

      setProgress(55);
      setProgressMessage("Traitement IA...");

      if (error) {
        console.error("❌ Backend Error:", error);
        throw new Error(error.message || "Erreur inconnue backend");
      }

      if (!data || !data.html) {
        throw new Error("Aucun contenu généré");
      }

      // Save optimized title if returned
      if (data.optimizedTitle && data.optimizedTitle !== product.title) {
        setOptimizedTitle(data.optimizedTitle);
        setTitleNeedsSync(true);
      }

      setProgress(80);
      setProgressMessage("Finalisation...");

      setHtmlContent(data.html);
      onGenerated?.(data.html);

      setProgress(100);
      setProgressMessage("Terminé ✔️");
      toast.success("Landing page générée avec succès !");
    } catch (err: any) {
      console.error("❌ Generation failed:", err);
      setError(err.message || "Erreur lors de la génération");
      toast.error(err.message || "Erreur lors de la génération");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };
  /** ------------------------------------------
   * Download HTML file
   -------------------------------------------*/
  const handleDownloadHTML = () => {
    if (!htmlContent) {
      return toast.error("Aucun contenu à télécharger.");
    }

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const fileName = `${product.title.replace(/[^a-z0-9]/gi, "_")}_landing.html`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.toLowerCase();
    a.click();

    URL.revokeObjectURL(url);

    toast.success("Fichier HTML téléchargé.");
  };

  /** ------------------------------------------
   * Sync Landing Page to Shopify
   -------------------------------------------*/
  const handleSyncToShopify = async (retry = false) => {
    if (!htmlContent) {
      return toast.error("Aucun contenu à synchroniser.");
    }

    try {
      setSyncing(true);
      toast.info("Synchronisation en cours…");

      const { data, error } = await supabase.functions.invoke(
        "sync-landing-to-shopify",
        {
          body: {
            productId: product.id,
            productTitle: optimizedTitle || product.title,
            productHandle: product.handle,
            htmlContent,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Page synchronisée avec Shopify !");
      setTitleNeedsSync(false);

      if (data?.productUrl) {
        setSyncedProductUrl(data.productUrl);
      }
    } catch (err: any) {
      console.error("❌ Sync failed:", err);

      const isNetwork =
        err?.message?.includes("Network") ||
        err?.message?.includes("Edge Function") ||
        err?.message?.includes("relay");

      if (isNetwork && !retry) {
        toast.info("Problème réseau… nouvelle tentative dans 2 sec.");
        await new Promise((r) => setTimeout(r, 2000));
        return handleSyncToShopify(true);
      }

      toast.error(err.message || "Erreur lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };
      {/* ------------------------------------------
          Optimized Title Section
      ------------------------------------------- */}
      {optimizedTitle && (
        <div className="bg-gradient-to-br from-accent/5 to-accent/10 p-4 rounded-xl border border-accent/30">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-accent/20 blur-md rounded-full animate-pulse" />
              <Sparkles className="w-5 h-5 text-accent relative z-10" />
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-xs text-accent font-medium">
                Titre optimisé par l’IA
              </p>

              <p className="text-base font-semibold leading-snug">
                {optimizedTitle}
              </p>

              {titleNeedsSync && (
                <div className="flex items-center gap-2 text-xs text-accent/80 font-medium pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Ce titre doit être synchronisé avec Shopify
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------
          Error Section (same UI)
      ------------------------------------------- */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />

            <div className="flex-1 space-y-3">
              <div>
                <p className="font-semibold text-destructive">
                  Une erreur est survenue
                </p>

                <p className="text-sm text-destructive/90 mt-1">
                  {error}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  handleGenerate();
                }}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------
          Success Section
      ------------------------------------------- */}
      {htmlContent && !loading && !error && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold text-green-700 text-sm sm:text-base">
                  Landing page générée avec succès • Optimisée mobile
                </p>

                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Basée sur vos préférences et le design sélectionné
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------
              Preview Header (Desktop / Mobile)
          ------------------------------------------- */}
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Aperçu de la landing page
            </h3>

            <Tabs
              value={previewMode}
              onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="desktop" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Monitor className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Desktop</span>
                </TabsTrigger>

                <TabsTrigger value="mobile" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Mobile</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* ------------------------------------------
              Actions: Download + Sync Shopify
          ------------------------------------------- */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleDownloadHTML}
              variant="outline"
              size="sm"
              className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              Télécharger HTML
            </Button>

            {!syncedProductUrl ? (
              <Button
                onClick={() => handleSyncToShopify()}
                disabled={syncing}
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    Synchronisation…
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                    Sync avec Shopify
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => window.open(syncedProductUrl, "_blank")}
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                Voir sur Shopify
              </Button>
            )}
          </div>

          {/* ------------------------------------------
              Preview iframe (mobile/desktop)
          ------------------------------------------- */}
          {htmlContent ? (
            <div
              className={`border rounded-xl overflow-hidden bg-white shadow-inner transition-all duration-300 ${
                previewMode === "mobile"
                  ? "max-w-[375px] mx-auto h-[600px] sm:h-[650px]"
                  : "h-[500px] sm:h-[650px]"
              }`}
            >
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
                title="Landing Page Preview"
                onError={() => toast.error("Erreur de chargement de l'aperçu.")}
              />
            </div>
          ) : (
            <div className="border rounded-xl p-8 bg-muted/30 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aucun contenu à prévisualiser
              </p>
            </div>
          )}
        </div>
      )}
      {/* ------------------------------------------
          Initial Empty State
      ------------------------------------------- */}
      {!loading && !htmlContent && !error && (
        <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/10">
          <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary/70 animate-pulse" />
          <p className="text-sm">
            En attente de génération…
          </p>
        </div>
      )}
    </div>
  );
}
