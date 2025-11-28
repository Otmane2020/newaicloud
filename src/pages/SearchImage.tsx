import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, TrendingUp, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Merchant {
  title: string;
  source: string;
  price: number | null;
  link: string;
}

interface ScanResult {
  vision: {
    title: string;
    brand: string | null;
    category: string;
    keywords: string[];
    description: string;
    segment: string;
  } | null;
  searchQuery: string;
  price: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    currency: string;
  };
  merchants: Merchant[];
  productsFound: number;
  confidence: number;
  sources: {
    shopping: number;
    organic: number;
    images: number;
  };
  processingTime: number;
}

export default function SearchImage() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageUrl("");
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setPreviewUrl(url);
    setImageFile(null);
  };

  const analyzeImage = async () => {
    if (!previewUrl) {
      toast({
        title: "Erreur",
        description: "Veuillez fournir une image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let finalImageUrl = imageUrl;

      // If file upload, convert to base64
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        finalImageUrl = await base64Promise;
      }

      const { data, error } = await supabase.functions.invoke("smart-price-scanner", {
        body: { imageUrl: finalImageUrl },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Analyse terminée",
        description: `${data.productsFound} produits trouvés avec ${Math.round(data.confidence * 100)}% de confiance`,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'analyse",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `${price.toFixed(2)} €`;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Smart Price Scanner</h1>
        <p className="text-muted-foreground">
          Analysez les prix et informations produits à partir d'images avec recherche SERP
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Image Source</CardTitle>
            <CardDescription>Uploadez une image ou fournissez une URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url-input">URL de l'image</Label>
              <Input
                id="url-input"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="relative">
              <div className="text-center text-sm text-muted-foreground my-2">ou</div>
            </div>

            <div>
              <Label htmlFor="file-input">Upload fichier</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            {previewUrl && (
              <div className="mt-4">
                <Label>Aperçu</Label>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md border mt-2"
                />
              </div>
            )}

            <Button
              onClick={analyzeImage}
              disabled={loading || !previewUrl}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Scanner les prix
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultats de l'analyse</CardTitle>
            <CardDescription>Informations extraites par l'IA et recherche SERP</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="text-center text-muted-foreground py-8">
                Aucun résultat. Analysez une image pour commencer.
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Analyse en cours...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Vision AI + recherche Shopping + SERP
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Vision Analysis */}
                {result.vision && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">Produit détecté</Label>
                    <p className="font-medium">{result.vision.title}</p>
                    {result.vision.brand && (
                      <p className="text-sm text-muted-foreground">
                        Marque: {result.vision.brand}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline">{result.vision.category}</Badge>
                      <Badge variant="secondary">{result.vision.segment}</Badge>
                    </div>
                  </div>
                )}

                {/* Price Statistics */}
                {result.price.avg && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                      <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <Label className="text-xs text-muted-foreground">Prix moyen</Label>
                      <p className="text-xl font-bold text-primary">{formatPrice(result.price.avg)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Label className="text-xs text-muted-foreground">Fourchette</Label>
                      <p className="text-sm font-medium">
                        {formatPrice(result.price.min)} - {formatPrice(result.price.max)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Confidence & Sources */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Confiance: <strong>{Math.round(result.confidence * 100)}%</strong>
                  </span>
                  <span className="text-muted-foreground">
                    {result.processingTime}ms
                  </span>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Shopping: {result.sources.shopping}
                  </Badge>
                  <Badge variant="outline">SERP: {result.sources.organic}</Badge>
                  <Badge variant="outline">Images: {result.sources.images}</Badge>
                </div>

                {/* Merchants List */}
                {result.merchants.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-semibold mb-2 block">
                      🏪 Top {result.merchants.length} marchands
                    </Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.merchants.map((merchant, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{merchant.title}</p>
                            <p className="text-xs text-muted-foreground">{merchant.source}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">
                              {formatPrice(merchant.price)}
                            </span>
                            {merchant.link && (
                              <a
                                href={merchant.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-background rounded"
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Query Used */}
                {result.searchQuery && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Requête: "{result.searchQuery}"
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
