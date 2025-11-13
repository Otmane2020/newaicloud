import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, AlertCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GoogleSearchConsoleProductsProps {
  selectedDomain: string;
}

interface ProductPerformance {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export function GoogleSearchConsoleProducts({ selectedDomain }: GoogleSearchConsoleProductsProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    if (selectedDomain) {
      loadProductPerformance();
    }
  }, [selectedDomain, days]);

  const loadProductPerformance = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      console.log('[GSC Products] 📦 Loading product performance...');

      const { data, error } = await supabase.functions.invoke('get-gsc-product-performance', {
        body: {
          siteUrl: selectedDomain,
          days: days,
        },
      });

      if (error) {
        console.error('[GSC Products] ❌ Error:', error);
        toast.error('Erreur lors du chargement des performances');
        return;
      }

      if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Google Search Console non connecté');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors du chargement des performances');
        return;
      }

      setProducts(data.products || []);
      console.log('[GSC Products] ✅ Loaded', data.totalProducts, 'products');
    } catch (error) {
      console.error('[GSC Products] ❌ Error:', error);
      toast.error('Erreur lors du chargement des performances');
    } finally {
      setLoading(false);
    }
  };

  const getTotalMetrics = () => {
    return products.reduce((acc, product) => ({
      totalClicks: acc.totalClicks + product.clicks,
      totalImpressions: acc.totalImpressions + product.impressions,
      avgCtr: acc.avgCtr + product.ctr,
      avgPosition: acc.avgPosition + product.position,
    }), { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 });
  };

  const metrics = getTotalMetrics();
  const avgCtr = products.length > 0 ? (metrics.avgCtr / products.length) * 100 : 0;
  const avgPosition = products.length > 0 ? metrics.avgPosition / products.length : 0;

  const getOptimizationSuggestion = (product: ProductPerformance) => {
    if (product.impressions > 100 && product.ctr < 0.02) {
      return { type: 'warning', message: 'CTR faible - Optimiser title/meta' };
    }
    if (product.position > 10 && product.impressions > 50) {
      return { type: 'info', message: 'Position moyenne - Améliorer contenu' };
    }
    if (product.clicks > 50 && product.ctr > 0.05) {
      return { type: 'success', message: 'Bonnes performances' };
    }
    return null;
  };

  const extractProductName = (url: string) => {
    const parts = url.split('/products/');
    if (parts.length > 1) {
      return parts[1].split('?')[0].replace(/-/g, ' ');
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Package className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t.searchConsole.products.title}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t.searchConsole.products.description}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDays(d as 7 | 30 | 90)}
                >
                  {d} jours
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadProductPerformance} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {!loading && products.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
                <p className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Impressions</p>
                <p className="text-2xl font-bold">{metrics.totalImpressions.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">CTR Moyen</p>
                <p className="text-2xl font-bold">{avgCtr.toFixed(2)}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Position Moy.</p>
                <p className="text-2xl font-bold">{avgPosition.toFixed(1)}</p>
              </Card>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-4">Chargement des performances produits...</p>
            </div>
          ) : products.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead>Recommandation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => {
                    const suggestion = getOptimizationSuggestion(product);
                    return (
                      <TableRow key={index}>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate capitalize">
                              {extractProductName(product.page)}
                            </span>
                            <a
                              href={product.page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.clicks}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(product.ctr * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {product.position.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          {suggestion && (
                            <Badge
                              variant={
                                suggestion.type === 'success'
                                  ? 'default'
                                  : suggestion.type === 'warning'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {suggestion.message}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucune donnée produit</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Aucune page produit trouvée dans Google Search Console pour cette période.
                Assurez-vous que vos produits sont indexés et visibles dans la recherche Google.
              </p>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
