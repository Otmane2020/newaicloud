import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { MinimizableProgressDialog } from "@/components/seo/MinimizableProgressDialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

interface Product {
  id: string;
  title: string;
  description?: string | null;
  seo_title?: string;
  seo_description?: string;
  image_url?: string;
}

interface ProductTitleLandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  isGenerating: boolean;
  currentProcessing?: { index: number; total: number; title: string } | null;
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

// Generate rich HTML preview from product description or fallback to simple version
const generateHtmlPreview = (product: Product): string => {
  const title = product.seo_title || product.title;
  const description = product.seo_description || "";
  const htmlDescription = product.description || "";
  const imageUrl = product.image_url || "";

  // If we have a rich HTML description in the description field, use it directly
  if (htmlDescription && (htmlDescription.includes("<div") || htmlDescription.includes("<section"))) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${htmlDescription}
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
      
      <div style="display: inline-flex; gap: 1rem; padding: 1rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem; font-weight: 600; font-size: 1.125rem; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); margin-top: 2rem;">
        <span>Voir sur Shopify</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 3L14 10L7 17" />
        </svg>
      </div>
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
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Show full preview when generation completes
  useEffect(() => {
    if (!isGenerating && products.length > 0 && !showFullPreview) {
      setShowFullPreview(true);
    }
  }, [isGenerating, products.length, showFullPreview]);

  const selectedProduct = products[selectedProductIndex];
  const qualityScore =
    selectedProduct?.seo_title && selectedProduct?.seo_description
      ? calculateQualityScore(selectedProduct.seo_title, selectedProduct.seo_description)
      : 0;

  const htmlPreview = selectedProduct ? generateHtmlPreview(selectedProduct) : "";

  return (
    <MinimizableProgressDialog
      open={open}
      onOpenChange={onOpenChange}
      isProcessing={isGenerating}
      currentProcessing={currentProcessing}
      onCancel={onCancel}
      onComplete={() => setShowFullPreview(true)}
      title="Aperçu Contenu Produit Optimisé"
    >
      {!isGenerating && showFullPreview && (
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={syncLoading}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            <Button
              onClick={onSync}
              disabled={syncLoading || products.length === 0}
              className="w-full sm:w-auto"
            >
              {syncLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Synchroniser avec Shopify ({products.length})
            </Button>
          </div>
        </div>
      )}
    </MinimizableProgressDialog>
  );
}
