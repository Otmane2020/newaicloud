import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
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

interface KeywordPerformance {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GoogleSearchConsoleKeywordsProps {
  selectedDomain: string;
  dateRange: string;
}

export function GoogleSearchConsoleKeywords({ selectedDomain, dateRange }: GoogleSearchConsoleKeywordsProps) {
  const [keywords, setKeywords] = useState<KeywordPerformance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDomain) {
      loadKeywords();
    }
  }, [selectedDomain, dateRange]);

  const loadKeywords = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      console.log('[GSC Keywords] 🔍 Loading keyword performance...');

      const { data, error } = await supabase.functions.invoke('get-search-console-data', {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange),
          dimension: 'query',
        },
      });

      if (error) {
        console.error('[GSC Keywords] ❌ Error:', error);
        toast.error('Erreur lors du chargement des mots-clés');
        return;
      }

      if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Google Search Console non connecté');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors du chargement des mots-clés');
        return;
      }

      setKeywords(data.keywords || []);
      console.log('[GSC Keywords] ✅ Loaded', data.keywords?.length || 0, 'keywords');
    } catch (error) {
      console.error('[GSC Keywords] ❌ Error:', error);
      toast.error('Erreur lors du chargement des mots-clés');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceIndicator = (keyword: KeywordPerformance) => {
    if (keyword.clicks > 100) return { type: 'success', label: 'Excellent' };
    if (keyword.clicks > 20) return { type: 'default', label: 'Bon' };
    if (keyword.impressions > 1000 && keyword.ctr < 0.02) return { type: 'warning', label: 'À optimiser' };
    return { type: 'secondary', label: 'Moyen' };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-4">Chargement des mots-clés...</p>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Aucun mot-clé trouvé</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Aucune requête de recherche trouvée dans Google Search Console pour cette période.
        </p>
        <Button onClick={loadKeywords} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </Card>
    );
  }

  const totalMetrics = keywords.reduce((acc, kw) => ({
    totalClicks: acc.totalClicks + kw.clicks,
    totalImpressions: acc.totalImpressions + kw.impressions,
  }), { totalClicks: 0, totalImpressions: 0 });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Mots-clés</p>
          <p className="text-2xl font-bold">{keywords.length.toLocaleString()}</p>
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
              <TableHead>Mot-clé</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Position</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.slice(0, 50).map((keyword, index) => {
              const indicator = getPerformanceIndicator(keyword);
              return (
                <TableRow key={index}>
                  <TableCell className="max-w-xs">
                    <div className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{keyword.query}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {keyword.clicks}
                  </TableCell>
                  <TableCell className="text-right">
                    {keyword.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(keyword.ctr * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {keyword.position.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        indicator.type === 'success'
                          ? 'default'
                          : indicator.type === 'warning'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {indicator.label}
                    </Badge>
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
