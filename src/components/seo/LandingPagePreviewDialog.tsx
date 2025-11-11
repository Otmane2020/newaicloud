import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import { responsiveDialogClasses } from "@/lib/dialogUtils";

interface LandingPagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  productHandle: string;
  currentLandingPage?: string;
}

export function LandingPagePreviewDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  productHandle,
  currentLandingPage,
}: LandingPagePreviewDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);

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
      toast.success("Landing page synchronisée avec Shopify", {
        description: data.productUrl ? `Lien: ${data.productUrl}` : undefined,
      });
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

        <div className="h-[calc(90vh-200px)] overflow-auto bg-white">
          {currentLandingPage ? (
            <iframe
              srcDoc={currentLandingPage}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              title="Landing Page Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium">Aucune landing page disponible</p>
                <p className="text-sm mt-2">Générez une landing page pour voir l'aperçu</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
