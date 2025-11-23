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
  const [titleAnalysis, setTitleAnalysis] = useState<{
    visionAnalysis?: string;
    deepseekAnalysis?: string;
    confidence?: number;
  } | null>(null);
  

  // Log component mounting
  useEffect(() => {
    console.log('[RegenerateLanding] Component mounted', {
      productId: product.id,
      productTitle: product.title,
      autoGenerate,
      config
    });
  }, []);

  // Charger la landing page existante directement depuis shopify_products
  useEffect(() => {
    let isMounted = true;
    
    const loadExistingLanding = async () => {
      try {
        const { data, error } = await supabase
          .from("shopify_products")
          .select("landing_page_html")
          .eq("id", product.id)
          .single();

        if (error) throw error;
        
        if (data?.landing_page_html && isMounted) {
          setHtmlContent(data.landing_page_html);
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

  // Reset states when product changes
  useEffect(() => {
    console.log(`🔄 [Landing] Product changed to: ${product.id}, resetting all states`);
    hasGeneratedRef.current = false;
    isGeneratingRef.current = false;
    setHtmlContent("");
    setSyncedProductUrl(null);
    setTitleNeedsSync(false);
    setOptimizedTitle(null);
    setError(null);
    setProgress(0);
    setProgressMessage("");
  }, [product.id]);

  // Auto-generate simplifié avec double protection
  useEffect(() => {
    console.log(`🔍 [Landing] Auto-generate check: autoGenerate=${autoGenerate}, loading=${loading}, hasContent=${!!htmlContent}, hasGenerated=${hasGeneratedRef.current}, isGenerating=${isGeneratingRef.current}`);
    
    if (autoGenerate && !loading && !htmlContent && !hasGeneratedRef.current && !isGeneratingRef.current) {
      console.log('🚀 [Landing] Starting generation...');
      hasGeneratedRef.current = true;
      isGeneratingRef.current = true;
      handleGenerate().finally(() => {
        console.log('✅ [Landing] Generation completed, releasing lock');
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
   * 🖼️ Analyze Image with AI Vision (with cache)
   -----------------------------*/
  const analyzeImageWithAI = async (imageUrl: string): Promise<string> => {
    // Vision analysis is now handled directly in generate-landing-ai
    // This function is kept for backwards compatibility but does nothing
    console.log("[Vision] Image analysis is now integrated in landing page generation");
    return "";
  };

  /** ----------------------------
   * 📏 Calculate Content Length Parameters
   -----------------------------*/
  const getContentLengthParams = () => {
    switch (config.contentLength) {
      case "short":
        return {
          maxTokens: 2000,
          description: "Concis mais complet - toutes les sections essentielles",
        };
      case "long":
        return {
          maxTokens: 4000,
          description: "Détaillé avec exemples - sections étoffées",
        };
      default:
        return {
          maxTokens: 2000,
          description: "Concis mais complet",
        };
    }
  };

  /** ----------------------------
   * ✨ Generate Landing via AI with Progress (with retry logic)
   -----------------------------*/
  const handleGenerate = async (isRetry = false) => {
    console.log('[RegenerateLanding] Starting generation...', {
      productId: product.id,
      productTitle: product.title,
      config,
      isRetry
    });

    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage(isRetry ? t.landingGeneration.errors.retrying : t.landingGeneration.preparing);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(10);

      // ✅ ÉTAPE 1 : Résoudre le vendor
      setProgressMessage(t.landingGeneration.resolving);
      const resolvedVendor = await resolveVendor();
      console.log("[Landing] Resolved vendor:", resolvedVendor);

      setProgress(15);

      // ✅ ÉTAPE 1.5 : Optimiser le titre avec Smart Title (Vision AI + DeepSeek)
      // 🌍 CORRECTION: Récupérer la langue du store (pas la langue UI)
      let storeLanguage: string = language;
      try {
        const { data: storeConnection } = await supabase
          .from('shopify_products')
          .select('store_id')
          .eq('id', product.id)
          .maybeSingle();
        
        if (storeConnection?.store_id) {
          const { data: store } = await supabase
            .from('shopify_connections')
            .select('store_language')
            .eq('id', storeConnection.store_id)
            .maybeSingle();
          
          if (store?.store_language) {
            const detectedLang = store.store_language.split('-')[0].toLowerCase();
            // Validate language (fallback to 'fr' if unknown)
            storeLanguage = ['fr', 'en', 'es'].includes(detectedLang) ? detectedLang : 'fr';
            console.log(`🌍 Using store language for title: ${storeLanguage}`);
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch store language, using UI language:", err);
      }

      try {
        const { data: titleData, error: titleError } = await supabase.functions.invoke("smart-title", {
          body: {
            productId: product.id,
            language: storeLanguage, // ✅ Use store language, not UI language
          },
        });

        if (titleError) {
          console.warn("[Landing] Smart Title optimization failed:", titleError);
          setProgressMessage(t.landingGeneration.generating);
        } else if (titleData?.success && titleData?.optimizedTitle) {
          console.log("[Landing] Title optimized with Vision AI:", titleData.optimizedTitle);
          setOptimizedTitle(titleData.optimizedTitle);
          setTitleNeedsSync(true);
          
          // ✅ PHASE 3: Show only optimized title in progress message
          setProgressMessage(`📝 ${titleData.optimizedTitle}`);
          
          toast.success(t.landingGeneration.optimizedTitle, {
            description: titleData.optimizedTitle.substring(0, 100)
          });
        } else {
          setProgressMessage(t.landingGeneration.generating);
        }
      } catch (err) {
        console.warn("[Landing] Smart Title optimization error:", err);
        setProgressMessage(t.landingGeneration.generating);
      }

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
        description: contentParams.description,
        hasImageAnalysis: !!imageAnalysis,
      });

      // ✅ ÉTAPE 4 : Générer le landing avec Lovable AI
      console.log('[RegenerateLanding] Invoking generate-landing-ai...', {
        productId: product.id,
        style: config.designStyle,
        layout: config.layout,
        language: storeLanguage
      });

      // ✅ Load user default preferences
      const { data: userData } = await supabase.auth.getUser();
      const { data: defaultPref } = await supabase
        .from('landing_page_preferences')
        .select('*')
        .eq('user_id', userData?.user?.id)
        .eq('is_default', true)
        .maybeSingle();

      console.log('[RegenerateLanding] User preferences:', defaultPref ? 'Found' : 'None (using defaults)');

      // Add timeout protection (5 minutes for AI generation)
      const timeoutMs = 300000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La génération a pris plus de 5 minutes. Veuillez réessayer.')), timeoutMs)
      );

      // ✅ Prepare body with both userPreferences and session config options
      const requestBody: any = {
        product_id: product.id,
        productTitle: product.title,
        description: product.description || "",
        vendor: resolvedVendor,
        imageUrl: product.image_url,
        language: storeLanguage,
        
        // ✅ CRITICAL: Pass session config options (will be used if no userPreferences)
        layout: config.layout,
        colorScheme: {
          primary: config.colorScheme.primary,
          secondary: config.colorScheme.secondary,
          accent: config.colorScheme.primary, // ✅ Use primary as accent if not defined
          background: config.colorScheme.background,
          surface: config.colorScheme.surface,
          text: config.colorScheme.text,
          textMuted: config.colorScheme.textMuted
        },
        length: config.contentLength,
        customHighlights: config.customHighlights,
        designStyle: config.designStyle,
        
        // ✅ User preferences override session config if available
        userPreferences: defaultPref ? {
          layout: defaultPref.layout,
          designStyle: defaultPref.design_style,
          contentLength: defaultPref.content_length,
          colorScheme: {
            primary: defaultPref.color_primary,
            secondary: defaultPref.color_secondary,
            accent: defaultPref.color_accent,
            background: defaultPref.color_background,
            surface: defaultPref.color_surface,
            text: defaultPref.color_text,
            textMuted: defaultPref.color_text_muted
          },
          highlights: defaultPref.custom_highlights
        } : null,
      };

      console.log('[RegenerateLanding] Request body prepared:', {
        hasUserPreferences: !!defaultPref,
        layout: requestBody.layout,
        designStyle: requestBody.designStyle,
        contentLength: requestBody.length
      });

      const invocationPromise = supabase.functions.invoke("generate-landing-ai", requestBody).catch(err => {
        console.error('[RegenerateLanding] Network error:', err);
        throw new Error(`Erreur réseau: ${err.message}`);
      });

      const result = await Promise.race([
        invocationPromise,
        timeoutPromise
      ]) as any;

      const { data, error } = result;

      console.log('[RegenerateLanding] Function invocation completed', {
        hasError: !!error,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        errorDetails: error
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
        
        // ✅ Extract and store optimized title if available
        if (data?.optimizedTitle && data.optimizedTitle !== product.title) {
          setOptimizedTitle(data.optimizedTitle);
          setTitleNeedsSync(true);
          console.log('[Landing] Optimized title extracted:', {
            original: product.title,
            optimized: data.optimizedTitle
          });
        }
        
        setProgress(100);
        setProgressMessage(`✅ ${t.landingGeneration.success.generated}`);

        toast.success(t.landingGeneration.success.generated);
        onGenerated?.(data.html);
      } else {
        throw new Error(t.landingGeneration.errors.noGenerated);
      }
    } catch (err: any) {
      console.error('[RegenerateLanding] Generation failed:', err);
      
      // ✅ Detect network/relay errors and implement retry logic
      const errorMessage = err?.message || '';
      const isNetworkError = 
        errorMessage.includes('FunctionsRelayError') || 
        errorMessage.includes('Failed to send a request to the Edge Function') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Erreur réseau');
      
      if (isNetworkError && !isRetry) {
        // First retry: wait 2.5 seconds and try again
        console.log('[RegenerateLanding] Network error detected, retrying in 2.5s...');
        setError(null);
        setProgressMessage(t.landingGeneration.errors.retrying);
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Recursive call with retry flag
        return handleGenerate(true);
      }
      
      // Show clear error message
      const errorMsg = isNetworkError 
        ? t.landingGeneration.errors.networkError
        : errorMessage || t.landingGeneration.errors.generation;
      
      setError(errorMsg);
      toast.error(errorMsg);
      setProgress(0);
    } finally {
      setLoading(false);
      console.log('[RegenerateLanding] Generation process finished');
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
   * 🔄 Sync to Shopify (with retry logic)
   -----------------------------*/
  const handleSyncToShopify = async (isRetry = false) => {
    if (!htmlContent) return toast.error(t.landingGeneration.errors.noContentSync);

    try {
      setSyncing(true);
      if (!isRetry) {
        toast.info(t.landingGeneration.preview.syncInProgress);
      }

      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          productTitle: optimizedTitle || product.title, // ✅ Use optimized title if available
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
      
      // ✅ Detect network/relay errors and implement optional retry
      const errorMessage = err?.message || '';
      const isNetworkError = 
        errorMessage.includes('FunctionsRelayError') || 
        errorMessage.includes('Failed to send a request to the Edge Function') ||
        errorMessage.includes('NetworkError');
      
      if (isNetworkError && !isRetry) {
        // Optional retry: wait 2 seconds and try once
        console.log('[RegenerateLanding] Sync network error, retrying in 2s...');
        toast.info(t.landingGeneration.errors.retrying);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return handleSyncToShopify(true);
      }
      
      // Show clear error message
      const errorMsg = isNetworkError
        ? t.landingGeneration.errors.syncNetworkError
        : errorMessage || t.landingGeneration.errors.sync;
      
      toast.error(errorMsg);
    } finally {
      setSyncing(false);
    }
  };

  /** ----------------------------
   * 🧠 UI Render
   -----------------------------*/
  return (
    <div className="space-y-6">
      {/* Optimized Title Section - SIMPLIFIED */}
      {optimizedTitle && (
        <div className="bg-gradient-to-br from-accent/5 to-accent/10 p-4 rounded-xl border border-accent/30">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-accent/20 blur-md rounded-full animate-pulse" />
              <Sparkles className="w-5 h-5 text-accent relative z-10" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-accent font-medium">{t.landingGeneration.optimizedTitle}</p>
              </div>
              <p className="text-base font-semibold leading-snug">{optimizedTitle}</p>
              
              {titleNeedsSync && (
                <div className="flex items-center gap-2 text-xs text-accent/80 font-medium pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t.landingGeneration.syncTitle}
                </div>
              )}
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
              <p className="text-xs text-muted-foreground">
                Dernière modification • {product.title}
              </p>
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
                <h3 className="font-semibold text-lg text-foreground">{t.landingGeneration.progressHeader.title}</h3>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  <Zap className="w-3 h-3 mr-1" />
                  {t.landingGeneration.progressHeader.badge}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {progress < 10 && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.initializingDetail}</span>
                  </>
                )}
                {progress >= 10 && progress < 20 && (
                  <>
                    <Scan className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.analyzingImageDetail}</span>
                  </>
                )}
                {progress >= 20 && progress < 30 && (
                  <>
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.extractingAttributesDetail}</span>
                  </>
                )}
                {progress >= 30 && progress < 40 && (
                  <>
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.marketAnalysisDetail}</span>
                  </>
                )}
                {progress >= 40 && progress < 50 && (
                  <>
                    <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.generatingCopyDetail}</span>
                  </>
                )}
                {progress >= 50 && progress < 60 && (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.craftingHeroDetail}</span>
                  </>
                )}
                {progress >= 60 && progress < 70 && (
                  <>
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.buildingLayoutDetail}</span>
                  </>
                )}
                {progress >= 70 && progress < 80 && (
                  <>
                    <Palette className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.applyingDesignDetail}</span>
                  </>
                )}
                {progress >= 80 && progress < 90 && (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.mobileOptimizationDetail}</span>
                  </>
                )}
                {progress >= 90 && progress < 100 && (
                  <>
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t.landingGeneration.stages.finalOptimizationDetail}</span>
                  </>
                )}
                {progress >= 100 && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">{t.landingGeneration.stages.readyDetail}</span>
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
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipInitializing}</span>
                  </>
                )}
                {progress >= 15 && progress < 25 && (
                  <>
                    <Eye className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipVision}</span>
                  </>
                )}
                {progress >= 25 && progress < 40 && (
                  <>
                    <Target className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipContext}</span>
                  </>
                )}
                {progress >= 40 && progress < 60 && (
                  <>
                    <Brain className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipContent}</span>
                  </>
                )}
                {progress >= 60 && progress < 80 && (
                  <>
                    <Layout className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipLayout}</span>
                  </>
                )}
                {progress >= 80 && progress < 100 && (
                  <>
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
                    <span className="text-sm font-semibold text-primary">{t.landingGeneration.stages.chipFinalAssembly}</span>
                  </>
                )}
                {progress >= 100 && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-green-600">{t.landingGeneration.stages.chipComplete}</span>
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
              <span className="font-medium">{t.landingGeneration.badges.visionAi}</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 50 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Brain className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{t.landingGeneration.badges.uxOptimized}</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 70 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Smartphone className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{t.landingGeneration.badges.mobileFirst}</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-500 ${progress >= 90 ? "bg-primary/10 border-primary/30 text-primary shadow-sm" : "bg-muted/50 border-border text-muted-foreground"}`}
            >
              <Target className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{t.landingGeneration.badges.conversionFocused}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-semibold text-destructive">{t.landingGeneration.generationFailed}</p>
                <p className="text-sm text-destructive/90 mt-1">{error}</p>
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
                {t.landingGeneration.retry}
              </Button>
            </div>
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
                  {t.landingGeneration.success.generated} • {getContentLengthParams().description}
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
                  onClick={() => handleSyncToShopify()}
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
                  onClick={() => window.open(syncedProductUrl, '_blank')}
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

            {/* ✅ FIXED: Preview iframe with proper error handling */}
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
                  onError={(e) => {
                    console.error("Iframe loading error:", e);
                    toast.error("Erreur de chargement de l'aperçu");
                  }}
                />
              </div>
            ) : (
              <div className="border rounded-xl p-8 bg-muted/30 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Aucun contenu à prévisualiser</p>
              </div>
            )}
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
