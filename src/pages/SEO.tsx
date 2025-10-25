import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { GoogleMerchant } from '@/components/seo/GoogleMerchant';
import { GoogleShopping } from '@/components/seo/GoogleShopping';
import { ProductSearch } from '@/components/seo/ProductSearch';
import { Sparkles, Tags, Image, Settings, ShoppingBag, ShoppingCart, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'optimization');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['optimization', 'tags', 'alt', 'automation', 'merchant', 'shopping', 'search'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs = [
    {
      id: 'optimization',
      label: 'SEO',
      icon: Sparkles,
      description: 'Titre & Meta'
    },
    {
      id: 'tags',
      label: 'Tags',
      icon: Tags,
      description: 'Organisation'
    },
    {
      id: 'alt',
      label: 'ALT Text',
      icon: Image,
      description: 'Images'
    },
    {
      id: 'automation',
      label: 'Automation',
      icon: Settings,
      description: 'Paramètres'
    },
    {
      id: 'merchant',
      label: 'Merchant',
      icon: ShoppingBag,
      description: 'Flux XML'
    },
    {
      id: 'shopping',
      label: 'Shopping',
      icon: ShoppingCart,
      description: 'Google Ads'
    },
    {
      id: 'search',
      label: 'Recherche',
      icon: Search,
      description: 'IA Search'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Optimisation SEO
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Gérez l'optimisation SEO de vos produits
        </p>
      </div>

      {/* Mobile-friendly Tab Navigation - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Card
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams({ tab: tab.id });
              }}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg border-primary ring-2 ring-primary"
                  : "hover:bg-muted border-2 border-transparent hover:border-primary/20"
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Icon className={cn(
                  "w-6 h-6 md:w-7 md:h-7 transition-transform",
                  isActive && "animate-scale-in"
                )} />
                <div>
                  <div className="font-semibold text-sm md:text-base">{tab.label}</div>
                  <div className={cn(
                    "text-xs mt-1",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'optimization' && <SeoOptimization />}
        {activeTab === 'tags' && <TagOptimization />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'merchant' && <GoogleMerchant />}
        {activeTab === 'shopping' && <GoogleShopping />}
        {activeTab === 'search' && <ProductSearch />}
      </div>
    </div>
  );
}
