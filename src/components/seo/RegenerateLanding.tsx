import { useState, useEffect } from "react";
import { Loader2, Eye, Monitor, Smartphone, Download, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LandingConfig } from "./LandingConfigDialog";

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
  onClose 
}: RegenerateLandingProps) {
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
   * ✨ Generate Landing via AI with Progress
   -----------------------------*/
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage("Préparation de la génération...");

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(15);
      setProgressMessage("Analyse du produit et de l'image...");

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(30);
      setProgressMessage("Génération du contenu IA...");

      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.description,
          style: config.style,
          mainColor: config.colorScheme,
          layout: config.layout,
          length: config.contentLength,
        },
      });

      setProgress(60);
      setProgressMessage("Traitement de la réponse IA...");

      if (error) throw error;
      if (data?.error) {
        const message = data.error.includes("Rate limits")
          ? "Limite de requêtes atteinte. Veuillez réessayer plus tard."
          : data.error.includes("Payment required")
            ? "Crédits IA épuisés. Contactez le support pour plus d'informations."
            : data.error.includes("LIMIT_REACHED")
              ? "Limite d'optimisations atteinte. Passez à un plan supérieur."
              : data.error;
        setError(message);
        toast.error(message);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(90);
      setProgressMessage("Finalisation du rendu HTML...");

      if (data?.html?.trim()) {
        setHtmlContent(data.html);
        setProgress(100);
        setProgressMessage("✅ Landing page générée avec succès !");
        toast.success("Landing page générée avec succès !");
        onGenerated?.(data.html);
      } else {
        throw new Error("Aucun contenu généré. Essayez avec un autre style ou layout.");
      }
    } catch (err: any) {
      console.error("Error generating landing:", err);
      const errorMsg = err?.message || "Erreur lors de la génération de la landing page.";
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

    toast.success("HTML téléchargé avec succès !");
  };

  /** ----------------------------
   * 🔄 Sync to Shopify
   -----------------------------*/
  const handleSyncToShopify = async () => {
    if (!htmlContent) return toast.error("Aucun contenu à synchroniser");

    try {
      setSyncing(true);
      toast.info("Synchronisation vers Shopify en cours...");

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

      toast.success("Landing page synchronisée avec succès !");
      if (data?.pageUrl) toast.info(`Page disponible sur : ${data.pageUrl}`, { duration: 10000 });
    } catch (err: any) {
      console.error("Error syncing to Shopify:", err);
      toast.error(err?.message || "Erreur lors de la synchronisation vers Shopify");
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
              <h3 className="font-semibold text-lg">Génération en cours...</h3>
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
              <p className="font-semibold text-destructive">Erreur de génération</p>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
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
          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Landing page générée avec succès !</p>
                <p className="text-sm text-muted-foreground">Utilisez les boutons ci-dessous pour prévisualiser, télécharger ou synchroniser.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Aperçu de la Landing Page
            </h3>
            <div className="flex flex-wrap gap-2">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}>
                <TabsList>
                  <TabsTrigger value="desktop">
                    <Monitor className="h-4 w-4 mr-1" /> Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile">
                    <Smartphone className="h-4 w-4 mr-1" /> Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button onClick={handleDownloadHTML} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger
              </Button>

              <Button onClick={handleSyncToShopify} disabled={syncing} size="sm" className="gap-2">
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

          <div
            className={`border rounded-xl overflow-auto bg-white shadow-inner transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-md mx-auto p-4" : "p-8 max-h-[650px]"
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
          <p className="text-sm">Initialisation de la génération...</p>
        </div>
      )}
    </div>
  );
}
