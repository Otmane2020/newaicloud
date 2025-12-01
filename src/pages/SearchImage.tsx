import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ExternalLink, TrendingUp, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'store-sync-optimizer-heqly.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'e63a0a4d8d2b11bc0c61386c8aaa978d';

interface ShopifyProduct {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
  handle: string;
}

const STOREFRONT_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Error calling Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
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

export default function SearchImage() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadShopifyProducts();
  }, []);

  const loadShopifyProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 10 });
      
      if (!data?.data?.products?.edges) {
        console.warn("No products found in Shopify response");
        setProducts([]);
        return;
      }

      const shopifyProducts: ShopifyProduct[] = data.data.products.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: parseFloat(edge.node.priceRange.minVariantPrice.amount),
        description: edge.node.description,
        imageUrl: edge.node.images.edges[0]?.node.url || '',
        handle: edge.node.handle,
      }));

      setProducts(shopifyProducts);
      
      if (shopifyProducts.length === 0) {
        toast({
          title: "Aucun produit",
          description: "Votre catalogue Shopify est vide. Ajoutez des produits pour les analyser.",
        });
      }
    } catch (error) {
      console.error("Error loading Shopify products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits Shopify",
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

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "N/A";
    return `${price.toFixed(2)} €`;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Smart Price Scanner</h1>
        <p className="text-muted-foreground">
          Analysez les prix et informations produits à partir d&apos;images avec recherche SERP
        </p>
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
