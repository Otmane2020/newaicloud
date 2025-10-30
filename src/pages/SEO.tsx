import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { PageOptimization } from '@/components/seo/PageOptimization';
import { HomePageSeo } from '@/components/seo/HomePageSeo';
import { SeoKPIs } from '@/components/seo/SeoKPIs';
import ArticleManagement from '@/pages/ArticleManagement';
import { Sparkles, Tags, Image, Settings, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'optimization');
  const { t } = useTranslation();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['optimization', 'tags', 'pages', 'articles', 'homepage', 'alt', 'automation', 'kpis'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t('seo.title')}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {t('seo.description')}
        </p>
      </div>

      {/* Tab Content - Navigation via sidebar uniquement */}
      <div className="mt-6">
        {activeTab === 'optimization' && <SeoOptimization />}
        {activeTab === 'tags' && <TagOptimization />}
        {activeTab === 'pages' && <PageOptimization />}
        {activeTab === 'articles' && <ArticleManagement />}
        {activeTab === 'homepage' && <HomePageSeo />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'kpis' && <SeoKPIs />}
      </div>
    </div>
  );
}
