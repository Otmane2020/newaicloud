import { useState } from 'react';
import { ProductSearch } from '@/components/seo/ProductSearch';
import { AISearchEmbed } from '@/components/seo/AISearchEmbed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Code } from 'lucide-react';

export default function SearchProducts() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Code Liquid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <ProductSearch />
        </TabsContent>

        <TabsContent value="embed" className="mt-6">
          <AISearchEmbed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
