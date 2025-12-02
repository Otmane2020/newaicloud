import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ExternalLink, TrendingUp, ShoppingBag, Activity, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShopifyProduct {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
}

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
    visual: number;
  };
  processingTime: number;
}

interface ApiTestResult {
  name: string;
  status: "ok" | "ko";
  details: string;
  responseTime?: number;
  data?: any;
  error?: string;
}

export default function SearchImage() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [testingApis, setTestingApis] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<ApiTestResult[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadShopifyProducts();
  }, []);

  const loadShopifyProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data: products, error } = await supabase
        .from("shopify_products")
        .select("id, title, body_html, price, image_url")
        .not("image_url", "is", null)
        .limit(20)
        .order("title");

      if (error) throw error;
      
      const formattedProducts: ShopifyProduct[] = products?.map(p => ({
        id: p.id,
        title: p.title || "",
        price: p.price || 0,
        description: p.body_html || "",
        imageUrl: p.image_url || "",
      })) || [];

      setProducts(formattedProducts);
      
      if (formattedProducts.length === 0) {
        toast({
          title: "Aucun produit",
          description: "Aucun produit avec image trouvé dans votre catalogue.",
        });
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(productId);
      handleUrlChange(product.imageUrl);
      toast({
        title: "Produit sélectionné",
        description: `${product.title} - ${product.price.toFixed(2)} €`,
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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

      // Si fichier upload, conversion en base64 (data URL)
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string);
            } else {
              reject(new Error("Impossible de lire le fichier"));
            }
          };
          reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
          reader.readAsDataURL(imageFile);
        });
        finalImageUrl = await base64Promise;
      }

      const { data, error } = await supabase.functions.invoke<ScanResult>("smart-price-scanner", {
        body: { imageUrl: finalImageUrl },
      });

      if (error) throw error;
      if (!data) throw new Error("Aucune donnée retournée par le serveur");

      console.log("smart-price-scanner result:", data);

      setResult(data);
      toast({
        title: "Analyse terminée",
        description: `${data.productsFound} produits trouvés avec ${Math.round(data.confidence * 100)}% de confiance`,
      });
    } catch (err: unknown) {
      console.error("Error:", err);
      const message = err instanceof Error ? err.message : "Erreur lors de l'analyse";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testApis = async () => {
    setTestingApis(true);
    setApiTestResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("test-smart-ai-apis", {
        body: {},
      });

      if (error) throw error;
      if (!data) throw new Error("Aucune donnée retournée");

      console.log("API test results:", data);
      setApiTestResults(data.results);

      toast({
        title: data.allOk ? "✅ Tous les tests OK" : "⚠️ Certains tests ont échoué",
        description: `${data.results.filter((r: ApiTestResult) => r.status === "ok").length}/${data.results.length} APIs fonctionnent`,
      });
    } catch (err: unknown) {
      console.error("Error testing APIs:", err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Erreur lors des tests",
        variant: "destructive",
      });
    } finally {
      setTestingApis(false);
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "N/A";
    return `${price.toFixed(2)} €`;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Smart Price Scanner</h1>
            <p className="text-muted-foreground">
              Analysez les prix et informations produits à partir d&apos;images avec recherche SERP
            </p>
          </div>
          <Button 
            onClick={testApis} 
            disabled={testingApis}
            variant="outline"
            className="flex items-center gap-2"
          >
            {testingApis ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Tester les APIs
              </>
            )}
          </Button>
        </div>

        {/* API Test Results */}
        {apiTestResults && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Diagnostic des APIs
              </CardTitle>
              <CardDescription>
                Résultats des tests de connectivité et de fonctionnalité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiTestResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      result.status === "ok"
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {result.status === "ok" ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{result.name}</h3>
                          <p className={`text-sm ${result.status === "ok" ? "text-green-600" : "text-red-600"}`}>
                            {result.details}
                          </p>
                          {result.responseTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Temps de réponse : {result.responseTime}ms
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.status === "ok" ? "default" : "destructive"}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Debug details */}
                    {result.data && (
                      <details className="mt-3">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Voir les données de debug
                        </summary>
                        <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}

                    {result.error && (
                      <details className="mt-3">
                        <summary className="text-xs text-red-600 cursor-pointer hover:text-red-500">
                          Voir l&apos;erreur
                        </summary>
                        <pre className="mt-2 p-3 bg-red-500/10 rounded text-xs overflow-x-auto text-red-600">
                          {result.error}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Source image */}
        <Card>
          <CardHeader>
            <CardTitle>Source de l&apos;image</CardTitle>
            <CardDescription>Uploadez une image ou fournissez une URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product-select">Produits du catalogue</Label>
              <Select value={selectedProduct} onValueChange={handleProductSelect} disabled={loading || loadingProducts}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProducts ? "Chargement..." : products.length === 0 ? "Aucun produit" : "Sélectionner un produit..."} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-3 py-1">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.title} 
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{product.price.toFixed(2)} €</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="text-center text-sm text-muted-foreground my-2">ou</div>
            </div>

            <div>
              <Label htmlFor="url-input">URL de l&apos;image</Label>
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
              <Input id="file-input" type="file" accept="image/*" onChange={handleFileChange} disabled={loading} />
            </div>

            {previewUrl && (
              <div className="mt-4">
                <Label>Aperçu</Label>
                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-md border mt-2" />
              </div>
            )}

            <Button onClick={analyzeImage} disabled={loading || !previewUrl} className="w-full">
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

        {/* Résultats */}
        <Card>
          <CardHeader>
            <CardTitle>Résultats de l&apos;analyse</CardTitle>
            <CardDescription>Informations extraites par l&apos;IA et recherche SERP</CardDescription>
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
                <p className="text-xs text-muted-foreground mt-2">Vision AI + recherche Shopping + SERP</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Analyse Vision */}
                {result.vision && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">Produit détecté</Label>
                    <p className="font-medium">{result.vision.title}</p>
                    {result.vision.brand && (
                      <p className="text-sm text-muted-foreground">Marque : {result.vision.brand}</p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline">{result.vision.category}</Badge>
                      <Badge variant="secondary">{result.vision.segment}</Badge>
                    </div>
                  </div>
                )}

                {/* Stats prix */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <Label className="text-xs text-muted-foreground">Prix moyen</Label>
                    <p className="text-xl font-bold text-primary">{formatPrice(result.price?.avg)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Label className="text-xs text-muted-foreground">Fourchette</Label>
                    <p className="text-sm font-medium">
                      {formatPrice(result.price?.min)} - {formatPrice(result.price?.max)}
                    </p>
                  </div>
                </div>

                {/* Confiance & sources */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Confiance : <strong>{Math.round(result.confidence * 100)}%</strong>
                  </span>
                  <span className="text-muted-foreground">{result.processingTime}ms</span>
                </div>

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Shopping: {result.sources.shopping}
                  </Badge>
                  <Badge variant="outline">SERP: {result.sources.organic}</Badge>
                  <Badge variant="outline">Visual: {result.sources.visual}</Badge>
                </div>

                {/* Liste marchands */}
                {result.merchants.length > 0 ? (
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
                            <span className="font-semibold text-primary">{formatPrice(merchant.price)}</span>
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
                ) : (
                  <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
                    Aucun prix trouvé pour cette image.
                  </div>
                )}

                {/* Requête utilisée */}
                {result.searchQuery && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Requête : &quot;{result.searchQuery}&quot;
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
