import { useState, useEffect } from "react";
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
  Zap,
  Target,
  Palette,
  FileCode,
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
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingLanding, setExistingLanding] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Charger la landing page existante
  useEffect(() => {
    const loadExistingLanding = async () => {
      try {
        const { data, error } = await supabase
          .from("product_landing_pages")
          .select("*")
          .eq("product_id", product.id)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setExistingLanding(data);
          setHtmlContent(data.html_content);
        }
      } catch (error) {
        console.error("Erreur chargement landing:", error);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingLanding();

    if (autoGenerate && !loading) {
      handleGenerate();
    }
  }, [product.id, autoGenerate]);

  useEffect(() => {
    if (autoGenerate) {
      handleGenerate();
    }
  }, [autoGenerate]);

  /** ----------------------------
   * 🏷️ Resolve Vendor based on config
   -----------------------------*/
  const resolveVendor = async (): Promise<string> => {
    switch (config.vendorSource) {
      case "shopify":
        const { data: productData } = await supabase
          .from("shopify_products")
          .select("vendor")
          .eq("id", product.id)
          .single();
        return productData?.vendor || "Marque inconnue";

      case "extract":
        const words = product.title.split(" ");
        const capitalizedWord = words.find(
          (word) =>
            word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase(),
        );

        if (capitalizedWord) {
          return capitalizedWord;
        }

        const fallback = words.find((w) => w.length > 3) || "Marque";
        return fallback;

      case "generate":
        try {
          const { data: aiData } = await supabase.functions.invoke("generate-vendor-name", {
            body: {
              productTitle: product.title,
              productDescription: product.description,
            },
          });

          if (aiData?.vendor) {
            return aiData.vendor;
          }
        } catch (err) {
          console.error("[Vendor] AI generation failed:", err);
        }

        return "Marque générée";

      default:
        return "Marque inconnue";
    }
  };

  /** ----------------------------
   * 🖼️ Analyze Image with AI Vision
   -----------------------------*/
  const analyzeImageWithAI = async (imageUrl: string): Promise<string> => {
    if (!imageUrl) {
      console.log("[Vision] No image URL provided");
      return "";
    }

    try {
      setProgressMessage(t.landingGeneration.analyzing);
      setProgress(25);

      const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: {
          imageUrl: imageUrl,
          productContext: `${product.title} ${config.vendorSource === "shopify" ? "" : ""}`,
        },
      });

      if (error) {
        console.error("[Vision] Image analysis failed:", error);
        return "";
      }

      console.log("[Vision] Image analysis completed");
      return data?.attributes ? JSON.stringify(data.attributes) : "";
    } catch (err) {
      console.error("[Vision] Image analysis error:", err);
      return "";
    }
  };

  /** ----------------------------
   * 📏 Calculate Content Length Parameters
   -----------------------------*/
  const getContentLengthParams = () => {
    switch (config.contentLength) {
      case "short":
        return {
          maxTokens: 800,
          wordCount: "150-200 mots",
          sections: 2,
          description: "Contenu concis et impactant",
        };
      case "medium":
        return {
          maxTokens: 1200,
          wordCount: "300-400 mots",
          sections: 3,
          description: "Contenu équilibré avec détails modérés",
        };
      case "long":
        return {
          maxTokens: 2000,
          wordCount: "500-700 mots",
          sections: 4,
          description: "Contenu détaillé et complet",
        };
      default:
        return {
          maxTokens: 1200,
          wordCount: "300-400 mots",
          sections: 3,
          description: "Contenu équilibré",
        };
    }
  };

  /** ----------------------------
   * ✨ Generate Landing via AI with Progress
   -----------------------------*/
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage(t.landingGeneration.preparing);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(10);

      // ✅ ÉTAPE 1 : Résoudre le vendor
      setProgressMessage(t.landingGeneration.resolving);
      const resolvedVendor = await resolveVendor();
      console.log("[Landing] Resolved vendor:", resolvedVendor);

      setProgress(20);

      // ✅ ÉTAPE 2 : Analyser l'image avec vision IA
      let imageAnalysis = "";
      if (product.image_url) {
        imageAnalysis = await analyzeImageWithAI(product.image_url);
      } else {
        setProgress(25); // Skip to same progress if no image
      }

      setProgress(30);
      setProgressMessage(t.landingGeneration.generating);

      // ✅ ÉTAPE 3 : Obtenir les paramètres de longueur
      const contentParams = getContentLengthParams();

      console.log("[Landing] Content parameters:", {
        length: config.contentLength,
        maxTokens: contentParams.maxTokens,
        sections: contentParams.sections,
        hasImageAnalysis: !!imageAnalysis,
      });

      // ✅ ÉTAPE 4 : Générer le landing avec tous les paramètres
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          product_id: product.id,
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.description,
          vendor: resolvedVendor,
          style: config.style,
          mainColor:
            typeof config.colorScheme === "string" ? config.colorScheme : config.colorScheme?.primary || "#3B82F6",
          colorScheme: typeof config.colorScheme === "object" ? config.colorScheme : undefined,
          layout: config.layout,
          length: config.contentLength,
          customHighlights: config.customHighlights,
          imageAnalysis: imageAnalysis,
          contentLengthParams: contentParams,
          language: language,
        },
      });

      setProgress(60);
      setProgressMessage(t.landingGeneration.processing);

      if (error) throw error;
      if (data?.error) {
        const message = data.error.includes("Rate limits")
          ? t.landingGeneration.errors.rateLimit
          : data.error.includes("Payment required")
            ? t.landingGeneration.errors.paymentRequired
            : data.error.includes("LIMIT_REACHED")
              ? t.landingGeneration.errors.limitReached
              : data.error;
        setError(message);
        toast.error(message);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(90);
      setProgressMessage(t.landingGeneration.finalizing);

      if (data?.html?.trim()) {
        const wordCount = data.html.split(/\s+/).length;
        console.log(`[Landing] Generated content: ${wordCount} words (mobile-optimized by backend)`);

        setHtmlContent(data.html);
        setProgress(100);
        setProgressMessage(`✅ ${t.landingGeneration.success.generated}`);

        toast.success(t.landingGeneration.success.generated);
        onGenerated?.(data.html);

        // Recharger les données pour mettre à jour le badge
        const { data: updatedLanding } = await supabase
          .from("product_landing_pages")
          .select("*")
          .eq("product_id", product.id)
          .eq("is_active", true)
          .maybeSingle();

        if (updatedLanding) {
          setExistingLanding(updatedLanding);
        }
      } else {
        throw new Error(t.landingGeneration.errors.noGenerated);
      }
    } catch (err: any) {
      console.error("Error generating landing:", err);
      const errorMsg = err?.message || t.landingGeneration.errors.generation;
      setError(errorMsg);
      toast.error(errorMsg);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  /** ----------------------------
   * 💾 Download HTML
   -----------------------------*/
  const handleDownloadHTML = () => {
    if (!htmlContent) return toast.error(t.landingGeneration.errors.noContent);

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_landing.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t.landingGeneration.preview.downloaded);
  };

  /** ----------------------------
   * 🔄 Sync to Shopify
   -----------------------------*/
  const handleSyncToShopify = async () => {
    if (!htmlContent) return toast.error(t.landingGeneration.errors.noContentSync);

    try {
      setSyncing(true);
      toast.info(t.landingGeneration.preview.syncInProgress);

      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          htmlContent,
        },
      });

      if (error) throw error;
      if (data?.error) {
        // Check if it's a "needs import" error
        if (data?.needsImport || data.error.includes("non synchronisé") || data.error.includes("not synchronized")) {
          toast.error("Ce produit doit d'abord être importé depuis Shopify", {
            description: "Rendez-vous sur la page Intégration pour importer vos produits Shopify.",
          });
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success(t.landingGeneration.success.synced);
      if (data?.pageUrl) toast.info(`${t.landingGeneration.success.available} ${data.pageUrl}`, { duration: 10000 });

      // Recharger les données pour mettre à jour le badge
      const { data: updatedLanding } = await supabase
        .from("product_landing_pages")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .maybeSingle();

      if (updatedLanding) {
        setExistingLanding(updatedLanding);
      }
    } catch (err: any) {
      console.error("Error syncing to Shopify:", err);
      toast.error(err?.message || t.landingGeneration.errors.sync);
    } finally {
      setSyncing(false);
    }
  };

  /** ----------------------------
   * 🧠 UI Render
   -----------------------------*/
  return (
    <div className="space-y-6">
      {/* Existing Landing Page Status */}
      {!loadingExisting && existingLanding && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Landing page existante</p>
              <p className="text-xs text-muted-foreground">
                Version {existingLanding.version} • Créée le {new Date(existingLanding.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant={existingLanding.last_synced_at ? "default" : "secondary"}>
            {existingLanding.last_synced_at ? "Synchronisée" : "Non synchronisée"}
          </Badge>
        </div>
      )}

      {/* Progress Section */}
      {loading && (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.02)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient_8s_ease_infinite]" />

          {/* Animated Title */}
          <div className="flex items-center gap-4 mb-5 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Sparkles className="w-6 h-6 text-primary animate-pulse relative z-10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-foreground">AI-Powered Landing Generation</h3>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  <Zap className="w-3 h-3 mr-1" />
                  Vision AI
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {progress < 10 && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Initializing AI models...</span>
                  </>
                )}
                {progress >= 10 && progress < 20 && (
                  <>
                    <Scan className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">Analyzing product image with Vision AI</span>
                  </>
                )}
                {progress >= 20 && progress < 30 && (
                  <>
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Extracting visual attributes & styling</span>
                  </>
                )}
                {progress >= 30 && progress < 40 && (
                  <>
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Market positioning analysis</span>
                  </>
                )}
                {progress >= 40 && progress < 50 && (
                  <>
                    <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">Generating persuasive copy</span>
                  </>
                )}
                {progress >= 50 && progress < 60 && (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Crafting hero sections</span>
                  </>
                )}
                {progress >= 60 && progress < 70 && (
                  <>
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Building responsive structure</span>
                  </>
                )}
                {progress >= 70 && progress < 80 && (
                  <>
                    <Palette className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">Applying design patterns</span>
                  </>
                )}
                {progress >= 80 && progress < 90 && (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Mobile optimization</span>
                  </>
                )}
                {progress >= 90 && progress < 100 && (
                  <>
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">Final optimization</span>
                  </>
                )}
                {progress >= 100 && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Landing page ready!</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mt-4 z-10 space-y-3">
            <Progress value={progress} showPercentage className="h-2" />

            {/* Stage indicator */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/95 border border-primary/20 shadow-sm backdrop-blur-sm">
                {progress < 15 && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-xs font-medium text-primary">AI Initialization</span>
                  </>
                )}
                {progress >= 15 && progress < 30 && (
                  <>
                    <Scan className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Vision Analysis</span>
                  </>
                )}
                {progress >= 30 && progress < 45 && (
                  <>
                    <Brain className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Context Processing</span>
                  </>
                )}
                {progress >= 45 && progress < 65 && (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Content Generation</span>
                  </>
                )}
                {progress >= 65 && progress < 85 && (
                  <>
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Layout Optimization</span>
                  </>
                )}
                {progress >= 85 && progress < 100 && (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Final Assembly</span>
                  </>
                )}
                {progress >= 100 && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-600">Complete</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mt-5 relative z-10">
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-500 ${progress >= 20 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="font-medium">Vision AI</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-500 ${progress >= 50 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="font-medium">UX Optimized</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-500 ${progress >= 70 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="font-medium">Mobile First</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-500 ${progress >= 90 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Target className="w-3.5 h-3.5" />
              <span className="font-medium">Conversion Focused</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">{t.landingGeneration.errors.generation}</p>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              {t.landingConfig.buttons.confirm}
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {htmlContent && !loading && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-700 text-sm sm:text-base">
                  {t.landingGeneration.success.generated} • {getContentLengthParams().wordCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {t.landingGeneration.preview.description} • Optimisé mobile
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="hidden sm:inline">{t.landingGeneration.preview.title}</span>
                <span className="sm:hidden">Aperçu</span>
              </h3>
              <Tabs
                value={previewMode}
                onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}
                className="w-auto"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="desktop" className="text-xs sm:text-sm px-2 sm:px-3">
                    <Monitor className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t.landingGeneration.preview.desktop}</span>
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="text-xs sm:text-sm px-2 sm:px-3">
                    <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t.landingGeneration.preview.mobile}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleDownloadHTML}
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t.landingGeneration.preview.download}</span>
                <span className="sm:hidden">Télécharger</span>
              </Button>

              <Button
                onClick={handleSyncToShopify}
                disabled={syncing}
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">{t.landingGeneration.preview.synchronizing}</span>
                    <span className="sm:hidden">Sync...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t.landingGeneration.preview.syncShopify}</span>
                    <span className="sm:hidden">Synchroniser</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div
            className={`border rounded-xl overflow-auto bg-white shadow-inner transition-all duration-300 ${
              previewMode === "mobile"
                ? "max-w-[375px] mx-auto p-2 sm:p-4 max-h-[600px] sm:max-h-[650px]"
                : "p-4 sm:p-6 lg:p-8 max-h-[500px] sm:max-h-[650px]"
            }`}
          >
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && !htmlContent && !error && (
        <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/10">
          <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary/70 animate-pulse" />
          <p className="text-sm">{t.landingGeneration.initializing}</p>
        </div>
      )}
    </div>
  );
}
