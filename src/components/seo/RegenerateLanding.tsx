import { useState, useEffect } from "react";
import { Loader2, Eye, Monitor, Smartphone, Download, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

interface ProductImage {
  id: string;
  image_url: string;
  position?: number;
}

interface ProductVariant {
  id: string;
  title: string;
  image_url?: string;
  price?: string;
  compare_at_price?: string;
}

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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

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
   * 📸 Fetch All Product Images
   -----------------------------*/
  const fetchProductImages = async (): Promise<ProductImage[]> => {
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, src, position")
        .eq("product_id", product.id)
        .order("position", { ascending: true });

      if (error) throw error;
      return (data || []).map(img => ({ id: img.id, image_url: img.src, position: img.position }));
    } catch (err) {
      console.error("[Images] Failed to fetch product images:", err);
      return [];
    }
  };

  /** ----------------------------
   * 🎨 Fetch Product Variants
   -----------------------------*/
  const fetchProductVariants = async (): Promise<ProductVariant[]> => {
    // Temporairement désactivé - nécessite analyse de la structure DB
    return [];
  };

  /** ----------------------------
   * 🖼️ Analyze Multiple Images with AI Vision
   -----------------------------*/
  const analyzeImagesWithAI = async (imageUrls: string[]): Promise<string> => {
    if (!imageUrls || imageUrls.length === 0) {
      console.log("⚠️ [Vision] No images to analyze");
      return "";
    }

    try {
      console.log(`🔍 [Vision] Starting analysis for ${imageUrls.length} images...`);
      setProgressMessage(t.landingGeneration.analyzing);
      setProgress(25);

      // Analyze up to 5 images to avoid excessive API calls
      const imagesToAnalyze = imageUrls.slice(0, 5);
      console.log(`📊 [Vision] Will analyze ${imagesToAnalyze.length} images (max 5)`);
      const analyses: string[] = [];

      // Process images sequentially with delay to avoid rate limits
      for (let i = 0; i < imagesToAnalyze.length; i++) {
        try {
          console.log(`🔍 [Vision] Analyzing image ${i + 1}/${imagesToAnalyze.length}: ${imagesToAnalyze[i]}`);
          
          const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
            body: {
              imageUrl: imagesToAnalyze[i],
              productContext: product.title,
            },
          });

          if (error) {
            console.error(`❌ [Vision] Error for image ${i + 1}:`, error);
            
            // If rate limited, show user-friendly message and stop
            if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
              toast.error(t.landingGeneration.errors.rateLimit);
              break;
            }
          } else if (!data?.attributes) {
            console.warn(`⚠️ [Vision] No attributes returned for image ${i + 1}`);
          } else {
            console.log(`✅ [Vision] Image ${i + 1} analyzed successfully:`, data.attributes);
            analyses.push(`
Image ${i + 1}:
- Couleur: ${data.attributes.dominantColor || "N/A"}
- Style: ${data.attributes.visualStyle || "N/A"}
- Matériaux: ${data.attributes.materials?.join(", ") || "N/A"}
- Ambiance: ${data.attributes.mood || "N/A"}
          `);
          }
        } catch (err) {
          console.error(`❌ [Vision] Exception analyzing image ${i + 1}:`, err);
        }
        
        // Update progress per image
        const imageProgress = 25 + (i + 1) * (10 / imagesToAnalyze.length);
        setProgress(Math.round(imageProgress));
        
        // Add 2-second delay between requests to avoid rate limits (except for last image)
        if (i < imagesToAnalyze.length - 1) {
          console.log('⏳ [Vision] Waiting 2s before next image analysis...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ [Vision] Analysis complete: ${analyses.length}/${imagesToAnalyze.length} images analyzed successfully`);
      return analyses.length > 0 ? analyses.join("\n") : "";
    } catch (err) {
      console.error("❌ [Vision] Image analysis error:", err);
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
      console.log("🚀 [Landing] Starting generation process...");
      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage(t.landingGeneration.preparing);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(10);

      // ✅ ÉTAPE 1 : Résoudre le vendor
      console.log("📦 [Landing] Step 1: Resolving vendor...");
      setProgressMessage(t.landingGeneration.resolving);
      const resolvedVendor = await resolveVendor();
      console.log("✅ [Landing] Vendor resolved:", resolvedVendor);

      setProgress(15);

      // ✅ ÉTAPE 2 : Récupérer toutes les images du produit
      console.log("🖼️ [Landing] Step 2: Fetching product images...");
      setProgressMessage("Récupération des images...");
      const productImages = await fetchProductImages();
      const allImageUrls = [
        ...(product.image_url ? [product.image_url] : []),
        ...productImages.map(img => img.image_url)
      ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates

      console.log(`✅ [Landing] Found ${allImageUrls.length} product images:`, allImageUrls);
      setProgress(20);

      // ✅ ÉTAPE 3 : Récupérer les variantes du produit
      console.log("🎨 [Landing] Step 3: Fetching product variants...");
      setProgressMessage("Récupération des variantes...");
      const variants = await fetchProductVariants();
      console.log(`✅ [Landing] Found ${variants.length} product variants`);
      setProgress(22);

      // ✅ ÉTAPE 4 : Analyser toutes les images avec Vision IA
      console.log("🔍 [Landing] Step 4: Analyzing images with Vision AI...");
      let imageAnalysis = "";
      if (allImageUrls.length > 0) {
        imageAnalysis = await analyzeImagesWithAI(allImageUrls);
        console.log("✅ [Landing] Vision AI analysis completed");
      } else {
        console.log("⚠️ [Landing] No images to analyze");
      }

      setProgress(35);
      console.log("🤖 [Landing] Step 5: Generating landing page with AI...");
      setProgressMessage(t.landingGeneration.generating);

      // ✅ ÉTAPE 3 : Obtenir les paramètres de longueur
      const contentParams = getContentLengthParams();

      console.log("[Landing] Content parameters:", {
        length: config.contentLength,
        maxTokens: contentParams.maxTokens,
        sections: contentParams.sections,
        hasImageAnalysis: !!imageAnalysis,
      });

      // ✅ ÉTAPE 5 : Générer le landing avec tous les paramètres
      console.log("📤 [Landing] Calling generate-landing-ai function with:", {
        title: product.title,
        imagesCount: allImageUrls.length,
        variantsCount: variants.length,
        hasImageAnalysis: !!imageAnalysis,
        style: config.style,
        layout: config.layout
      });
      
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productTitle: product.title,
          imageUrl: product.image_url,
          allImages: allImageUrls, // 🆕 Toutes les images
          description: product.description,
          vendor: resolvedVendor,
          variants: variants.length > 0 ? variants : null, // 🆕 Variantes produit
          style: config.style,
          mainColor: config.colorScheme,
          layout: config.layout,
          length: config.contentLength,
          customHighlights: config.customHighlights,
          imageAnalysis: imageAnalysis, // 🆕 Analyse vision IA de toutes les images
          contentLengthParams: contentParams, // 🆕 Paramètres de longueur
          mobileOptimized: true, // 🆕 Forcer l'optimisation mobile
        },
      });

      setProgress(60);
      setProgressMessage(t.landingGeneration.processing);

      console.log("📥 [Landing] Response received from generate-landing-ai");
      
      if (error) {
        console.error("❌ [Landing] Function error:", error);
        throw error;
      }
      if (data?.error) {
        console.error("❌ [Landing] API returned error:", data.error);
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
        // ✅ Validation de la longueur du contenu généré
        const wordCount = data.html.split(/\s+/).length;
        console.log(`✅ [Landing] Generated content: ${wordCount} words`);

        setHtmlContent(data.html);
        setProgress(100);
        setProgressMessage(`✅ ${t.landingGeneration.success.generated}`);

        toast.success(t.landingGeneration.success.generated);
        onGenerated?.(data.html);
        
        console.log("🎉 [Landing] Generation process completed successfully!");
      } else {
        console.error("❌ [Landing] No HTML content in response");
        throw new Error(t.landingGeneration.errors.noGenerated);
      }
    } catch (err: any) {
      console.error("❌ [Landing] Generation error:", err);
      console.error("Error details:", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      });
      const errorMsg = err?.message || t.landingGeneration.errors.generation;
      setError(errorMsg);
      toast.error(errorMsg);
      setProgress(0);
    } finally {
      setLoading(false);
      console.log("🏁 [Landing] Generation process ended");
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
      if (data?.error) return toast.error(data.error);

      toast.success(t.landingGeneration.success.synced);
      if (data?.pageUrl) toast.info(`${t.landingGeneration.success.available} ${data.pageUrl}`, { duration: 10000 });
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
      {/* Progress Section */}
      {loading && (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{t.landingGeneration.generating}...</h3>
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
            </div>
          </div>
          <Progress value={progress} showPercentage />
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
