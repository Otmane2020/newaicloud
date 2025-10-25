import { useState } from 'react';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { Sparkles, Tags, Image, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SEO() {
  const [activeTab, setActiveTab] = useState('optimization');

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

      {/* Mobile-friendly Tab Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Card
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "p-4 cursor-pointer transition-all hover:shadow-md",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg border-primary"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Icon className="w-6 h-6 md:w-7 md:h-7" />
                <div>
                  <div className="font-semibold text-sm md:text-base">{tab.label}</div>
                  <div className={cn(
                    "text-xs mt-1",
                    activeTab === tab.id ? "text-primary-foreground/80" : "text-muted-foreground"
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
      </div>
    </div>
  );
}
