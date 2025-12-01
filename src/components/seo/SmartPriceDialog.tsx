import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, ShoppingBag, ExternalLink, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface Merchant {
  title: string;
  source: string;
  price: number | null;
  link: string;
}

interface SmartPriceResult {
  vision: {
    title: string;
    brand: string | null;
    category: string;
    segment: string;
  } | null;
  price: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    currency: string;
  };
  merchants: Merchant[];
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
  result: SmartPriceResult | null;
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
    if (!result?.price.avg) return;
    onApplyPrice(result.price.avg, priceType === "promo");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Smart PRICE – {productTitle}
          </DialogTitle>
          <DialogDescription>
            Analyse des prix du marché via Google Shopping & SERP
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyse en cours...</p>
            <p className="text-xs text-muted-foreground mt-2">Vision AI + Google Shopping + SERP</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Product Info & Image */}
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
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Prix Min</p>
                <p className="text-lg font-bold">{formatPrice(result.price.min)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg text-center border-2 border-primary">
                <p className="text-xs text-muted-foreground mb-1">Prix Moyen</p>
                <p className="text-xl font-bold text-primary">{formatPrice(result.price.avg)}</p>
                {currentPrice && result.price.avg && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentPrice > result.price.avg ? "+" : ""}
                    {((currentPrice - result.price.avg) / result.price.avg * 100).toFixed(0)}% vs actuel
                  </p>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Prix Max</p>
                <p className="text-lg font-bold">{formatPrice(result.price.max)}</p>
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{merchant.title}</p>
                        <p className="text-xs text-muted-foreground">{merchant.source}</p>
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
                Aucune enseigne trouvée pour ce produit.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Aucun résultat disponible
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {result?.price.avg && (
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
