import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { PageOptimization } from '@/components/seo/PageOptimization';
import { HomePageSeo } from '@/components/seo/HomePageSeo';
import { HomePageSeoAudit } from '@/components/seo/HomePageSeoAudit';
import { SeoKPIs } from '@/components/seo/SeoKPIs';
import ArticleManagement from '@/pages/ArticleManagement';
import { Sparkles, Tags, Image, Settings, FileText, PenSquare, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'optimization');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['optimization', 'tags', 'pages', 'articles', 'homepage', 'audit', 'alt', 'automation', 'kpis'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          SEO Optimization
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Optimize your store for search engines with AI-powered tools
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
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenSquare className="w-6 h-6 text-blue-600" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Articles SEO Management
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    Optimize your blog articles with AI-powered SEO. Improve titles, meta descriptions, and boost your organic traffic by 40%.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">SEO Optimized</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">+40% Traffic</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">AI Enhanced</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">85/100</div>
                    <div className="text-sm text-muted-foreground">SEO Score</div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Optimize Articles
                    <FileText className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
            <ArticleManagement />
          </>
        )}
        {activeTab === 'homepage' && <HomePageSeoAudit />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'kpis' && <SeoKPIs />}
      </div>
    </div>
  );
}
