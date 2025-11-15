import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
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

interface PagePerformance {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GoogleSearchConsolePagesProps {
  selectedDomain: string;
  dateRange: string;
}

export function GoogleSearchConsolePages({ selectedDomain, dateRange }: GoogleSearchConsolePagesProps) {
  const [pages, setPages] = useState<PagePerformance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDomain) {
      loadPages();
    }
  }, [selectedDomain, dateRange]);

  const loadPages = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      console.log('[GSC Pages] 📄 Loading page performance...');

      const { data, error } = await supabase.functions.invoke('get-search-console-data', {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange),
          dimension: 'page',
        },
      });

      if (error) {
        console.error('[GSC Pages] ❌ Error:', error);
        toast.error('Erreur lors du chargement des pages');
        return;
      }

      if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Google Search Console non connecté');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors du chargement des pages');
        return;
      }

      setPages(data.pages || []);
      console.log('[GSC Pages] ✅ Loaded', data.pages?.length || 0, 'pages');
    } catch (error) {
      console.error('[GSC Pages] ❌ Error:', error);
      toast.error('Erreur lors du chargement des pages');
    } finally {
      setLoading(false);
    }
  };

  const getPageType = (url: string) => {
    if (url.includes('/products/')) return 'Produit';
    if (url.includes('/collections/')) return 'Collection';
    if (url.includes('/pages/')) return 'Page';
    if (url.includes('/blogs/')) return 'Article';
    if (url === selectedDomain || url === `https://${selectedDomain}` || url === `https://${selectedDomain}/`) return 'Accueil';
    return 'Autre';
  };

  const getOptimizationSuggestion = (page: PagePerformance) => {
    if (page.impressions > 100 && page.ctr < 0.02) {
      return { type: 'warning', message: 'CTR faible - Optimiser title/meta' };
    }
    if (page.position > 10 && page.impressions > 50) {
      return { type: 'info', message: 'Position moyenne - Améliorer contenu' };
    }
    if (page.clicks > 50 && page.ctr > 0.05) {
      return { type: 'success', message: 'Bonnes performances' };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-4">Chargement des pages...</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Aucune page trouvée</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Aucune page trouvée dans Google Search Console pour cette période.
        </p>
        <Button onClick={loadPages} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </Card>
    );
  }

  const totalMetrics = pages.reduce((acc, page) => ({
    totalClicks: acc.totalClicks + page.clicks,
    totalImpressions: acc.totalImpressions + page.impressions,
  }), { totalClicks: 0, totalImpressions: 0 });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Pages</p>
          <p className="text-2xl font-bold">{pages.length.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
          <p className="text-2xl font-bold">{totalMetrics.totalClicks.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Impressions</p>
          <p className="text-2xl font-bold">{totalMetrics.totalImpressions.toLocaleString()}</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Position</TableHead>
              <TableHead>Recommandation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.slice(0, 100).map((page, index) => {
              const suggestion = getOptimizationSuggestion(page);
              const pageType = getPageType(page.page);
              
              return (
                <TableRow key={index}>
                  <TableCell className="max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs">{page.page}</span>
                      <a
                        href={page.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {pageType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {page.clicks}
                  </TableCell>
                  <TableCell className="text-right">
                    {page.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(page.ctr * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {page.position.toFixed(1)}
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
    </div>
  );
}
