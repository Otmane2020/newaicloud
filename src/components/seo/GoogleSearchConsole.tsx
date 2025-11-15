import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { GoogleSearchConsoleIntegration } from './GoogleSearchConsoleIntegration';
import { GoogleSearchConsoleInsights } from './GoogleSearchConsoleInsights';
import { GoogleSearchConsoleProducts } from './GoogleSearchConsoleProducts';
import { GoogleSearchConsoleArticles } from './GoogleSearchConsoleArticles';
import { GoogleSearchConsoleSitemaps } from './GoogleSearchConsoleSitemaps';
import { BarChart3, Package, FileText, FileCode, Plug, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function GoogleSearchConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  
  const activeSubTab = searchParams.get('subtab') || 'integration';

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_oauth_token')
        .eq('id', user.id)
        .single();

      const connected = !!profile?.google_oauth_token;
      setIsConnected(connected);

      if (connected) {
        await fetchAvailableDomains();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const fetchAvailableDomains = async () => {
    try {
      setLoadingDomains(true);
      const { data, error } = await supabase.functions.invoke('list-search-console-sites');

      if (error) throw error;

      if (data?.success && data.sites) {
        const domains = data.sites.map((site: any) => site.siteUrl);
        setAvailableDomains(domains);
        
        if (domains.length > 0 && !selectedDomain) {
          setSelectedDomain(domains[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Erreur lors du chargement des domaines');
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('subtab', value);
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Google Search Console</h2>
        <p className="text-muted-foreground mt-2">
          Analysez vos performances SEO et optimisez votre visibilité
        </p>
      </div>

      {isConnected && activeSubTab !== 'integration' && availableDomains.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="domain-select" className="text-sm font-medium mb-2 block">
                Domaine actif: {selectedDomain || 'Aucun'}
              </Label>
              {availableDomains.length > 1 && (
                <Select value={selectedDomain} onValueChange={setSelectedDomain} disabled={loadingDomains}>
                  <SelectTrigger id="domain-select" className="w-full">
                    <SelectValue placeholder={loadingDomains ? "Chargement..." : "Sélectionner un domaine"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="integration" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integration</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Articles</span>
          </TabsTrigger>
          <TabsTrigger value="sitemaps" className="gap-2">
            <FileCode className="h-4 w-4" />
            <span className="hidden sm:inline">Sitemaps</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="mt-6">
          <GoogleSearchConsoleIntegration onConnectionChange={checkConnection} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <GoogleSearchConsoleInsights selectedDomain={selectedDomain} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <GoogleSearchConsoleProducts selectedDomain={selectedDomain} />
        </TabsContent>

        <TabsContent value="articles" className="mt-6">
          <GoogleSearchConsoleArticles selectedDomain={selectedDomain} />
        </TabsContent>

        <TabsContent value="sitemaps" className="mt-6">
          <GoogleSearchConsoleSitemaps selectedDomain={selectedDomain} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
