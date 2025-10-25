import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { Sparkles, Tags, Image } from 'lucide-react';

export default function SEO() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Optimisation SEO
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez l'optimisation SEO de vos produits
          </p>
        </div>

        <Tabs defaultValue="seo-optimization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsTrigger value="seo-optimization" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              SEO Optimisation
            </TabsTrigger>
            <TabsTrigger value="tag-optimization" className="flex items-center gap-2">
              <Tags className="w-4 h-4" />
              Tag Optimisation
            </TabsTrigger>
            <TabsTrigger value="alt-image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              ALT Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seo-optimization" className="space-y-6">
            <SeoOptimization />
          </TabsContent>

          <TabsContent value="tag-optimization" className="space-y-6">
            <TagOptimization />
          </TabsContent>

          <TabsContent value="alt-image" className="space-y-6">
            <SeoAltImage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}