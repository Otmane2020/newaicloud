import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, Smartphone, Eye, CheckCircle2, Sparkles, X } from "lucide-react";
import { responsiveDialogClasses, responsivePadding } from "@/lib/dialogUtils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  title: string;
  description?: string | null;
  seo_title?: string;
  seo_description?: string;
  image_url?: string;
  vendor?: string | null;
}

interface ProductTitleLandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  isGenerating: boolean;
  currentProcessing?: { index: number; total: number; title: string; vendor?: string | null } | null;
  onCancel?: () => void;
  onSync: () => void;
  syncLoading?: boolean;
}

// Calculate quality score based on content optimization
const calculateQualityScore = (title: string, description: string): number => {
  let score = 0;

  // Title quality (30 points)
  if (title) {
    const titleLength = title.length;
    if (titleLength >= 50 && titleLength <= 60) score += 30;
    else if (titleLength >= 40 && titleLength <= 70) score += 20;
    else if (titleLength >= 30) score += 10;
  }

  // Description quality (40 points)
  if (description) {
    const descLength = description.length;
    if (descLength >= 140 && descLength <= 160) score += 40;
    else if (descLength >= 120 && descLength <= 180) score += 30;
    else if (descLength >= 100) score += 20;
  }

  // Marketing keywords (30 points)
  const marketingKeywords = [
    "qualité",
    "premium",
    "professionnel",
    "élégant",
    "moderne",
    "durable",
    "design",
    "exclusif",
  ];
  const combinedText = `${title} ${description}`.toLowerCase();
  const keywordCount = marketingKeywords.filter((kw) => combinedText.includes(kw)).length;
  score += Math.min(30, keywordCount * 5);

  return Math.min(100, score);
};

// Get Shopify product URL
const getShopifyProductUrl = async (product: Product): Promise<string | null> => {
  try {
    const { data: connection } = await supabase
      .from('shopify_connections')
      .select('store_url')
      .eq('is_active', true)
      .single();
    
    if (!connection?.store_url) return null;
    
    const { data: shopifyProduct } = await supabase
      .from('shopify_products')
      .select('handle')
      .eq('id', product.id)
      .single();
    
    if (!shopifyProduct?.handle) return null;
    
    const storeUrl = connection.store_url.replace(/\/$/, '');
    return `${storeUrl}/products/${shopifyProduct.handle}`;
  } catch (error) {
    console.error('Error getting Shopify URL:', error);
    return null;
  }
};

// Generate rich HTML preview from product description or fallback to simple version
const generateHtmlPreview = (product: Product, shopifyUrl?: string | null): string => {
  const title = product.seo_title || product.title;
  const description = product.seo_description || "";
  let htmlDescription = product.description || "";
  const imageUrl = product.image_url || "";

  // Remove any existing "Voir sur Shopify" buttons from the HTML to avoid duplicates
  if (htmlDescription) {
    // Remove buttons with "Voir sur Shopify" text
    htmlDescription = htmlDescription.replace(
      /<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?Voir sur Shopify[\s\S]*?<\/div>/gi,
      ''
    );
    htmlDescription = htmlDescription.replace(
      /<a[^>]*>[\s\S]*?Voir sur Shopify[\s\S]*?<\/a>/gi,
      ''
    );
  }

  // Create the Shopify button HTML
  const shopifyButtonHtml = shopifyUrl ? `
    <div style="text-align: center; margin-top: 3rem; padding: 2rem 0;">
      <a href="${shopifyUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 0.75rem; padding: 1.25rem 2.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.75rem; font-weight: 600; font-size: 1.25rem; text-decoration: none; box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3h18v18H3V3z"/>
          <path d="M9 9h6v6H9V9z"/>
        </svg>
        <span>Voir sur Shopify</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 3L14 10L7 17" />
        </svg>
      </a>
    </div>
  ` : '';

  // If we have a rich HTML description in the description field, use it directly
  if (htmlDescription && (htmlDescription.includes("<div") || htmlDescription.includes("<section") || htmlDescription.includes("<h1"))) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${htmlDescription}
        ${shopifyButtonHtml}
      </div>
    `;
  }

  // Otherwise, generate a preview from available data
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
      ${
        imageUrl
          ? `
        <div style="margin-bottom: 2rem; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; display: block;" />
        </div>
      `
          : ""
      }
      
      <h1 style="font-size: 2.5rem; font-weight: 700; color: #1a1a1a; margin-bottom: 1.5rem; line-height: 1.2;">
        ${title}
      </h1>
      
      <div style="font-size: 1.125rem; color: #4a5568; line-height: 1.75; margin-bottom: 2rem; white-space: pre-wrap;">
        ${description}
      </div>
      
      ${
        htmlDescription && htmlDescription !== description
          ? `
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e2e8f0;">
          <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Détails du produit</h2>
          <div style="color: #4a5568; line-height: 1.75;">
            ${htmlDescription}
          </div>
        </div>
      `
          : ""
      }
      
      ${shopifyButtonHtml}
    </div>
  `;
};

export function ProductTitleLandingDialog({
  open,
  onOpenChange,
  products,
  isGenerating,
  currentProcessing,
  onCancel,
  onSync,
  syncLoading = false,
}: ProductTitleLandingDialogProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "360">("desktop");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [shopifyUrls, setShopifyUrls] = useState<Map<string, string>>(new Map());

  // Load Shopify URLs for products
  useEffect(() => {
    const loadShopifyUrls = async () => {
      const urlMap = new Map<string, string>();
      for (const product of products) {
        const url = await getShopifyProductUrl(product);
        if (url) {
          urlMap.set(product.id, url);
        }
      }
      setShopifyUrls(urlMap);
    };

    if (products.length > 0 && !isGenerating) {
      loadShopifyUrls();
    }
  }, [products, isGenerating]);

  // Smooth progress animation based on currentProcessing
  useEffect(() => {
    if (!isGenerating || !currentProcessing) {
      return;
    }

    const targetProgress = (currentProcessing.index / currentProcessing.total) * 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.1; // Smooth easing
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isGenerating, currentProcessing]);

  const selectedProduct = products[selectedProductIndex];
  const qualityScore =
    selectedProduct?.seo_title && selectedProduct?.seo_description
      ? calculateQualityScore(selectedProduct.seo_title, selectedProduct.seo_description)
      : 0;

  // Get Shopify URL synchronously for immediate display
  const [currentShopifyUrl, setCurrentShopifyUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadCurrentUrl = async () => {
      if (!selectedProduct) return;
      
      // Try from cached map first
      const cachedUrl = shopifyUrls.get(selectedProduct.id);
      if (cachedUrl) {
        setCurrentShopifyUrl(cachedUrl);
        return;
      }
      
      // Otherwise load it fresh
      const url = await getShopifyProductUrl(selectedProduct);
      setCurrentShopifyUrl(url);
    };
    
    loadCurrentUrl();
  }, [selectedProduct, shopifyUrls]);

  const htmlPreview = selectedProduct ? generateHtmlPreview(selectedProduct, currentShopifyUrl) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${responsiveDialogClasses.xlarge} ${responsivePadding.large} max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
            Aperçu Contenu Produit Optimisé
          </DialogTitle>
          <DialogDescription>
            {isGenerating
              ? currentProcessing
                ? `Génération ${currentProcessing.index}/${currentProcessing.total}: ${currentProcessing.title.substring(0, 50)}...`
                : "Génération du contenu SEO optimisé en cours..."
              : `${products.length} produit(s) optimisé(s) - Vérifiez le contenu avant synchronisation`}
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Sparkles className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>

            {currentProcessing && (
              <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-semibold text-primary truncate px-4">
                  {currentProcessing.title.substring(0, 50)}...
                </p>
                {currentProcessing.vendor && (
                  <p className="text-xs text-muted-foreground">
                    Marque: <span className="font-medium">{currentProcessing.vendor}</span>
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="animate-pulse">●</span>
                  <span>Analyse IA</span>
                  <span className="animate-pulse delay-75">●</span>
                  <span>Génération SEO</span>
                  <span className="animate-pulse delay-150">●</span>
                  <span>Création HTML</span>
                </div>
              </div>
            )}

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {currentProcessing ? `${currentProcessing.index}/${currentProcessing.total}` : "En cours..."}
                </span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentProcessing && currentProcessing.total - currentProcessing.index > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {currentProcessing.total - currentProcessing.index} restant(s)
                </p>
              )}
            </div>

            {onCancel && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Selector */}
            {products.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {products.map((product, index) => (
                  <Button
                    key={product.id}
                    variant={selectedProductIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProductIndex(index)}
                    className="whitespace-nowrap"
                  >
                    {product.title}
                  </Button>
                ))}
              </div>
            )}

            {/* Quality Score */}
            {qualityScore > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Score Qualité</span>
                  <Badge
                    variant={qualityScore >= 80 ? "default" : qualityScore >= 60 ? "secondary" : "outline"}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {qualityScore}/100
                  </Badge>
                </div>
                <Progress value={qualityScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {qualityScore >= 80 && "Excellent - Contenu riche avec structure optimale et médias"}
                  {qualityScore >= 60 && qualityScore < 80 && "Bon - Contenu structuré avec potentiel d'amélioration"}
                  {qualityScore < 60 && "À améliorer - Enrichir le contenu et la structure"}
                </p>
              </div>
            )}

            {/* Preview Mode Toggle */}
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="desktop">
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </TabsTrigger>
                <TabsTrigger value="360">
                  <Eye className="h-4 w-4 mr-2" />
                  Contenu Détaillé
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desktop" className="space-y-4">
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  {selectedProduct && htmlPreview ? (
                    <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-center py-12">
                      <div className="space-y-3">
                        <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground font-medium">Aucun contenu généré</p>
                        <p className="text-sm text-muted-foreground">
                          Sélectionnez des produits et cliquez sur "Optimiser" pour générer le contenu
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4">
                <div className="max-w-md mx-auto border rounded-lg p-4 bg-white min-h-[400px]">
                  {selectedProduct && htmlPreview ? (
                    <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-center py-12">
                      <div className="space-y-3">
                        <Smartphone className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground font-medium">Aucun contenu généré</p>
                        <p className="text-sm text-muted-foreground">
                          Générez le contenu optimisé pour voir l'aperçu mobile
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="360" className="space-y-4">
                {selectedProduct ? (
                  <div className="border rounded-lg p-6 bg-muted min-h-[400px] space-y-6">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Titre SEO Optimisé</h3>
                      <p className="text-base font-medium">
                        {selectedProduct.seo_title || selectedProduct.title || "Aucun titre"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedProduct.seo_title || selectedProduct.title || "").length} caractères
                        {(selectedProduct.seo_title || selectedProduct.title || "").length >= 50 &&
                          (selectedProduct.seo_title || selectedProduct.title || "").length <= 60 &&
                          " ✓ Longueur idéale SEO (50-60 car)"}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Marque / Vendor</h3>
                      <p className="text-base font-medium">
                        {selectedProduct.vendor || "Non définie"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Marque du produit générée automatiquement
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Meta Description SEO</h3>
                      <p className="text-sm leading-relaxed">
                        {selectedProduct.seo_description || "Aucune description"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedProduct.seo_description || "").length} caractères
                        {(selectedProduct.seo_description || "").length >= 140 &&
                          (selectedProduct.seo_description || "").length <= 160 &&
                          " ✓ Longueur optimale SEO (140-160 car)"}
                      </p>
                    </div>

                    {selectedProduct.image_url ? (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Image produit</h3>
                        <div className="w-32 h-32 rounded-lg overflow-hidden border">
                          <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Image produit</h3>
                        <div className="w-32 h-32 rounded-lg overflow-hidden border bg-muted-foreground/10 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Aucune image</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 bg-muted min-h-[400px] flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground font-medium">Aucun contenu disponible</p>
                      <p className="text-sm text-muted-foreground">Générez le contenu SEO pour voir les détails</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating || syncLoading}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            onClick={onSync}
            disabled={isGenerating || syncLoading || products.length === 0}
            className="w-full sm:w-auto"
          >
            {syncLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Synchroniser avec Shopify ({products.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
