import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload } from 'lucide-react';

interface ArticleSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    title: string;
    seo_title?: string;
    seo_description?: string;
  };
  onConfirm: () => void;
  loading?: boolean;
}

export function ArticleSyncDialog({ open, onOpenChange, article, onConfirm, loading }: ArticleSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Publier sur Shopify</DialogTitle>
        <DialogDescription>
          Votre article est prêt à être publié sur votre boutique Shopify
        </DialogDescription>
        
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-3">{article.title}</h3>
          {article.seo_title && (
            <div className="mt-3">
              <Badge variant="outline" className="mb-1">Titre SEO</Badge>
              <p className="text-sm text-muted-foreground">{article.seo_title}</p>
            </div>
          )}
          {article.seo_description && (
            <div className="mt-3">
              <Badge variant="outline" className="mb-1">Description SEO</Badge>
              <p className="text-sm text-muted-foreground">{article.seo_description}</p>
            </div>
          )}
        </Card>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Publier plus tard
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            className="flex-1 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Publier sur Shopify
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
