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
import { Sparkles, Tags, Image, Settings, FileText, PenSquare } from 'lucide-react';
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
        {activeTab === 'articles' && (
          <>
            {/* Banner for Articles */}
            <Card className="mb-6 overflow-hidden border-0 shadow-xl">
              <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <PenSquare className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Articles SEO Management</h2>
                      <p className="text-white/90 mt-1">Optimize your blog articles for search engines</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-sm text-white/80">SEO Titles</div>
                      <div className="text-xl font-bold">Optimize</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-sm text-white/80">Meta Descriptions</div>
                      <div className="text-xl font-bold">Enhance</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-sm text-white/80">SEO Score</div>
                      <div className="text-xl font-bold">Track</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-sm text-white/80">Shopify Sync</div>
                      <div className="text-xl font-bold">Publish</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <ArticleManagement />
          </>
        )}
        {activeTab === 'homepage' && <HomePageSeo />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'kpis' && <SeoKPIs />}
      </div>
    </div>
  );
}
