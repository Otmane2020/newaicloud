import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { FileText, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Article {
  id: string;
  title: string;
  created_at: string;
  status: string;
  content: string;
  meta_description: string | null;
  featured_image: string | null;
}

interface CampaignArticlesDialogProps {
  campaignId: string | null;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignArticlesDialog({ 
  campaignId, 
  campaignName, 
  open, 
  onOpenChange 
}: CampaignArticlesDialogProps) {
  const { t, language } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (campaignId && open) {
      loadArticles();
    }
  }, [campaignId, open]);

  const loadArticles = async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, title, created_at, status, content, meta_description, featured_image')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading campaign articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Publié</Badge>;
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open && !previewArticle} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Articles: {campaignName}
          </DialogTitle>
        </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucun article généré par cette campagne
            </p>
          </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.blogCampaigns.table.title}</TableHead>
                    <TableHead>{t.blogCampaigns.table.createdAt}</TableHead>
                    <TableHead>{t.blogCampaigns.table.status}</TableHead>
                    <TableHead className="text-right">{t.blogCampaigns.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {article.featured_image && (
                            <img 
                              src={article.featured_image} 
                              alt={article.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{article.title}</p>
                            {article.meta_description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {article.meta_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(article.created_at), 'PPP', { 
                          locale: language === 'fr' ? fr : enUS 
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(article.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewArticle(article)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            {articles.length} article(s) généré(s)
          </div>
        </DialogContent>
      </Dialog>

      {/* Article Preview Dialog */}
      <Dialog open={!!previewArticle} onOpenChange={() => setPreviewArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="pr-8">{previewArticle?.title}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            {previewArticle?.featured_image && (
              <img 
                src={previewArticle.featured_image} 
                alt={previewArticle.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            
            {previewArticle?.meta_description && (
              <div className="bg-muted/50 p-3 rounded-lg mb-4">
                <p className="text-sm font-medium mb-1">Meta Description:</p>
                <p className="text-sm text-muted-foreground">{previewArticle.meta_description}</p>
              </div>
            )}
            
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewArticle?.content || '' }}
            />
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewArticle(null)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
