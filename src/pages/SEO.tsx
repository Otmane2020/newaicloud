import { useState } from 'react';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { Sparkles, Tags, Image, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SEO() {
  const [activeTab, setActiveTab] = useState('optimization');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          Optimisation SEO
        </h1>
        <p className="text-muted-foreground text-lg">
          Gérez l'optimisation SEO de vos produits
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="alt" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            ALT
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="mt-6">
          <SeoOptimization />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <TagOptimization />
        </TabsContent>

        <TabsContent value="alt" className="mt-6">
          <SeoAltImage />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <SeoAutomation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
