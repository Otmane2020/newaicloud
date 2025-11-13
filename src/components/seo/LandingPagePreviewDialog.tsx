import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText, ExternalLink, Search } from "lucide-react";
import { responsiveDialogClasses } from "@/lib/dialogUtils";
import { GoogleSearchPreview } from "./GoogleSearchPreview";

interface LandingPagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  productHandle: string;
  currentLandingPage?: string;
  seoTitle?: string;
  seoDescription?: string;
  storeUrl?: string;
}

export function LandingPagePreviewDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  productHandle,
  currentLandingPage,
  seoTitle,
  seoDescription,
  storeUrl,
}: LandingPagePreviewDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [productUrl, setProductUrl] = useState<string | null>(null);

  // Sync to Shopify mutation
  const syncMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      setIsSyncing(true);
      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId,
          productTitle,
          productHandle,
          htmlContent,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Landing page synchronisée avec Shopify");
      if (data.productUrl) {
        setProductUrl(data.productUrl);
      }
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast.error("Erreur lors de la synchronisation");
      setIsSyncing(false);
    },
  });

  const handleDownload = () => {
    if (!currentLandingPage) return;
    const blob = new Blob([currentLandingPage], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `landing-page-${productTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${responsiveDialogClasses.xxlarge} max-h-[90vh] p-0`}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Landing Page - {productTitle}
            </div>
            {currentLandingPage && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!currentLandingPage}
                >
                  Télécharger HTML
                </Button>
                {!productUrl ? (
                  <Button
                    onClick={() => syncMutation.mutate(currentLandingPage)}
                    disabled={isSyncing || !currentLandingPage}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Synchronisation...
                      </>
                    ) : (
                      "Synchroniser avec Shopify"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(productUrl, '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visualiser en ligne
                  </Button>
                )}
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentLandingPage
              ? "Prévisualisez et synchronisez votre landing page avec Shopify"
              : "Aucune landing page générée pour ce produit"
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="h-[calc(90vh-200px)]">
          <TabsList className="mx-6 mb-2">
            <TabsTrigger value="preview" className="gap-2">
              <FileText className="h-4 w-4" />
              Aperçu complet
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2">
              <Search className="h-4 w-4" />
              Aperçu Google
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="h-[calc(100%-48px)] px-6 overflow-auto">
            <div className="py-4">
              <GoogleSearchPreview
                title={seoTitle || productTitle}
                description={seoDescription || "Description manquante"}
                url={storeUrl ? `${storeUrl}/products/${productHandle}` : `https://yourstore.com/products/${productHandle}`}
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="h-[calc(100%-48px)] overflow-auto bg-background">
            {currentLandingPage ? (
              <div className="relative w-full h-full">
                <iframe
                  srcDoc={currentLandingPage}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  title="Landing Page Preview"
                  onLoad={(e) => {
                    const iframeDoc = (e.target as HTMLIFrameElement).contentDocument;
                    if (iframeDoc) {
                      const checkTailwind = setInterval(() => {
                        if (iframeDoc.body?.classList.contains('tailwind-loaded')) {
                          clearInterval(checkTailwind);
                        }
                      }, 50);
                      setTimeout(() => clearInterval(checkTailwind), 3000);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="font-medium">Aucune landing page disponible</p>
                  <p className="text-sm mt-2">Générez une landing page pour voir l'aperçu</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">La landing page sera créée automatiquement si elle n'existe pas encore</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
