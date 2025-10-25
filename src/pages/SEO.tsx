import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { Sparkles, Tags, Image, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function SEO() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">
          Optimisation SEO
        </h1>
        <p className="text-muted-foreground text-lg">
          Gérez l'optimisation SEO de vos produits
        </p>
      </div>

      {/* SEO Optimization Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">SEO Optimisation</h2>
            <p className="text-sm text-muted-foreground">
              Optimisez les meta tags et descriptions de vos produits
            </p>
          </div>
        </div>
        <SeoOptimization />
      </div>

      {/* Tag Optimization Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Tags className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Tag Optimisation</h2>
            <p className="text-sm text-muted-foreground">
              Organisez vos produits avec des tags pertinents
            </p>
          </div>
        </div>
        <TagOptimization />
      </div>

      {/* ALT Image Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Image className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">ALT Image</h2>
            <p className="text-sm text-muted-foreground">
              Améliorez l'accessibilité avec des textes ALT optimisés
            </p>
          </div>
        </div>
        <SeoAltImage />
      </div>

      {/* Automation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Automatisation</h2>
            <p className="text-sm text-muted-foreground">
              Configurez l'automatisation de vos optimisations
            </p>
          </div>
        </div>
        <SeoAutomation />
      </div>
    </div>
  );
}
