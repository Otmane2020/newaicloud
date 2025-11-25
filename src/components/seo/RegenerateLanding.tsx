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
  LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

// 🛡️ Template de fallback pour mode dégradé
const generateFallbackLandingPage = (
  title: string,
  description: string | undefined,
  imageUrl: string | undefined
): string => {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .container { max-width: 800px; width: 100%; background: white; border-radius: 20px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
    .hero { padding: 3rem 2rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; font-weight: 700; }
    .description { font-size: 1.125rem; opacity: 0.95; margin-bottom: 2rem; }
    .image { width: 100%; height: 400px; object-fit: cover; }
    .content { padding: 2rem; }
    .cta { display: inline-block; margin-top: 1.5rem; padding: 1rem 2.5rem; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; 
      text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1.125rem;
      transition: transform 0.2s; }
    .cta:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>${title}</h1>
      ${description ? `<p class="description">${description.slice(0, 200)}...</p>` : ''}
      <a href="#" class="cta">Découvrir →</a>
    </div>
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="image" />` : ''}
    <div class="content">
      <p style="color: #666; text-align: center;">
        ⚡ Landing page générée en mode simplifié
      </p>
    </div>
  </div>
</body>
</html>`;
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
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [syncedProductUrl, setSyncedProductUrl] = useState<string | null>(null);
  const [optimizedTitle, setOptimizedTitle] = useState<string | null>(null);
  const [titleNeedsSync, setTitleNeedsSync] = useState(false);

  // Charger la landing page existante directement depuis shopify_products
  useEffect(() => {
    let isMounted = true;

    const loadExistingLanding = async () => {
      try {
        const { data, error } = await supabase
          .from("shopify_products")
          .select("landing_page")
          .eq("id", product.id)
          .single();

        if (error) throw error;

        if (data?.landing_page && isMounted) {
          setHtmlContent(data.landing_page);
        }
      } catch (error) {
        console.error("Erreur chargement landing:", error);
      } finally {
        if (isMounted) {
          setLoadingExisting(false);
        }
      }
    };

    loadExistingLanding();

    return () => {
      isMounted = false;
    };
  }, [product.id]);

  // Ref pour éviter les générations multiples
  const hasGeneratedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  // Reset le ref quand le produit change
  useEffect(() => {
    console.log(`🔄 [Landing] Product changed to: ${product.id}, resetting refs`);
    hasGeneratedRef.current = false;
    isGeneratingRef.current = false;
  }, [product.id]);

  // Auto-generate simplifié avec double protection
  useEffect(() => {
    console.log(
      `🔍 [Landing] Auto-generate check: autoGenerate=${autoGenerate}, loading=${loading}, hasContent=${!!htmlContent}, hasGenerated=${hasGeneratedRef.current}, isGenerating=${isGeneratingRef.current}`,
    );

    if (autoGenerate && !loading && !htmlContent && !hasGeneratedRef.current && !isGeneratingRef.current) {
      console.log("🚀 [Landing] Starting generation...");
      hasGeneratedRef.current = true;
      isGeneratingRef.current = true;
      handleGenerate(false).finally(() => {
        console.log("✅ [Landing] Generation completed, releasing lock");
        isGeneratingRef.current = false;
      });
    }
  }, [autoGenerate, loading]);

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
  const handleGenerate = async (forceFastMode = false) => {
    // ⏱️ Client-side timeout (90 seconds max)
    const timeoutId = setTimeout(() => {
      setError("La génération a pris trop de temps. Réessayez avec un contenu plus court ou en mode rapide.");
      setLoading(false);
      setProgress(0);
      toast.error("Timeout : génération trop longue", {
        description: "Réessayez en sélectionnant 'Contenu court' ou désactivez les analyses secondaires"
      });
    }, 90000);

    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage(t.landingGeneration.preparing);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(10);
      setProgressMessage("Résolution du vendeur...");

      // ✅ ÉTAPE 1 : Résoudre le vendor
      const resolvedVendor = await resolveVendor();
      console.log("[Landing] Resolved vendor:", resolvedVendor);

      setProgress(20);
      setProgressMessage("Optimisation du titre SERP...");

      // ✅ ÉTAPE 1.5 : Optimiser le titre avec Smart Title (Vision + AI)
      try {
        const { data: smartTitleData, error: smartTitleError } = await supabase.functions.invoke("smart-title", {
          body: {
            productId: product.id,
            language: language,
          },
        });

        if (smartTitleError) {
          console.warn("[Landing] Smart title optimization failed:", smartTitleError);
        } else if (smartTitleData?.success && smartTitleData?.optimizedTitle) {
          console.log("[Landing] Title optimized with Vision AI:", smartTitleData.optimizedTitle);
          setOptimizedTitle(smartTitleData.optimizedTitle);
          setTitleNeedsSync(true);
          toast.success(`Titre optimisé: ${smartTitleData.optimizedTitle}`, {
            description: "Titre basé sur l'analyse visuelle du produit",
          });
        }
      } catch (err) {
        console.warn("[Landing] Smart title error:", err);
        // Continue even if smart title fails
      }

      setProgress(35);
      setProgressMessage("Analyse des images avec Vision AI...");

      // ✅ ÉTAPE 2 : Analyser l'image avec vision IA
      let imageAnalysis = "";
      if (product.image_url) {
        imageAnalysis = await analyzeImageWithAI(product.image_url);
      } else {
        setProgress(40); // Skip to same progress if no image
      }

      setProgress(50);
      setProgressMessage("Génération du contenu HTML...");

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
          productId: product.id,
          productTitle: optimizedTitle || product.title,
          seo_title: product.seo_title, // ✅ Pass SEO title for landing page sync
          imageUrl: product.image_url,
          description: product.description,
          vendor: resolvedVendor,
          imageAnalysis: imageAnalysis,
          language: language,
          fastMode: forceFastMode || config.contentLength === "short", // ⚡ Enable fast mode for short content or if forced
          options: {
            colorScheme: config.colorScheme, // Can be string (key) or object (values)
            layout: config.layout,
            designStyle: config.designStyle || "modern",
            contentLength: config.contentLength,
            customHighlights: config.customHighlights,
            theme: config.theme || "light",
          },
        },
      });

      setProgress(80);
      setProgressMessage("Finalisation du HTML...");

      if (data?.html?.trim()) {
        const wordCount = data.html.split(/\s+/).length;
        console.log(`[Landing] Generated content: ${wordCount} words (mobile-optimized by backend)`);

        setHtmlContent(data.html);
        setProgress(100);
        setProgressMessage(`✅ ${t.landingGeneration.success.generated}`);

        toast.success(t.landingGeneration.success.generated);
        onGenerated?.(data.html);
      } else {
        throw new Error(t.landingGeneration.errors.noGenerated);
      }
    } catch (err: any) {
      console.error("Error generating landing:", err);
      const errorMsg = err?.message || t.landingGeneration.errors.generation;
      setError(errorMsg);
      
      // 🛡️ Mode dégradé : générer un template basique de fallback
      const fallbackHtml = generateFallbackLandingPage(product.title, product.description, product.image_url);
      setHtmlContent(fallbackHtml);
      setProgress(100);
      
      toast.error("Génération partielle", {
        description: (
          <>
            La génération complète a échoué. Un template basique a été créé.{" "}
            <button
              onClick={() => handleGenerate(true)}
              className="underline font-semibold hover:text-primary"
            >
              Réessayer en mode rapide
            </button>
          </>
        ),
        duration: 10000,
      });
      
      onGenerated?.(fallbackHtml);
    } finally {
      clearTimeout(timeoutId); // ⏱️ Clear timeout
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
      setTitleNeedsSync(false); // Title is now synced
      if (data?.productUrl) {
        setSyncedProductUrl(data.productUrl);
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
      {/* Optimized Title Alert */}
      {optimizedTitle && titleNeedsSync && (
        <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <div>
              <p className="font-medium text-sm">Titre optimisé SEO</p>
              <p className="text-xs text-muted-foreground mb-1">{optimizedTitle}</p>
              <p className="text-xs text-accent font-medium">
                ⚠️ Synchronisez avec Shopify pour appliquer le nouveau titre
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Existing Landing Page Status */}
      {!loadingExisting && htmlContent && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Landing page existante</p>
              <p className="text-xs text-muted-foreground">Dernière modification • {product.title}</p>
            </div>
          </div>
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
              <Sparkles className="w-8 h-8 text-accent animate-pulse relative z-10" />
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
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-background/95 border-2 border-primary/30 shadow-lg backdrop-blur-sm">
                {progress < 15 && (
                  <>
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">AI Initialization</span>
                  </>
                )}
                {progress >= 15 && progress < 30 && (
                  <>
                    <Scan className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">Vision Analysis</span>
                  </>
                )}
                {progress >= 30 && progress < 45 && (
                  <>
                    <Brain className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">Context Processing</span>
                  </>
                )}
                {progress >= 45 && progress < 65 && (
                  <>
                    <Wand2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">Content Generation</span>
                  </>
                )}
                {progress >= 65 && progress < 85 && (
                  <>
                    <Layout className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">Layout Optimization</span>
                  </>
                )}
                {progress >= 85 && progress < 100 && (
                  <>
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">Final Assembly</span>
                  </>
                )}
                {progress >= 100 && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-green-600">Complete</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mt-5 relative z-10">
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 20 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Scan className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Vision AI</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 50 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Brain className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">UX Optimized</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 70 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Smartphone className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Mobile First</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 90 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Target className="w-4 h-4 flex-shrink-0" />
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
            <Button variant="outline" size="sm" onClick={() => handleGenerate(false)}>
              {t.landingConfig.buttons.confirm}
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {htmlContent && !loading && !error && (
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

              {!syncedProductUrl ? (
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
              ) : (
                <Button
                  onClick={() => window.open(syncedProductUrl, "_blank")}
                  size="sm"
                  className="gap-2 w-full sm:w-auto text-xs sm:text-sm bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Visualiser en ligne</span>
                  <span className="sm:hidden">Voir en ligne</span>
                </Button>
              )}
            </div>
          </div>

          <div
            className={`border rounded-xl overflow-hidden bg-white shadow-inner transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[375px] mx-auto h-[600px] sm:h-[650px]" : "h-[500px] sm:h-[650px]"
            }`}
          >
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              title="Landing Page Preview"
            />
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
