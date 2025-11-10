import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Eye } from 'lucide-react';

interface ArticlePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    title: string;
    content: string;
    featured_image?: string;
  } | null;
}

export function ArticlePreviewDialog({ open, onOpenChange, article }: ArticlePreviewDialogProps) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0">
        <div className="flex items-center justify-between p-6 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-primary" />
            <DialogTitle className="text-xl font-bold">Aperçu de l'article</DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-full px-6 pb-6">
          <article className="prose prose-slate dark:prose-invert max-w-none py-6">
            {article.featured_image && (
              <div className="mb-8 -mx-6">
                <img
                  src={article.featured_image}
                  alt={article.title}
                  className="w-full h-auto object-cover rounded-lg"
                />
              </div>
            )}
            
            <h1 className="text-4xl font-bold mb-6">{article.title}</h1>
            
            <div 
              className="article-content prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80"
              dangerouslySetInnerHTML={{ __html: article.content }} 
            />
          </article>
        </ScrollArea>

        <div className="flex justify-end gap-3 p-6 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
