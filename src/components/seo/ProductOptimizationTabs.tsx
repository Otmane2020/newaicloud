import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import { SeoOptimization } from './SeoOptimization';

interface ProductOptimizationTabsProps {
  defaultTab?: string;
}

export const ProductOptimizationTabs = ({ defaultTab = 'seo' }: ProductOptimizationTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-1">
        <TabsTrigger value="seo" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Métadonnées SEO</span>
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="seo" className="space-y-4">
          <SeoOptimization />
        </TabsContent>
      </div>
    </Tabs>
  );
};
