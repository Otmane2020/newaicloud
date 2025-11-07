import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { GoogleSearchConsoleIntegration } from './GoogleSearchConsoleIntegration';
import { GoogleSearchConsoleInsights } from './GoogleSearchConsoleInsights';
import { GoogleSearchConsoleProducts } from './GoogleSearchConsoleProducts';
import { GoogleSearchConsoleSitemaps } from './GoogleSearchConsoleSitemaps';
import { GoogleSearchConsoleArticles } from './GoogleSearchConsoleArticles';
import { TrendingUp, Package, FileText, Link } from 'lucide-react';

export function GoogleSearchConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subtab = searchParams.get('subtab') || 'integration';
  const [isConnected, setIsConnected] = useState(false);
  const [googleConsoleEmail, setGoogleConsoleEmail] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  useEffect(() => {
    checkGoogleConnection();
    handleOAuthCallback();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: 'google-console', subtab: value });
  };

  const handleOAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_CODE',
          code: code,
        }, window.location.origin);
        
        setTimeout(() => window.close(), 1000);
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_oauth_token, google_console_email')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_oauth_token);
      setGoogleConsoleEmail(profile?.google_console_email || null);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Console Google Search</h2>
          <p className="text-muted-foreground">
            Connectez votre compte et analysez les performances de votre site
          </p>
        </div>
      </Card>

      {!isConnected ? (
        <GoogleSearchConsoleIntegration
          isConnected={isConnected}
          googleConsoleEmail={googleConsoleEmail}
          selectedDomain={selectedDomain}
          onDomainSelect={setSelectedDomain}
          onConnectionChange={checkGoogleConnection}
        />
      ) : (
        <Tabs value={subtab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="integration" className="gap-2">
              <Link className="h-4 w-4" />
              Intégration
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="sitemaps" className="gap-2">
              <FileText className="h-4 w-4" />
              Sitemaps
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integration">
            <GoogleSearchConsoleIntegration
              isConnected={isConnected}
              googleConsoleEmail={googleConsoleEmail}
              selectedDomain={selectedDomain}
              onDomainSelect={setSelectedDomain}
              onConnectionChange={checkGoogleConnection}
            />
          </TabsContent>

          <TabsContent value="insights">
            {selectedDomain ? (
              <GoogleSearchConsoleInsights selectedDomain={selectedDomain} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Sélectionnez un domaine dans l'onglet Intégration</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="products">
            <GoogleSearchConsoleProducts selectedDomain={selectedDomain} />
          </TabsContent>

          <TabsContent value="sitemaps">
            <GoogleSearchConsoleSitemaps selectedDomain={selectedDomain} />
          </TabsContent>

          <TabsContent value="articles">
            <GoogleSearchConsoleArticles selectedDomain={selectedDomain} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
