import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, Smartphone, Eye, CheckCircle2, Sparkles } from "lucide-react";
import { responsiveDialogClasses, responsivePadding } from "@/lib/dialogUtils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Product {
  id: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  image_url?: string;
}

interface ProductTitleLandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  isGenerating: boolean;
  onSync: () => void;
  syncLoading?: boolean;
}

// Calculate quality score based on SEO content
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
  
  // SEO keywords (30 points)
  const seoKeywords = ['qualité', 'premium', 'professionnel', 'élégant', 'moderne', 'durable', 'design', 'exclusif'];
  const combinedText = `${title} ${description}`.toLowerCase();
  const keywordCount = seoKeywords.filter(kw => combinedText.includes(kw)).length;
  score += Math.min(30, keywordCount * 5);
  
  return Math.min(100, score);
};

// Generate simple HTML preview from title and description
const generateHtmlPreview = (product: Product): string => {
  const title = product.seo_title || product.title;
  const description = product.seo_description || '';
  const imageUrl = product.image_url || '';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto;">
      ${imageUrl ? `
        <div style="margin-bottom: 2rem; border-radius: 0.75rem; overflow: hidden;">
          <img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; display: block;" />
        </div>
      ` : ''}
      
      <h1 style="font-size: 2.5rem; font-weight: 700; color: #1a1a1a; margin-bottom: 1.5rem; line-height: 1.2;">
        ${title}
      </h1>
      
      <div style="font-size: 1.125rem; color: #4a5568; line-height: 1.75; margin-bottom: 2rem;">
        ${description}
      </div>
      
      <div style="display: inline-flex; gap: 1rem; padding: 1rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem; font-weight: 600; font-size: 1.125rem; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
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
  onSync,
  syncLoading = false
}: ProductTitleLandingDialogProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | '360'>('desktop');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  
  const selectedProduct = products[selectedProductIndex];
  const qualityScore = selectedProduct?.seo_title && selectedProduct?.seo_description
    ? calculateQualityScore(selectedProduct.seo_title, selectedProduct.seo_description)
    : 0;
  
  const htmlPreview = selectedProduct ? generateHtmlPreview(selectedProduct) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${responsiveDialogClasses.xlarge} ${responsivePadding.large} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
            Aperçu Landing Page - Optimisation SEO
          </DialogTitle>
          <DialogDescription>
            {isGenerating 
              ? "Génération des titres et descriptions SEO en cours..." 
              : `${products.length} produit(s) optimisé(s) - Vérifiez avant de synchroniser avec Shopify`}
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-12 space-y-6">
            <div className="flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-center font-medium">Optimisation en cours...</p>
              <p className="text-center text-sm text-muted-foreground">
                Génération de titres et descriptions SEO optimisés
              </p>
              <div className="max-w-md mx-auto">
                <Progress value={33} className="h-2" />
              </div>
            </div>
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
                  <span className="text-sm font-medium">Score SEO</span>
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
                  {qualityScore >= 80 && 'Excellent - Titre et description parfaitement optimisés'}
                  {qualityScore >= 60 && qualityScore < 80 && 'Bon - Optimisation correcte avec potentiel d\'amélioration'}
                  {qualityScore < 60 && 'À améliorer - Titre ou description trop courts'}
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
                  Détails SEO
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desktop" className="space-y-4">
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4">
                <div className="max-w-md mx-auto border rounded-lg p-4 bg-white min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </div>
              </TabsContent>

              <TabsContent value="360" className="space-y-4">
                <div className="border rounded-lg p-6 bg-muted min-h-[400px] space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Titre SEO</h3>
                    <p className="text-base font-medium">{selectedProduct?.seo_title || selectedProduct?.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedProduct?.seo_title || selectedProduct?.title || '').length} caractères
                      {(selectedProduct?.seo_title || selectedProduct?.title || '').length >= 50 && 
                       (selectedProduct?.seo_title || selectedProduct?.title || '').length <= 60 && 
                       ' ✓ Longueur optimale'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description SEO</h3>
                    <p className="text-sm leading-relaxed">{selectedProduct?.seo_description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedProduct?.seo_description || '').length} caractères
                      {(selectedProduct?.seo_description || '').length >= 140 && 
                       (selectedProduct?.seo_description || '').length <= 160 && 
                       ' ✓ Longueur optimale'}
                    </p>
                  </div>

                  {selectedProduct?.image_url && (
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
                  )}
                </div>
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
