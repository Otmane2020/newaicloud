import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Upload, Home, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';

export function HomePageSeo() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
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
        toast.success('SEO content generated successfully');
      }
    } catch (error: any) {
      console.error('Error generating SEO:', error);
      toast.error(error.message || 'Error generating SEO content');
    } finally {
      setGenerating(false);
    }
  };

  const syncToShopify = async () => {
    if (!seoTitle || !seoDescription) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Récupérer la connexion Shopify pour obtenir l'URL du store
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: connection } = await supabase
      .from('shopify_connections')
      .select('store_url')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!connection) {
      toast.error('Aucune connexion Shopify active trouvée');
      return;
    }

    // Afficher un message informatif avec lien direct
    toast.info(
      <div className="space-y-2">
        <p className="font-semibold">⚠️ Synchronisation manuelle requise</p>
        <p className="text-sm">
          Les champs SEO de la homepage ne peuvent pas être modifiés automatiquement via l'API Shopify.
        </p>
        <p className="text-sm font-medium">
          Copiez les valeurs ci-dessous et collez-les manuellement dans :
        </p>
        <a
          href={`https://${connection.store_url}/admin/settings/general`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Préférences Shopify → SEO de la page d'accueil
          <ExternalLink className="h-3 w-3" />
        </a>
        <div className="mt-2 space-y-1 rounded-md bg-muted p-2 text-xs">
          <div>
            <span className="font-semibold">Titre :</span>
            <br />
            <code className="break-all">{seoTitle}</code>
          </div>
          <div className="mt-1">
            <span className="font-semibold">Description :</span>
            <br />
            <code className="break-all">{seoDescription}</code>
          </div>
        </div>
      </div>,
      { 
        duration: 15000,
        className: 'max-w-xl'
      }
    );

    // Copier automatiquement dans le presse-papiers
    try {
      await navigator.clipboard.writeText(
        `Titre: ${seoTitle}\n\nDescription: ${seoDescription}`
      );
      toast.success('✓ Valeurs copiées dans le presse-papiers', {
        duration: 3000
      });
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  };

  if (!hasConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Homepage SEO
          </CardTitle>
          <CardDescription>Optimize your Shopify homepage for search engines</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Shopify store first to use this feature
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
                Homepage SEO
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Optimize your Shopify homepage SEO. Create an unforgettable first impression and boost your conversion rate.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span className="font-medium">Smart AI</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-sky-600" />
                <span className="font-medium">Showcase page</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Instant sync</span>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</>
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
            Optimize your homepage meta tags to improve search engine visibility
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seo-title">SEO Title</Label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Enter your homepage title..."
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {seoTitle.length}/60 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-description">SEO Description</Label>
            <Textarea
              id="seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Enter your homepage description..."
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {seoDescription.length}/160 characters
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
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>

          <Button
            onClick={syncToShopify}
            disabled={!seoTitle || !seoDescription}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Copier & Ouvrir Shopify
          </Button>
        </div>

        {/* Preview */}
        {(seoTitle || seoDescription) && (
          <div className="mt-6 p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Search Result Preview
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
