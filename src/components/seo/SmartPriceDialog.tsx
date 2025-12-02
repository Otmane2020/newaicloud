import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, ShoppingBag, ExternalLink, CheckCircle, Sparkles, Target, Users } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface Merchant {
  title: string;
  source: string;
  price: number | null;
  link: string;
  image?: string;
}

interface SmartAIResult {
  vision: {
    title: string;
    brand: string | null;
    category: string;
    segment: string;
    description: string;
    keywords: string[];
    attributes?: Record<string, any>;
  } | null;
  pricing: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    recommendedPrice: number | null;
    currency: string;
  };
  merchants: Merchant[];
  competitors: {
    name: string;
    url: string;
    price: number | null;
  }[];
  seoSuggestions: {
    title: string;
    description: string;
    keywords: string[];
  };
  confidence: number;
  sources: {
    shopping: number;
    organic: number;
    visual: number;
  };
}

interface SmartPriceDialogProps {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  imageUrl: string | null;
  currentPrice: number | null;
  loading: boolean;
  result: SmartAIResult | null;
  onApplyPrice: (price: number, isPromo: boolean) => void;
}

export function SmartPriceDialog({
  open,
  onClose,
  productTitle,
  imageUrl,
  currentPrice,
  loading,
  result,
  onApplyPrice,
}: SmartPriceDialogProps) {
  const { t } = useTranslation();

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "N/A";
    return `${price.toFixed(2)} €`;
  };

  const handleApplyPrice = (priceType: "regular" | "promo") => {
    const price = result?.pricing.recommendedPrice || result?.pricing.avg;
    if (!price) return;
    onApplyPrice(price, priceType === "promo");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart AI – {productTitle}
          </DialogTitle>
          <DialogDescription>
            Analyse complète via Vision AI, Google Shopping, SERP & DataForSEO
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyse Smart AI en cours...</p>
            <p className="text-xs text-muted-foreground mt-2">Vision • Pricing • SEO • Competitors</p>
          </div>
        ) : result ? (
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pricing">
                <TrendingUp className="w-4 h-4 mr-1" />
                Prix
              </TabsTrigger>
              <TabsTrigger value="vision">
                <Sparkles className="w-4 h-4 mr-1" />
                Vision AI
              </TabsTrigger>
              <TabsTrigger value="seo">
                <Target className="w-4 h-4 mr-1" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="competitors">
                <Users className="w-4 h-4 mr-1" />
                Concurrents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              {/* Product Preview */}
              <div className="flex gap-4">
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt={productTitle} 
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                )}
                <div className="flex-1">
                  {result.vision && (
                    <div className="space-y-1">
                      <p className="font-medium">{result.vision.title}</p>
                      {result.vision.brand && (
                        <p className="text-sm text-muted-foreground">Marque : {result.vision.brand}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">{result.vision.category}</Badge>
                        <Badge variant="secondary">{result.vision.segment}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Statistics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Prix Min</p>
                  <p className="text-lg font-bold">{formatPrice(result.pricing.min)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Médiane</p>
                  <p className="text-lg font-bold">{formatPrice(result.pricing.median)}</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg text-center border-2 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">Prix Recommandé</p>
                  <p className="text-xl font-bold text-primary">{formatPrice(result.pricing.recommendedPrice)}</p>
                  {currentPrice && result.pricing.recommendedPrice && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentPrice > result.pricing.recommendedPrice ? "+" : ""}
                      {((currentPrice - result.pricing.recommendedPrice) / result.pricing.recommendedPrice * 100).toFixed(0)}% vs actuel
                    </p>
                  )}
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Prix Max</p>
                  <p className="text-lg font-bold">{formatPrice(result.pricing.max)}</p>
                </div>
              </div>

              {/* Confidence & Sources */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex gap-3 text-sm">
                  <Badge variant="outline">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Shopping: {result.sources.shopping}
                  </Badge>
                  <Badge variant="outline">SERP: {result.sources.organic}</Badge>
                  <Badge variant="outline">Visual: {result.sources.visual}</Badge>
                </div>
                <div className="text-sm">
                  Confiance : <strong className="text-primary">{Math.round(result.confidence * 100)}%</strong>
                </div>
              </div>

              {/* Merchants List */}
              {result.merchants.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Top {result.merchants.length} enseignes contribuant au résultat
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.merchants.map((merchant, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {merchant.image && (
                            <img src={merchant.image} alt="" className="w-10 h-10 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{merchant.title}</p>
                            <p className="text-xs text-muted-foreground">{merchant.source}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">{formatPrice(merchant.price)}</span>
                          {merchant.link && (
                            <a
                              href={merchant.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-background rounded-md transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Aucune enseigne trouvée
                </div>
              )}
            </TabsContent>

            <TabsContent value="vision" className="space-y-4 mt-4">
              {result.vision && (
                <>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Titre détecté</p>
                      <p className="font-semibold">{result.vision.title}</p>
                    </div>
                    
                    {result.vision.brand && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Marque</p>
                        <p>{result.vision.brand}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Catégorie</p>
                      <Badge>{result.vision.category}</Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Segment de marché</p>
                      <Badge variant="secondary">{result.vision.segment}</Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{result.vision.description}</p>
                    </div>

                    {result.vision.keywords.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Mots-clés détectés</p>
                        <div className="flex gap-2 flex-wrap">
                          {result.vision.keywords.map((kw, i) => (
                            <Badge key={i} variant="outline">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.vision.attributes && Object.keys(result.vision.attributes).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Attributs détectés</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(result.vision.attributes).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium capitalize">{key}: </span>
                              <span className="text-muted-foreground">{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              {result.seoSuggestions && (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Titre SEO suggéré</p>
                    <p className="font-medium">{result.seoSuggestions.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.seoSuggestions.title.length} caractères
                    </p>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Meta Description suggérée</p>
                    <p className="text-sm">{result.seoSuggestions.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.seoSuggestions.description.length} caractères
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Mots-clés SEO suggérés</p>
                    <div className="flex gap-2 flex-wrap">
                      {result.seoSuggestions.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4 mt-4">
              {result.competitors && result.competitors.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-3">Concurrents détectés ({result.competitors.length})</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.competitors.map((competitor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{competitor.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{competitor.url}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">{formatPrice(competitor.price)}</span>
                          <a
                            href={competitor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-background rounded-md transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun concurrent détecté
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Aucun résultat disponible
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {(result?.pricing.recommendedPrice || result?.pricing.avg) && (
            <>
              <Button 
                onClick={() => handleApplyPrice("regular")}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Appliquer comme prix régulier
              </Button>
              <Button 
                onClick={() => handleApplyPrice("promo")}
                variant="secondary"
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Appliquer comme prix promo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
