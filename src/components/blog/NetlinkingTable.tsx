import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, FileText, Link, Download, ExternalLink, Search, Settings, Rocket, Eye, AlertCircle, RefreshCw, Loader2, Trash2, Edit } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { ReplaceLinkDialog } from './ReplaceLinkDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  is_broken: boolean;
  last_checked_at: string | null;
  http_status_code: number | null;
  error_message: string | null;
  broken_since: string | null;
}

export function NetlinkingTable() {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const [entries, setEntries] = useState<NetlinkingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLink, setSelectedLink] = useState<NetlinkingEntry | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    internal: 0,
    external: 0,
    totalClicks: 0,
    broken: 0,
    working: 0,
    unchecked: 0,
  });
  const { t, tf } = useTranslation();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && selectedStore) {
        setLoading(true);
        loadNetlinking();
        
        // Auto-check links every 24 hours if there are unchecked links
        const checkInterval = setInterval(() => {
          if (stats.unchecked > 0 && !checking) {
            console.log('Auto-checking links...');
            handleCheckLinks();
          }
        }, 24 * 60 * 60 * 1000);

        return () => clearInterval(checkInterval);
      } else if (!selectedStore) {
        setEntries([]);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, selectedStore?.id]);

  const loadNetlinking = async () => {
    if (!selectedStore?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First get articles from selected store
      const { data: storeArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .eq('store_id', selectedStore.id);

      const articleIds = storeArticles?.map(a => a.id) || [];

      if (articleIds.length === 0) {
        setEntries([]);
        setStats({ total: 0, internal: 0, external: 0, totalClicks: 0, broken: 0, working: 0, unchecked: 0 });
        setLoading(false);
        return;
      }

      const { data: netlinkingData, error: netlinkingError } = await supabase
        .from('blog_netlinking')
        .select(`
          *,
          article:blog_articles!article_id(title)
        `)
        .eq('user_id', user?.id)
        .in('article_id', articleIds)
        .order('updated_at', { ascending: false });

      if (netlinkingError) throw netlinkingError;

      // Enrichir les données avec les infos produit/page
      const formattedData = await Promise.all(
        (netlinkingData || []).map(async (entry: any) => {
          let productPageName = t.netlinking.empty.unknownPage;
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
              productPageName = `${t.netlinking.empty.collection} "${lastPart.replace(/-/g, ' ')}"`;
            }
            // Vérifier si c'est une page
            else if (entry.target_url.includes('/pages/')) {
              const { data: page } = await supabase
                .from('shopify_pages')
                .select('title')
                .eq('handle', lastPart)
                .maybeSingle();
              
              productPageName = page?.title || `${t.netlinking.empty.page} "${lastPart.replace(/-/g, ' ')}"`;
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
            article_title: entry.article?.title || t.netlinking.empty.deletedArticle,
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
      const broken = formattedData.filter((e: any) => e.is_broken).length;
      const working = formattedData.filter((e: any) => !e.is_broken && e.last_checked_at).length;
      const unchecked = formattedData.filter((e: any) => !e.last_checked_at).length;

      setStats({ total, internal, external, totalClicks, broken, working, unchecked });
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

  const handleCheckLinks = async (linkIds?: string[]) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-broken-links', {
        body: { link_ids: linkIds },
      });

      if (error) throw error;

      if (data.broken > 0) {
        toast.warning(tf('netlinking.toasts.brokenDetected', { count: data.broken }));
      } else {
        toast.success(t.netlinking.toasts.allWorking);
      }

      await loadNetlinking();
    } catch (error: any) {
      console.error('Error checking links:', error);
      toast.error(t.common.error);
    } finally {
      setChecking(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!linkToDelete) return;

    try {
      const { error } = await supabase
        .from('blog_netlinking')
        .delete()
        .eq('id', linkToDelete);

      if (error) throw error;

      toast.success(t.netlinking.toasts.linkDeleted);
      await loadNetlinking();
    } catch (error: any) {
      console.error('Error deleting link:', error);
      toast.error(t.common.error);
    } finally {
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
    }
  };

  const exportToCSV = () => {
    const csv = [
      [t.netlinking.csv.article, t.netlinking.csv.targetUrl, t.netlinking.csv.anchorText, t.netlinking.csv.type, t.netlinking.csv.status, t.netlinking.csv.httpCode, t.netlinking.csv.clicks, t.netlinking.csv.lastCheck],
      ...entries.map((entry) => [
        entry.article_title,
        entry.target_url,
        entry.anchor_text,
        entry.link_type === 'internal' ? t.netlinking.status.internal : t.netlinking.status.external,
        entry.is_broken ? t.netlinking.status.broken : entry.last_checked_at ? t.netlinking.status.active : t.netlinking.status.unchecked,
        entry.http_status_code || '',
        entry.click_count,
        entry.last_checked_at ? new Date(entry.last_checked_at).toLocaleDateString() : '',
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
    toast.success(t.netlinking.toasts.csvExported);
  };

  const filteredEntries = entries.filter((entry) => {
    if (activeTab === 'broken') return entry.is_broken;
    if (activeTab === 'working') return !entry.is_broken && entry.last_checked_at;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => handleCheckLinks()}
          disabled={checking || entries.length === 0}
          variant="outline"
        >
          {checking ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2" />
          )}
          {t.netlinking.actions.checkAllLinks}
        </Button>
        <Button
          onClick={handleAnalyzeAllArticles}
          disabled={analyzing}
          size="default"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {analyzing ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              {t.netlinking.actions.analyzing}
            </>
          ) : (
            <>
              <Link className="w-5 h-5 mr-2" />
              {t.netlinking.actions.analyze}
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.netlinking.stats.totalLinks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.netlinking.stats.internalLinks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.internal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.netlinking.stats.externalLinks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.external}</div>
          </CardContent>
        </Card>

        <Card className={stats.broken > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {stats.broken > 0 && <AlertCircle className="w-4 h-4 text-destructive" />}
              {t.netlinking.stats.brokenLinks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.broken > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {stats.broken}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.netlinking.stats.totalClicks}</CardTitle>
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
                {t.netlinking.title}
              </CardTitle>
              <CardDescription>{t.netlinking.description}</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t.netlinking.actions.exportCsv}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t.blog.dialogs.netlinking.loading}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Link className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">{t.netlinking.empty.noLinks}</p>
              <p className="text-sm text-muted-foreground">{t.netlinking.empty.autoDetect}</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t.netlinking.tabs.all} ({stats.total})</TabsTrigger>
                <TabsTrigger value="broken" className={stats.broken > 0 ? "text-destructive" : ""}>
                  {t.netlinking.tabs.broken} ({stats.broken})
                </TabsTrigger>
                <TabsTrigger value="working">{t.netlinking.tabs.working} ({stats.working})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">{t.netlinking.table.headers.link}</TableHead>
                        <TableHead className="w-[100px]">{t.netlinking.table.headers.status}</TableHead>
                        <TableHead className="w-[180px]">{t.netlinking.table.headers.productPage}</TableHead>
                        <TableHead className="w-[200px]">{t.netlinking.table.headers.linkedArticle}</TableHead>
                        <TableHead className="w-[100px]">{t.netlinking.table.headers.type}</TableHead>
                        <TableHead className="w-[120px]">{t.netlinking.table.headers.seoScore}</TableHead>
                        <TableHead className="w-[200px] text-right">{t.netlinking.table.headers.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const scoreColor = entry.seo_score >= 80 ? 'text-green-600' : entry.seo_score >= 60 ? 'text-orange-600' : 'text-red-600';
                        const scoreEmoji = entry.seo_score >= 80 ? '🟢' : entry.seo_score >= 60 ? '🟠' : '🔴';
                        
                        return (
                          <TableRow key={entry.id} 
                            className={`hover:bg-muted/50 ${entry.is_broken ? 'bg-destructive/5' : ''}`}
                          >
                          <TableCell>
                            <a
                              href={entry.target_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1 hover:underline text-sm font-medium ${
                                entry.is_broken ? 'text-destructive' : 'text-blue-600'
                              }`}
                              title={entry.target_url}
                            >
                              <span className="truncate max-w-[280px]">{entry.target_url}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {entry.is_broken ? (
                                    <Badge variant="destructive" className="gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      {t.netlinking.status.broken}
                                    </Badge>
                                  ) : entry.last_checked_at ? (
                                    <Badge variant="default" className="bg-green-600 gap-1">
                                      <span className="w-2 h-2 bg-white rounded-full" />
                                      {t.netlinking.status.active}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      {t.netlinking.status.unchecked}
                                    </Badge>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {entry.is_broken ? (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-destructive">{t.netlinking.tooltips.brokenLink}</p>
                                      <p>{t.netlinking.tooltips.code}: {entry.http_status_code || 'Timeout'}</p>
                                      {entry.error_message && <p className="text-xs">{entry.error_message}</p>}
                                      {entry.broken_since && (
                                        <p className="text-xs">
                                          {t.netlinking.tooltips.since}: {new Date(entry.broken_since).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  ) : entry.last_checked_at ? (
                                    <div className="space-y-1">
                                      <p>{t.netlinking.tooltips.verified}: {new Date(entry.last_checked_at).toLocaleDateString()}</p>
                                      <p>{t.netlinking.tooltips.httpCode}: {entry.http_status_code}</p>
                                    </div>
                                  ) : (
                                    <p>{t.netlinking.tooltips.notVerified}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                                {entry.link_type === 'internal' ? t.netlinking.status.internal : t.netlinking.status.external}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 font-semibold ${scoreColor}`}>
                                <span className="text-lg">{scoreEmoji}</span>
                                <span>{entry.seo_score}/100</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {entry.is_broken ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedLink(entry);
                                        setReplaceDialogOpen(true);
                                      }}
                                      title={t.netlinking.tooltips.replace}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      {t.netlinking.actions.replace}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCheckLinks([entry.id])}
                                      disabled={checking}
                                      title={t.netlinking.tooltips.recheck}
                                    >
                                      <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setLinkToDelete(entry.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      title={t.netlinking.tooltips.delete}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCheckLinks([entry.id])}
                                      disabled={checking}
                                      title={t.netlinking.tooltips.check}
                                    >
                                      <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(entry.target_url, '_blank')}
                                      title={t.netlinking.tooltips.viewLink}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

{/* Section Génération Articles */}
<Card className="mt-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="w-5 h-5" />
      {t.netlinking.generation.title}
    </CardTitle>
    <CardDescription>
      {t.netlinking.generation.description}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          onClick={async () => {
            try {
              toast.info(t.netlinking.generation.analyzingCatalog);
              const { data, error } = await supabase.functions.invoke('generate-daily-opportunities');
              if (error) throw error;
              toast.success(t.netlinking.generation.articlesGenerated);
              loadNetlinking();
            } catch (error: any) {
              toast.error(error.message || t.netlinking.generation.errorGeneration);
            }
          }}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t.netlinking.generation.generateForProducts}
        </Button>
        <Button
          onClick={async () => {
            try {
              toast.info(t.netlinking.generation.analyzingPages);
              const { data, error } = await supabase.functions.invoke('generate-daily-opportunities');
              if (error) throw error;
              toast.success(t.netlinking.generation.articlesGeneratedPages);
              loadNetlinking();
            } catch (error: any) {
              toast.error(error.message || t.netlinking.generation.errorGeneration);
            }
          }}
          variant="outline"
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          {t.netlinking.generation.generateForPages}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t.netlinking.generation.aiNote}
      </p>
    </div>
  </CardContent>
</Card>
      <ReplaceLinkDialog
        open={replaceDialogOpen}
        onClose={() => {
          setReplaceDialogOpen(false);
          setSelectedLink(null);
        }}
        link={selectedLink}
        onSuccess={() => loadNetlinking()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.netlinking.deleteConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.netlinking.deleteConfirm.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.netlinking.deleteConfirm.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink} className="bg-destructive">
              {t.netlinking.deleteConfirm.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
