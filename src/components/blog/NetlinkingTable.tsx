import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, FileText, Link, Download, ExternalLink, TrendingUp, Search, Settings, Rocket, Eye } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface NetlinkingEntry {
  id: string;
  article_id: string;
  article_title: string;
  target_url: string;
  anchor_text: string;
  link_type: 'internal' | 'external';
  click_count: number;
  created_at: string;
  updated_at: string;
  product_page_name: string;
  seo_score: number;
}

export function NetlinkingTable() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<NetlinkingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    internal: 0,
    external: 0,
    totalClicks: 0,
  });
  const { t, tf } = useTranslation();

  useEffect(() => {
    if (user) {
      loadNetlinking();
    }
  }, [user]);

  const loadNetlinking = async () => {
    try {
      setLoading(true);
      
      const { data: netlinkingData, error: netlinkingError } = await supabase
        .from('blog_netlinking')
        .select(`
          *,
          article:blog_articles!article_id(title)
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (netlinkingError) throw netlinkingError;

      // Enrichir les données avec les infos produit/page
      const formattedData = await Promise.all(
        (netlinkingData || []).map(async (entry: any) => {
          let productPageName = 'Page inconnue';
          let seoScore = Math.floor(Math.random() * (100 - 50) + 50); // Score aléatoire entre 50-100

          // Extraire le nom du produit/page depuis l'URL
          if (entry.target_url) {
            const urlParts = entry.target_url.split('/');
            const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
            
            // Vérifier si c'est un produit
            if (entry.target_url.includes('/products/')) {
              const { data: product } = await supabase
                .from('shopify_products')
                .select('title')
                .eq('handle', lastPart)
                .maybeSingle();
              
              productPageName = product?.title || lastPart.replace(/-/g, ' ');
            } 
            // Vérifier si c'est une collection
            else if (entry.target_url.includes('/collections/')) {
              productPageName = `Collection "${lastPart.replace(/-/g, ' ')}"`;
            }
            // Vérifier si c'est une page
            else if (entry.target_url.includes('/pages/')) {
              const { data: page } = await supabase
                .from('shopify_pages')
                .select('title')
                .eq('handle', lastPart)
                .maybeSingle();
              
              productPageName = page?.title || `Page "${lastPart.replace(/-/g, ' ')}"`;
            }
          }

          // Calculer un score SEO basé sur plusieurs facteurs
          const anchorLength = entry.anchor_text?.length || 0;
          const hasKeywords = anchorLength > 10 && anchorLength < 60;
          const isInternal = entry.link_type === 'internal';
          const hasClicks = (entry.click_count || 0) > 0;
          
          seoScore = 50; // Base
          if (hasKeywords) seoScore += 20;
          if (isInternal) seoScore += 15;
          if (hasClicks) seoScore += 15;

          return {
            ...entry,
            article_title: entry.article?.title || 'Article supprimé',
            product_page_name: productPageName,
            seo_score: seoScore,
          };
        })
      );

      setEntries(formattedData);

      // Calculate stats
      const total = formattedData.length;
      const internal = formattedData.filter((e: any) => e.link_type === 'internal').length;
      const external = formattedData.filter((e: any) => e.link_type === 'external').length;
      const totalClicks = formattedData.reduce((sum: number, e: any) => sum + (e.click_count || 0), 0);

      setStats({ total, internal, external, totalClicks });
    } catch (error) {
      console.error('Error loading netlinking:', error);
      toast.error(t.blog.dialogs.netlinking.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAllArticles = async () => {
    if (!user) return;
    
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-netlinking-from-articles', {
        body: { article_ids: null } // null means analyze all articles
      });

      if (error) throw error;

      toast.success(tf('blog.dialogs.netlinking.extracted', { count: data.count, articles: data.articles_processed }));
      await loadNetlinking(); // Reload the table
    } catch (error) {
      console.error('Error analyzing articles:', error);
      toast.error(t.blog.dialogs.netlinking.errorAnalysis);
    } finally {
      setAnalyzing(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Article', 'URL cible', 'Texte d\'ancrage', 'Type', 'Clics', 'Date de création'],
      ...entries.map((entry) => [
        entry.article_title,
        entry.target_url,
        entry.anchor_text,
        entry.link_type,
        entry.click_count,
        new Date(entry.created_at).toLocaleDateString('fr-FR'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netlinking-${Date.now()}.csv`;
    a.click();
    toast.success(t.blog.dialogs.netlinking.csvExported);
  };

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleAnalyzeAllArticles}
          disabled={analyzing}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {analyzing ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              {t.blog.dialogs.netlinking.analyzing}
            </>
          ) : (
            <>
              <Link className="w-5 h-5 mr-2" />
              {t.blog.dialogs.netlinking.analyzeAll}
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liens Internes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.internal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liens Externes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.external}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalClicks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Analyse Netlinking
              </CardTitle>
              <CardDescription>Tous vos liens créés dans les articles</CardDescription>
            </div>
      <Button onClick={exportToCSV} variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Exporter CSV
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {loading ? (
      <div className="text-center py-8 text-muted-foreground">{t.blog.dialogs.netlinking.loading}</div>
    ) : entries.length === 0 ? (
      <div className="text-center py-12">
        <Link className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">{t.blog.dialogs.netlinking.noLinks}</p>
        <p className="text-sm text-muted-foreground">{t.blog.dialogs.netlinking.autoDetect}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Lien</TableHead>
              <TableHead className="w-[180px]">Produit / Page</TableHead>
              <TableHead className="w-[200px]">Article lié</TableHead>
              <TableHead className="w-[100px]">Type de lien</TableHead>
              <TableHead className="w-[120px]">Score SEO</TableHead>
              <TableHead className="w-[140px]">Dernière mise à jour</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const scoreColor = entry.seo_score >= 80 ? 'text-green-600' : entry.seo_score >= 60 ? 'text-orange-600' : 'text-red-600';
              const scoreEmoji = entry.seo_score >= 80 ? '🟢' : entry.seo_score >= 60 ? '🟠' : '🔴';
              
              return (
                <TableRow key={entry.id} className="hover:bg-muted/50">
                  <TableCell>
                    <a
                      href={entry.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                      title={entry.target_url}
                    >
                      <span className="truncate max-w-[280px]">{entry.target_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="truncate max-w-[170px]" title={entry.product_page_name}>
                      {entry.product_page_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="italic text-sm text-muted-foreground truncate max-w-[190px]" title={entry.article_title}>
                      {entry.article_title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.link_type === 'internal' ? 'default' : 'outline'}>
                      {entry.link_type === 'internal' ? 'Interne' : 'Externe'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-2 font-semibold ${scoreColor}`}>
                      <span className="text-lg">{scoreEmoji}</span>
                      <span>{entry.seo_score}/100</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.updated_at || entry.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {entry.seo_score >= 80 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Analyse du lien...')}
                          title="Analyser"
                        >
                          <Search className="w-4 h-4 mr-1" />
                          Analyser
                        </Button>
                      ) : entry.seo_score >= 60 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Optimisation du lien...')}
                          title="Optimiser"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Optimiser
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Amélioration du lien...')}
                          title="Améliorer"
                        >
                          <Rocket className="w-4 h-4 mr-1" />
                          Améliorer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(entry.target_url, '_blank')}
                        title="Voir le lien"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
</Card>

{/* Section Génération Articles */}
<Card className="mt-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="w-5 h-5" />
      Générer Articles avec Netlinking
    </CardTitle>
    <CardDescription>
      Créez automatiquement des articles optimisés avec liens internes basés sur votre catalogue
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          onClick={async () => {
            try {
              toast.info('Analyse du catalogue en cours...');
              const { data, error } = await supabase.functions.invoke('generate-daily-opportunities');
              if (error) throw error;
              toast.success('Articles générés avec netlinking automatique !');
              loadNetlinking();
            } catch (error: any) {
              toast.error(error.message || 'Erreur lors de la génération');
            }
          }}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Générer article pour produits connexes
        </Button>
        <Button
          onClick={async () => {
            try {
              toast.info('Analyse des pages Shopify...');
              const { data, error } = await supabase.functions.invoke('generate-daily-opportunities');
              if (error) throw error;
              toast.success('Articles générés pour les pages !');
              loadNetlinking();
            } catch (error: any) {
              toast.error(error.message || 'Erreur');
            }
          }}
          variant="outline"
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          Générer article pour pages Shopify
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        L'IA analysera votre catalogue et créera des articles avec liens internes automatiques
      </p>
    </div>
  </CardContent>
</Card>
    </div>
  );
}
