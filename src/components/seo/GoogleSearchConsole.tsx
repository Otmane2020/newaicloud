import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GoogleSearchConsoleIntegration } from './GoogleSearchConsoleIntegration';
import { GoogleSearchConsoleInsights } from './GoogleSearchConsoleInsights';
import { GoogleSearchConsoleProducts } from './GoogleSearchConsoleProducts';
import { GoogleSearchConsoleArticles } from './GoogleSearchConsoleArticles';
import { GoogleSearchConsoleSitemaps } from './GoogleSearchConsoleSitemaps';
import { BarChart3, Package, FileText, FileCode, Plug } from 'lucide-react';

export function GoogleSearchConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  
  const activeSubTab = searchParams.get('subtab') || 'integration';

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
          <GoogleSearchConsoleIntegration />
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
