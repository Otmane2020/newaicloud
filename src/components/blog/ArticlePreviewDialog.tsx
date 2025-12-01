import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Eye, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { GoogleSearchPreview } from '../seo/GoogleSearchPreview';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/language';

interface ArticlePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    title: string;
    content: string;
    featured_image?: string;
    seo_title?: string;
    meta_description?: string;
    handle?: string;
    published_at?: string;
  } | null;
  shopifyUrl?: string;
  onPublishToShopify?: () => void;
}

export function ArticlePreviewDialog({ open, onOpenChange, article, shopifyUrl, onPublishToShopify }: ArticlePreviewDialogProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { t } = useTranslation();
  
  if (!article) return null;
  
  const handleViewOnShopify = () => {
    if (shopifyUrl) {
      window.open(shopifyUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] h-[98vh] p-0">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">{t.dialogs.articlePreview.title}</DialogTitle>
          </div>
          
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
              <TabsList className="h-8">
                <TabsTrigger value="desktop" className="h-7 px-3 text-xs">
                  <Monitor className="w-3 h-3 mr-1" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile" className="h-7 px-3 text-xs">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 rounded-full"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-muted/30">
          <ScrollArea className="h-full">
            <div className="flex justify-center p-6">
              {/* Preview Container */}
              <div className={cn(
                "bg-background rounded-lg shadow-xl transition-all duration-300",
                viewMode === 'desktop' ? "w-full max-w-5xl" : "w-[375px]"
              )}>
                {/* Google Search Preview */}
                <div className="p-4 border-b">
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground">{t.dialogs.articlePreview.googlePreview}</h3>
                  <GoogleSearchPreview
                    title={article.seo_title || article.title}
                    description={article.meta_description || t.dialogs.articlePreview.missingDescription}
                    url={`https://yourstore.com/blogs/news/${article.handle || 'article'}`}
                    compact={viewMode === 'mobile'}
                  />
                </div>

                {/* Article Content */}
                <div className="p-6">
                  <article className={cn(
                    "prose prose-slate dark:prose-invert max-w-none",
                    viewMode === 'mobile' && "prose-sm"
                  )}>
                    {article.featured_image && (
                      <div className="mb-6 -mx-6">
                        <img
                          src={article.featured_image}
                          alt={article.title}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                    
                    <h1 className={cn(
                      "font-bold mb-4",
                      viewMode === 'desktop' ? "text-3xl" : "text-2xl"
                    )}>
                      {article.title}
                    </h1>
                    
                    <div 
                      className="article-content prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80"
                      dangerouslySetInnerHTML={{ __html: article.content }} 
                    />
                  </article>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Compact Footer */}
        <div className="flex justify-between gap-2 px-4 py-3 border-t bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t.dialogs.articlePreview.close}
          </Button>
          
          <div className="flex gap-2">
            {shopifyUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewOnShopify}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t.blog.articleGeneration.viewOnShopify}
              </Button>
            ) : onPublishToShopify && (
              <Button
                size="sm"
                onClick={onPublishToShopify}
                className="bg-[#95BF47] hover:bg-[#7DA839] text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t.blog.articleGeneration.publishToShopify}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
