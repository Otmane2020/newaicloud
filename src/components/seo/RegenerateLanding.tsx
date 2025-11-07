import { useState } from "react";
import { Sparkles, Loader2, Eye, Monitor, Smartphone, Download, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RegenerateLandingProps {
  product: {
    id: string;
    title: string;
    handle?: string;
    description?: string;
    image_url?: string;
  };
  onGenerated?: (html: string) => void;
}

export default function RegenerateLanding({ product, onGenerated }: RegenerateLandingProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [styleChoice, setStyleChoice] = useState("moderne");
  const [color, setColor] = useState("#f8f8f8");
  const [layout, setLayout] = useState("2 colonnes");
  const [length, setLength] = useState("moyenne (800 mots)");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  /** ----------------------------
   * ✨ Generate Landing via AI
   -----------------------------*/
  const handleGenerate = async () => {
    try {
      setLoading(true);
      toast.info("Génération IA en cours...");

      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.description,
          style: styleChoice,
          mainColor: color,
          layout,
          length,
        },
      });

      if (error) throw error;
      if (data?.error) {
        const message = data.error.includes("Rate limits")
          ? "Limite de requêtes atteinte. Veuillez réessayer plus tard."
          : data.error.includes("Payment required")
            ? "Crédits Lovable AI épuisés. Veuillez recharger votre compte."
            : data.error;
        toast.error(message);
        return;
      }

      if (data?.html?.trim()) {
        setHtmlContent(data.html);
        toast.success("Landing page générée avec succès !");
        onGenerated?.(data.html);
      } else {
        toast.warning("Aucun contenu généré. Essayez avec un autre style ou layout.");
      }
    } catch (err: any) {
      console.error("Error generating landing:", err);
      toast.error(err?.message || "Erreur lors de la génération de la landing page.");
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
      {/* Config Panel */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Génération IA de Landing Page</h2>
            <p className="text-sm text-muted-foreground">
              Choisissez le style, les couleurs et le format avant de générer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Style */}
          <div className="space-y-1.5">
            <Label>🎨 Style visuel</Label>
            <Select value={styleChoice} onValueChange={setStyleChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderne">Moderne</SelectItem>
                <SelectItem value="minimaliste">Minimaliste</SelectItem>
                <SelectItem value="scandinave">Scandinave</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="neutre">Neutre</SelectItem>
                <SelectItem value="coloré">Coloré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>🎨 Couleur principale</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 rounded-md border cursor-pointer"
            />
          </div>

          {/* Layout */}
          <div className="space-y-1.5">
            <Label>🧱 Layout</Label>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 colonne">1 colonne (centré)</SelectItem>
                <SelectItem value="2 colonnes">2 colonnes (image + texte)</SelectItem>
                <SelectItem value="hero à gauche">Hero image à gauche</SelectItem>
                <SelectItem value="hero à droite">Hero image à droite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Length */}
          <div className="space-y-1.5">
            <Label>✏️ Longueur du contenu</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une longueur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courte (400 mots)">Courte (400 mots)</SelectItem>
                <SelectItem value="moyenne (800 mots)">Moyenne (800 mots)</SelectItem>
                <SelectItem value="longue (1500 mots)">Longue (1500 mots)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full font-semibold gap-3">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Générer la Landing Page IA
            </>
          )}
        </Button>
      </div>

      {/* Preview Section */}
      {htmlContent ? (
        <div className="space-y-4">
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
      ) : (
        <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/10">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary/70" />
          <p className="text-sm">
            Configurez les options ci-dessus puis cliquez sur <strong>Générer</strong> pour créer votre landing page.
          </p>
        </div>
      )}
    </div>
  );
}
