import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText, ExternalLink, Sparkles, Monitor, Smartphone, AlertTriangle } from "lucide-react";
import { responsiveDialogClasses } from "@/lib/dialogUtils";
import { ShopifyThemeGuide } from "@/components/shopify/ShopifyThemeGuide";

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
  onGenerateClick?: () => void;
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
  onGenerateClick,
}: LandingPagePreviewDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showThemeGuide, setShowThemeGuide] = useState(false);
  const [themeCssAdded, setThemeCssAdded] = useState(false);
  const [viewShopifyMode, setViewShopifyMode] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Check if user has added Shopify theme CSS
  useEffect(() => {
    checkThemeCssStatus();
  }, []);

  const checkThemeCssStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('shopify_theme_css_added')
          .eq('user_id', user.id)
          .single();
        
        if (data?.shopify_theme_css_added) {
          setThemeCssAdded(true);
        }
      }
    } catch (error) {
      console.error("Error checking theme CSS status:", error);
    }
  };

  // Add Shopify CSS to preview
  const SHOPIFY_FULLWIDTH_CSS = `
    .product__info-wrapper,
    .product__description,
    .product__description * {
        width: 100% !important;
        max-width: 100% !important;
    }
    .product__info-container {
        display: block !important;
    }
    .product__media-wrapper,
    .product__media {
        width: 100% !important;
        max-width: 100% !important;
    }
    @media(min-width: 768px) {
      .product--large .product__outer {
          grid-template-columns: 1fr !important;
      }
    }
  `;

  const getPreviewHtml = () => {
    if (!currentLandingPage) {
      console.log("No landing page content available");
      return "";
    }
    
    console.log("Landing page content length:", currentLandingPage.length);
    console.log("First 200 chars:", currentLandingPage.substring(0, 200));
    
    let htmlContent = currentLandingPage;
    
    // Ensure proper HTML structure
    if (!htmlContent.includes("<!DOCTYPE") && !htmlContent.includes("<html")) {
      console.log("Adding HTML structure wrapper");
      htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body style="margin: 0; padding: 0; background: white;">
${htmlContent}
</body>
</html>`;
    }
    
    // If Shopify mode is enabled, inject the CSS
    if (viewShopifyMode) {
      htmlContent = htmlContent.replace(
        "</head>",
        `<style>${SHOPIFY_FULLWIDTH_CSS}</style></head>`
      );
    }
    
    return htmlContent;
  };

  // Sync to Shopify mutation
  const syncMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      // Check if theme CSS has been added before syncing
      if (!themeCssAdded) {
        setShowThemeGuide(true);
        throw new Error("Theme CSS not configured");
      }
      
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
    onError: (error: any) => {
      if (error.message !== "Theme CSS not configured") {
        console.error("Sync error:", error);
        toast.error("Erreur lors de la synchronisation");
      }
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
          {currentLandingPage && (
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Landing Page - {productTitle}
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
                      >
                        {viewMode === "desktop" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{viewMode === "desktop" ? "Voir en mobile" : "Voir en desktop"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewShopifyMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewShopifyMode(!viewShopifyMode)}
                      >
                        {viewShopifyMode ? "Vue Shopify" : "Vue brute"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {viewShopifyMode ? "Voir sans CSS Shopify" : "Simuler rendu Shopify"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!currentLandingPage}>
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
                    onClick={() => window.open(productUrl, "_blank")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visualiser en ligne
                  </Button>
                )}
              </div>
            </DialogTitle>
          )}
        </DialogHeader>

        {!themeCssAdded && currentLandingPage && (
          <Alert className="mx-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              <strong>Configuration requise:</strong> Pour que vos landing pages s'affichent correctement sur Shopify, 
              vous devez ajouter un CSS personnalisé à votre thème.{" "}
              <button 
                onClick={() => setShowThemeGuide(true)}
                className="underline font-semibold hover:text-orange-900"
              >
                Voir le guide
              </button>
            </AlertDescription>
          </Alert>
        )}

        <div className="h-[calc(90vh-200px)] overflow-auto bg-background px-6">
          {currentLandingPage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {isIframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Chargement de la preview...</p>
                  </div>
                </div>
              )}
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <Alert className="max-w-md border-destructive">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">Erreur de chargement</p>
                      <p className="text-sm">Le contenu HTML ne peut pas être affiché. Vérifiez les logs de la console.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => {
                          setIframeError(false);
                          setIsIframeLoading(true);
                        }}
                      >
                        Réessayer
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <iframe
                srcDoc={getPreviewHtml()}
                className={`h-full border-0 transition-all duration-300 ${
                  viewMode === "mobile" ? "w-[375px] border-2 border-border rounded-lg shadow-xl" : "w-full"
                }`}
                sandbox="allow-same-origin allow-scripts"
                title="Landing Page Preview"
                onLoad={(e) => {
                  console.log("Iframe loaded");
                  setIsIframeLoading(false);
                  setIframeError(false);
                  
                  const iframeDoc = (e.target as HTMLIFrameElement).contentDocument;
                  if (iframeDoc) {
                    console.log("Iframe document accessible");
                    console.log("Body content:", iframeDoc.body?.innerHTML?.substring(0, 200));
                    
                    const checkTailwind = setInterval(() => {
                      if (iframeDoc.body?.classList.contains("tailwind-loaded")) {
                        clearInterval(checkTailwind);
                      }
                    }, 50);
                    setTimeout(() => clearInterval(checkTailwind), 3000);
                  } else {
                    console.error("Cannot access iframe document");
                    setIframeError(true);
                  }
                }}
                onError={(e) => {
                  console.error("Iframe error:", e);
                  setIsIframeLoading(false);
                  setIframeError(true);
                  toast.error("Erreur lors du chargement de la preview");
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center p-8 max-w-md">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-3xl" />
                  <FileText className="h-20 w-20 mx-auto text-muted-foreground/50 relative" />
                </div>
                <p className="font-semibold text-lg mb-2">Aucune landing page disponible</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Créez une landing page optimisée pour ce produit et visualisez-la instantanément
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    if (onGenerateClick) {
                      onGenerateClick();
                    }
                  }}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Générer ma Landing Page
                </Button>
                <p className="text-xs mt-4 text-muted-foreground/70">La génération prend quelques secondes</p>
              </div>
            </div>
          )}
        </div>

        <ShopifyThemeGuide
          open={showThemeGuide}
          onOpenChange={setShowThemeGuide}
          onConfirm={() => {
            setThemeCssAdded(true);
            setShowThemeGuide(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
