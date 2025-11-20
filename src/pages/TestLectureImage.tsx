import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Eye, Ruler } from "lucide-react";

interface ProductImage {
  id: string;
  src: string;
  product_id: string;
  productTitle?: string;
  analyzing?: boolean;
  result?: any;
}

export default function TestLectureImage() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllImages();
  }, []);

  const loadAllImages = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les images avec info produit
      const { data: imagesData, error } = await supabase
        .from("product_images")
        .select(`
          id,
          src,
          product_id,
          shopify_products!inner(title)
        `)
        .limit(50);

      if (error) throw error;

      const formattedImages: ProductImage[] = (imagesData || []).map((img: any) => ({
        id: img.id,
        src: img.src,
        product_id: img.product_id,
        productTitle: img.shopify_products?.title || "Produit sans titre",
        analyzing: false,
        result: null
      }));

      setImages(formattedImages);
      toast.success(`${formattedImages.length} images chargées`);
    } catch (error: any) {
      toast.error("Erreur chargement images : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    // Marquer comme en cours d'analyse
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, analyzing: true, result: null } : img
    ));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: { 
          imageUrl: image.src,
          productContext: {
            title: image.productTitle || "Produit"
          }
        }
      });

      if (error) throw error;

      // Stocker le résultat
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, analyzing: false, result: data } : img
      ));

      toast.success("Analyse terminée");
    } catch (error: any) {
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, analyzing: false, result: { error: error.message } } : img
      ));
      toast.error("Erreur : " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement des images...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Galerie Test Gemini Vision</h1>
        <p className="text-muted-foreground">
          Cliquez sur une image pour l'analyser avec Google Gemini et détecter les dimensions
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{images.length} images chargées</Badge>
          <Button variant="ghost" size="sm" onClick={loadAllImages}>
            Recharger
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <div className="aspect-square relative bg-muted">
              <img 
                src={image.src} 
                alt={image.productTitle}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            
            <CardHeader>
              <CardTitle className="text-sm truncate">{image.productTitle}</CardTitle>
              <CardDescription className="text-xs truncate">
                {image.src}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button 
                onClick={() => analyzeImage(image.id)}
                disabled={image.analyzing}
                className="w-full"
                size="sm"
              >
                {image.analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Analyser l'image
                  </>
                )}
              </Button>

              {image.result && !image.result.error && (
                <div className="space-y-2 p-3 bg-muted rounded-lg text-sm">
                  {/* Source des dimensions */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Source :</span>
                    <Badge variant={image.result.visualAttributes?.visualContext?.dimensionSource === "visible" ? "default" : "secondary"}>
                      {image.result.visualAttributes?.visualContext?.dimensionSource || "N/A"}
                    </Badge>
                  </div>

                  {/* Schéma technique détecté */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Schéma technique :</span>
                    {image.result.visualAttributes?.visualContext?.hasTechnicalSchema ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  {/* Confiance */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Confiance :</span>
                    <span>{(image.result.confidence * 100).toFixed(0)}%</span>
                  </div>

                  {/* Dimensions visibles détectées */}
                  {image.result.visualAttributes?.visualContext?.visibleDimensions && 
                   image.result.visualAttributes.visualContext.visibleDimensions.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="font-medium mb-1 flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        Dimensions détectées :
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {image.result.visualAttributes.visualContext.visibleDimensions.map((dim: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {dim}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dimensions techniques */}
                  {image.result.visualAttributes?.technicalDimensions && (
                    <div className="pt-2 border-t">
                      <div className="font-medium mb-1">Dimensions extraites :</div>
                      <div className="text-xs space-y-1">
                        {Object.entries(image.result.visualAttributes.technicalDimensions).map(([key, value]: [string, any]) => (
                          value && !key.includes('Unit') && (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key} :</span>
                              <span className="font-mono">
                                {value} {image.result.visualAttributes.technicalDimensions[`${key}Unit`] || ''}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raison de confiance */}
                  {image.result.visualAttributes?.visualContext?.confidenceReason && (
                    <div className="pt-2 border-t">
                      <div className="font-medium mb-1">Explication :</div>
                      <p className="text-xs text-muted-foreground italic">
                        {image.result.visualAttributes.visualContext.confidenceReason}
                      </p>
                    </div>
                  )}

                  {/* JSON complet (collapsible) */}
                  <details className="pt-2 border-t">
                    <summary className="cursor-pointer text-xs font-medium">Voir JSON complet</summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-48 p-2 bg-background rounded">
                      {JSON.stringify(image.result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {image.result?.error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <p className="font-semibold">Erreur :</p>
                  <p className="text-xs">{image.result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {images.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune image trouvée dans votre projet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
