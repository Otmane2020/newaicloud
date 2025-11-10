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
  Zap,
  Palette,
  Layout,
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
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

  /** ----------------------------
   * 🏷️ Resolve Vendor based on config
   -----------------------------*/
  const resolveVendor = async (): Promise<string> => {
    try {
      switch (config.vendorSource) {
        case "shopify":
          console.log("🔍 Fetching vendor from Shopify...");
          const { data: productData, error: shopifyError } = await supabase
            .from("shopify_products")
            .select("vendor")
            .eq("id", product.id)
            .single();

          if (shopifyError) throw shopifyError;
          return productData?.vendor || "Marque inconnue";

        case "extract":
          console.log("🔍 Extracting vendor from title...");
          const words = product.title.split(" ");
          const capitalizedWord = words.find(
            (word) =>
              word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase(),
          );
          return capitalizedWord || words.find((w) => w.length > 3) || "Marque";

        case "generate":
          console.log("🔍 Generating vendor with AI...");
          try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-vendor-name", {
              body: {
                productTitle: product.title,
                productDescription: product.description,
              },
            });

            if (aiError) throw aiError;
            return aiData?.vendor || "Marque générée";
          } catch (err) {
            console.error("[Vendor] AI generation failed:", err);
            return "Marque générée";
          }

        default:
          return "Marque inconnue";
      }
    } catch (error) {
      console.error("Error resolving vendor:", error);
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
      setProgressMessage("🔍 Analyse de l'image avec Vision AI...");
      setProgress(25);

      const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: {
          imageUrl: imageUrl,
          productContext: `${product.title} - ${config.style} style`,
          detectMeasurements: true,
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
      case "courte (400 mots)":
        return {
          maxTokens: 600,
          wordCount: "120-180 mots",
          sections: 2,
          description: "Contenu concis optimisé mobile",
        };
      case "moyenne (800 mots)":
        return {
          maxTokens: 900,
          wordCount: "200-300 mots",
          sections: 3,
          description: "Contenu équilibré mobile-first",
        };
      case "longue (1500 mots)":
        return {
          maxTokens: 1500,
          wordCount: "350-500 mots",
          sections: 4,
          description: "Contenu détaillé scroll-friendly",
        };
      default:
        return {
          maxTokens: 900,
          wordCount: "200-300 mots",
          sections: 3,
          description: "Contenu équilibré mobile-first",
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
      setProgressMessage("🚀 Initialisation génération...");

      // Debug: Afficher la configuration
      console.log("🎯 Configuration du wizard:", {
        style: config.style,
        mainColor: config.colorScheme,
        layout: config.layout,
        contentLength: config.contentLength,
        vendorSource: config.vendorSource,
        mentionBrand: config.mentionBrand,
        customHighlights: config.customHighlights,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(10);

      // ✅ ÉTAPE 1 : Résoudre le vendor
      setProgressMessage("🏷️ Résolution de la marque...");
      const resolvedVendor = await resolveVendor();
      console.log("[Landing] Resolved vendor:", resolvedVendor);

      setProgress(20);

      // ✅ ÉTAPE 2 : Analyser l'image avec vision IA
      let imageAnalysis = "";
      if (product.image_url) {
        imageAnalysis = await analyzeImageWithAI(product.image_url);
      } else {
        setProgress(25);
      }

      setProgress(30);
      setProgressMessage("🎨 Application de la configuration...");

      // ✅ ÉTAPE 3 : Obtenir les paramètres de longueur
      const contentParams = getContentLengthParams();

      // ✅ ÉTAPE 4 : Générer le landing avec TOUS les paramètres
      console.log("🚀 Appel de la fonction Edge avec configuration complète");
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          // Données produit
          product_id: product.id,
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.description,

          // ✅ TOUS les paramètres du wizard
          vendor: resolvedVendor,
          style: config.style,
          mainColor: config.colorScheme,
          layout: config.layout,
          length: config.contentLength,
          customHighlights: config.customHighlights,
          mentionBrand: config.mentionBrand,
          vendorSource: config.vendorSource,

          // Données techniques
          imageAnalysis: imageAnalysis,
          contentLengthParams: contentParams,
          mobileFirst: true,
          touchOptimized: true,
          language: "fr",
        },
      });

      setProgress(60);
      setProgressMessage("🤖 Génération du contenu IA...");

      if (error) {
        console.error("❌ Function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("❌ AI error:", data.error);
        const message = data.error.includes("Rate limits")
          ? "Limite de requêtes atteinte. Veuillez réessayer plus tard."
          : data.error.includes("Payment required")
            ? "Erreur de paiement de l'API."
            : data.error;
        setError(message);
        toast.error(message);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(90);
      setProgressMessage("✅ Finalisation...");

      if (data?.html?.trim()) {
        // Validation du contenu généré
        const wordCount = data.html.split(/\s+/).length;
        const hasThemeColor = data.html.includes(config.colorScheme) || data.html.includes("var(--theme-color)");

        console.log(`✅ Landing générée: ${wordCount} mots, Couleur appliquée: ${hasThemeColor}`);

        setHtmlContent(data.html);
        setProgress(100);
        setProgressMessage("✅ Landing page générée avec succès !");

        toast.success("Landing page générée avec votre configuration !");
        onGenerated?.(data.html);

        // Recharger les données
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
        throw new Error("Le contenu généré est vide.");
      }
    } catch (err: any) {
      console.error("❌ Error generating landing:", err);
      const errorMsg = err?.message || "Erreur lors de la génération";
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
    if (!htmlContent) return toast.error("Aucun contenu à télécharger");

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_landing.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("HTML téléchargé !");
  };

  /** ----------------------------
   * 🔄 Sync to Shopify
   -----------------------------*/
  const handleSyncToShopify = async () => {
    if (!htmlContent) return toast.error("Aucun contenu à synchroniser");

    try {
      setSyncing(true);
      toast.info("Synchronisation avec Shopify...");

      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          htmlContent,
          mobileOptimized: true,
        },
      });

      if (error) throw error;
      if (data?.error) return toast.error(data.error);

      toast.success("✅ Landing page synchronisée !");
      if (data?.pageUrl) {
        toast.info(`📱 Disponible: ${data.pageUrl}`, { duration: 10000 });
      }

      // Recharger les données
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
      toast.error(err?.message || "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  /** ----------------------------
   * 🧠 UI Render
   -----------------------------*/
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Configuration Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-lg text-gray-900">Configuration Appliquée</h3>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
              <Badge variant="secondary">Style: {config.style}</Badge>
              <Badge variant="secondary">Layout: {config.layout}</Badge>
              <Badge variant="secondary">Couleur: {config.colorScheme}</Badge>
              <Badge variant="secondary">{config.contentLength}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Landing Page Status */}
      {!loadingExisting && existingLanding && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-sm">Version existante</p>
              <p className="text-xs text-muted-foreground">
                v{existingLanding.version} • {new Date(existingLanding.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant={existingLanding.last_synced_at ? "default" : "secondary"} className="text-xs">
            {existingLanding.last_synced_at ? "Sync" : "Non sync"}
          </Badge>
        </div>
      )}

      {/* Progress Section */}
      {loading && (
        <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-700">🚀 Génération en cours</h3>
              <p className="text-xs text-gray-600 animate-pulse">{progressMessage}</p>
            </div>
          </div>

          <div className="relative">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Début</span>
              <span>{progress}%</span>
              <span>Terminé</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-3">
            <Badge variant="secondary" className="text-xs">
              🎨 {config.style}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              🧱 {config.layout}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              📱 Mobile-First
            </Badge>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-700 text-sm">Erreur de génération</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {htmlContent && !loading && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 text-sm">✅ Landing page générée</p>
                <p className="text-xs text-green-600">Avec votre configuration • Optimisée mobile</p>
              </div>
            </div>
          </div>

          {/* Preview Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Aperçu
              </h3>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="mobile" className="text-xs px-3">
                    <Smartphone className="h-3 w-3 mr-1" />
                    Mobile
                  </TabsTrigger>
                  <TabsTrigger value="desktop" className="text-xs px-3">
                    <Monitor className="h-3 w-3 mr-1" />
                    Desktop
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleDownloadHTML} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                <Download className="w-4 h-4" />
                Télécharger HTML
              </Button>

              <Button onClick={handleSyncToShopify} disabled={syncing} size="sm" className="gap-2 flex-1 sm:flex-none">
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sync Shopify
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Container */}
          <div
            className={`border-2 rounded-xl overflow-auto bg-white shadow-inner ${
              previewMode === "mobile"
                ? "max-w-[375px] mx-auto p-4 max-h-[600px] border-blue-200"
                : "w-full p-4 max-h-[500px] border-gray-200"
            }`}
          >
            <div
              className={`${previewMode === "mobile" ? "scale-90 origin-top" : ""}`}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && !htmlContent && !error && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
          <Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm mb-3">Prêt à générer avec votre configuration</p>
          <Button onClick={handleGenerate} className="gap-2">
            <Zap className="w-4 h-4" />
            Générer Landing Page
          </Button>
        </div>
      )}
    </div>
  );
}
