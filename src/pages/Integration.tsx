import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { CollectionImportSelector } from '@/components/integration/CollectionImportSelector';
import { StoreMetadataForm } from '@/components/integration/StoreMetadataForm';
import { ShopifySyncSettings } from '@/components/integration/ShopifySyncSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/language';

export default function Integration() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                {t.integration.title}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
                {t.integration.description}
              </p>
            </div>
            <CollectionImportSelector />
          </div>
        </div>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">{t.integration.tabs.connections}</TabsTrigger>
            <TabsTrigger value="sync">{t.integration.tabs.sync}</TabsTrigger>
            <TabsTrigger value="metadata">{t.integration.tabs.metadata}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connections" className="space-y-6">
            <ShopifyIntegrationTabs />
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-6">
            <ShopifySyncSettings />
          </TabsContent>
          
          <TabsContent value="metadata" className="space-y-6">
            <StoreMetadataForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
