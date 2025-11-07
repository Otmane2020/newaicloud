import { useState } from "react";
import { Sparkles, Loader2, Eye, Monitor, Smartphone, Download, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RegenerateLandingProps {
  product: any;
  onGenerated?: (html: string) => void;
}

export default function RegenerateLanding({ product, onGenerated }: RegenerateLandingProps) {
  const [loading, setLoading] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [styleChoice, setStyleChoice] = useState("moderne");
  const [color, setColor] = useState("#f8f8f8");
  const [layout, setLayout] = useState("2 colonnes");
  const [length, setLength] = useState("moyenne (800 mots)");
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

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
          layout: layout,
          length: length
        },
      });

      if (error) throw error;
      
      if (data.error) {
        if (data.error.includes("Rate limits exceeded")) {
          toast.error("Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.");
        } else if (data.error.includes("Payment required")) {
          toast.error("Crédits Lovable AI épuisés. Veuillez recharger votre compte.");
        } else {
          toast.error(data.error);
        }
        setLoading(false);
        return;
      }

      if (data.html && data.html.trim()) {
        setHtmlContent(data.html);
        toast.success("Landing page générée avec succès !");
      } else {
        toast.error("Aucun contenu généré. Veuillez réessayer.");
      }
      
      if (onGenerated && data.html) {
        onGenerated(data.html);
      }
    } catch (error: any) {
      console.error("Error generating landing:", error);
      toast.error(error?.message || "Erreur lors de la génération de la landing page.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = () => {
    if (!htmlContent) {
      toast.error("Aucun contenu à télécharger");
      return;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_landing.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML téléchargé avec succès !");
  };

  const handleSyncToShopify = async () => {
    if (!htmlContent) {
      toast.error("Aucun contenu à synchroniser");
      return;
    }

    try {
      setSyncingToShopify(true);
      toast.info("Synchronisation vers Shopify en cours...");

      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          htmlContent: htmlContent,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Landing page synchronisée vers Shopify avec succès !");
      if (data.pageUrl) {
        toast.info(`Page disponible sur : ${data.pageUrl}`, {
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error("Error syncing to Shopify:", error);
      toast.error(error?.message || "Erreur lors de la synchronisation vers Shopify");
    } finally {
      setSyncingToShopify(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border-2 border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Génération IA de Landing Page</h2>
            <p className="text-sm text-muted-foreground">Personnalisez le style et générez une page optimisée</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🎨</span>
              Style visuel
            </Label>
            <Select value={styleChoice} onValueChange={setStyleChoice}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🎨</span>
              Couleur principale
            </Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 rounded-lg border-2 border-border cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🧱</span>
              Layout
            </Label>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 colonne">1 colonne (centré)</SelectItem>
                <SelectItem value="2 colonnes">2 colonnes (image + texte)</SelectItem>
                <SelectItem value="hero à gauche">Hero image à gauche</SelectItem>
                <SelectItem value="hero à droite">Hero image à droite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">✏️</span>
              Longueur du contenu
            </Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courte (400 mots)">Courte (400 mots)</SelectItem>
                <SelectItem value="moyenne (800 mots)">Moyenne (800 mots)</SelectItem>
                <SelectItem value="longue (1500 mots)">Longue (1500 mots)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-12 text-base font-semibold gap-3"
          size="lg"
        >
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

      {htmlContent && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Aperçu de la Landing Page
            </h3>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="flex-shrink-0">
                <TabsList>
                  <TabsTrigger value="desktop">
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                onClick={handleDownloadHTML}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <Download className="w-4 h-4" />
                Télécharger HTML
              </Button>
              <Button
                onClick={handleSyncToShopify}
                disabled={syncingToShopify}
                className="gap-2"
                size="sm"
              >
                {syncingToShopify ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sync vers Shopify
                  </>
                )}
              </Button>
            </div>
          </div>

          {previewMode === 'desktop' ? (
            <div className="border-2 border-border rounded-xl p-8 bg-white overflow-auto max-h-[600px]">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          ) : (
            <div className="max-w-md mx-auto border-2 border-border rounded-xl p-4 bg-white overflow-auto max-h-[600px]">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
