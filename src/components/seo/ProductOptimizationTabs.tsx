import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Sparkles, FileText, Image } from 'lucide-react';
import { SeoOptimization } from './SeoOptimization';

import { ProductMediaOptimization } from './ProductMediaOptimization';
import { ProductContentOptimization } from './ProductContentOptimization';

interface ProductOptimizationTabsProps {
  defaultTab?: string;
}

export const ProductOptimizationTabs = ({ defaultTab = 'seo' }: ProductOptimizationTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="seo" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Métadonnées SEO</span>
          <span className="sm:hidden">SEO</span>
        </TabsTrigger>
        <TabsTrigger value="content" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Titre & Description</span>
          <span className="sm:hidden">Contenu</span>
        </TabsTrigger>
        <TabsTrigger value="media" className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          <span>Media</span>
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="seo" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Métadonnées SEO</h2>
            <p className="text-muted-foreground">
              Optimisez les méta-données SEO (title, description) pour améliorer votre référencement
            </p>
          </div>
          <SeoOptimization />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Titre & Description</h2>
            <p className="text-muted-foreground">
              Créez des titres accrocheurs et descriptions riches pour vos produits
            </p>
          </div>
          <ProductContentOptimization />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Optimisation Media</h2>
            <p className="text-muted-foreground">
              Optimisez vos images produits avec IA - Fond blanc, arrière-plans créatifs
            </p>
          </div>
          <ProductMediaOptimization />
        </TabsContent>
      </div>
    </Tabs>
  );
};
