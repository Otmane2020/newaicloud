import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleSearchConsoleSitemapsProps {
  selectedDomain: string;
}

interface Sitemap {
  path: string;
  type?: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  errors?: number;
  warnings?: number;
  contents?: Array<{
    type: string;
    submitted: number;
    indexed: number;
  }>;
}

export function GoogleSearchConsoleSitemaps({ selectedDomain }: GoogleSearchConsoleSitemapsProps) {
  const { t } = useTranslation();
  const { selectedStore } = useStore();
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedStore?.store_url) {
      const cleanUrl = selectedStore.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      setSitemapUrl(`https://${cleanUrl}/sitemap.xml`);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedDomain) {
      loadSitemaps();
    }
  }, [selectedDomain]);

  const loadSitemaps = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      console.log('[Sitemaps] 📋 Loading sitemaps for:', selectedDomain);

      const { data, error } = await supabase.functions.invoke('list-gsc-sitemaps', {
        body: { siteUrl: selectedDomain },
      });

      if (error) {
        console.error('[Sitemaps] ❌ Error:', error);
        toast.error('Erreur lors du chargement des sitemaps');
        return;
      }

      if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Google Search Console non connecté');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors du chargement des sitemaps');
        return;
      }

      setSitemaps(data.sitemaps || []);
      console.log('[Sitemaps] ✅ Loaded', data.sitemaps?.length || 0, 'sitemaps');
    } catch (error) {
      console.error('[Sitemaps] ❌ Error:', error);
      toast.error('Erreur lors du chargement des sitemaps');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSitemap = async () => {
    if (!sitemapUrl || !selectedDomain) {
      toast.error('URL du sitemap manquante');
      return;
    }

    try {
      setSubmitting(true);
      console.log('[Sitemaps] 📤 Submitting sitemap:', sitemapUrl);

      const { data, error } = await supabase.functions.invoke('submit-gsc-sitemap', {
        body: {
          siteUrl: selectedDomain,
          sitemapUrl: sitemapUrl,
        },
      });

      if (error) {
        console.error('[Sitemaps] ❌ Error:', error);
        toast.error('Erreur lors de la soumission du sitemap');
        return;
      }

      if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Google Search Console non connecté');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors de la soumission du sitemap');
        return;
      }

      toast.success('Sitemap soumis avec succès');
      
      // Reload sitemaps after submission
      setTimeout(() => loadSitemaps(), 2000);
    } catch (error) {
      console.error('[Sitemaps] ❌ Error:', error);
      toast.error('Erreur lors de la soumission du sitemap');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalStats = () => {
    let indexed = 0;
    let pending = 0;
    let errors = 0;

    sitemaps.forEach(sitemap => {
      if (sitemap.contents) {
        sitemap.contents.forEach(content => {
          indexed += content.indexed || 0;
          pending += (content.submitted || 0) - (content.indexed || 0);
        });
      }
      errors += sitemap.errors || 0;
    });

    return { indexed, pending, errors };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t.searchConsole.sitemaps.title}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t.searchConsole.sitemaps.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <Card className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{loading ? '-' : stats.indexed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.indexed}</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{loading ? '-' : stats.pending.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.pending}</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{loading ? '-' : stats.errors}</p>
                <p className="text-sm text-muted-foreground">{t.searchConsole.sitemaps.errors}</p>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-accent/50">
            <h3 className="font-semibold mb-4">{t.searchConsole.sitemaps.submitSitemap}</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t.searchConsole.sitemaps.placeholder}
              />
              <Button onClick={handleSubmitSitemap} disabled={submitting || !sitemapUrl}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  t.searchConsole.sitemaps.submitButton
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t.searchConsole.sitemaps.submitSitemapDescription}
            </p>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-4">Chargement des sitemaps...</p>
            </div>
          ) : sitemaps.length > 0 ? (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Sitemaps soumis</h3>
              <div className="space-y-3">
                {sitemaps.map((sitemap, index) => (
                  <div key={index} className="p-4 bg-accent/30 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm break-all">{sitemap.path}</p>
                        {sitemap.lastSubmitted && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Soumis le: {new Date(sitemap.lastSubmitted).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      {sitemap.isPending && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          En attente
                        </span>
                      )}
                    </div>
                    {sitemap.contents && sitemap.contents.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        {sitemap.contents.map((content, cIndex) => (
                          <div key={cIndex} className="text-center p-2 bg-background rounded">
                            <p className="font-medium">{content.type}</p>
                            <p className="text-muted-foreground">
                              {content.indexed}/{content.submitted}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun sitemap soumis pour le moment
              </p>
            </Card>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={loadSitemaps} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
