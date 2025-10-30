import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Upload, Home, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';

export function HomePageSeo() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [hasConnection, setHasConnection] = useState(false);

  useEffect(() => {
    checkShopifyConnection();
  }, []);

  const checkShopifyConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setHasConnection(!!data);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const generateSeoWithAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-page-seo', {
        body: { 
          pageId: 'homepage',
          isHomepage: true
        }
      });

      if (error) throw error;

      if (data.seo_title && data.seo_description) {
        setSeoTitle(data.seo_title);
        setSeoDescription(data.seo_description);
        toast.success(t('seo.homepage.generated'));
      }
    } catch (error: any) {
      console.error('Error generating SEO:', error);
      toast.error(error.message || t('seo.homepage.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const syncToShopify = async () => {
    if (!seoTitle || !seoDescription) {
      toast.error(t('seo.homepage.fillFields'));
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-homepage-seo', {
        body: { 
          seoTitle,
          seoDescription
        }
      });

      if (error) throw error;

      toast.success(t('seo.homepage.synced'));
    } catch (error: any) {
      console.error('Error syncing to Shopify:', error);
      
      if (error.message?.includes('Permission denied')) {
        toast.error(t('seo.homepage.permissionError'), {
          description: t('seo.homepage.permissionHelp'),
          duration: 8000
        });
      } else {
        toast.error(error.message || t('seo.homepage.syncError'));
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!hasConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            {t('seo.homepage.title')}
          </CardTitle>
          <CardDescription>{t('seo.homepage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('seo.homepage.noConnection')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-950 dark:via-sky-950 dark:to-blue-950 border-2 border-cyan-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Home className="w-6 h-6 text-cyan-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                SEO Page d'Accueil
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Optimisez le SEO de votre page d'accueil Shopify. Créez une première impression inoubliable et boostez votre taux de conversion.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span className="font-medium">IA intelligente</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-sky-600" />
                <span className="font-medium">Page vitrine</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Sync instantané</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Button
              size="lg"
              onClick={generateSeoWithAI}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Générer avec IA</>
              )}
            </Button>
          </div>
        </div>
      </Card>

    <Card>
      <CardContent className="space-y-6 pt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('seo.homepage.info')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seo-title">{t('seo.homepage.seoTitle')}</Label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={t('seo.homepage.seoTitlePlaceholder')}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {seoTitle.length}/60 {t('seo.homepage.characters')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-description">{t('seo.homepage.seoDescription')}</Label>
            <Textarea
              id="seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder={t('seo.homepage.seoDescriptionPlaceholder')}
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {seoDescription.length}/160 {t('seo.homepage.characters')}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={generateSeoWithAI}
            disabled={generating}
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? t('seo.homepage.generating') : t('seo.homepage.generate')}
          </Button>

          <Button
            onClick={syncToShopify}
            disabled={syncing || !seoTitle || !seoDescription}
          >
            <Upload className="h-4 w-4 mr-2" />
            {syncing ? t('seo.homepage.syncing') : t('seo.homepage.sync')}
          </Button>
        </div>

        {/* Preview */}
        {(seoTitle || seoDescription) && (
          <div className="mt-6 p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {t('seo.homepage.preview')}
              </p>
              <SeoConfidenceBadge 
                seoTitle={seoTitle} 
                seoDescription={seoDescription}
              />
            </div>
            {seoTitle && (
              <h3 className="text-lg font-semibold text-primary">
                {seoTitle}
              </h3>
            )}
            {seoDescription && (
              <p className="text-sm text-muted-foreground">
                {seoDescription}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
