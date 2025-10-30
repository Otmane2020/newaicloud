import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload } from 'lucide-react';

interface ShopifyPage {
  id: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
}

interface PageSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: ShopifyPage[];
  onConfirm: () => void;
  loading?: boolean;
}

export function PageSyncDialog({ open, onOpenChange, pages, onConfirm, loading }: PageSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Synchroniser avec Shopify</DialogTitle>
        <DialogDescription>
          {pages.length} page{pages.length > 1 ? 's' : ''} prête{pages.length > 1 ? 's' : ''} à être synchronisée{pages.length > 1 ? 's' : ''}
        </DialogDescription>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-3 pr-4">
            {pages.map(page => (
              <Card key={page.id} className="p-4">
                <h4 className="font-medium mb-2">{page.title}</h4>
                {page.seo_title && (
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">Titre SEO</Badge>
                    <p className="text-sm text-muted-foreground">{page.seo_title}</p>
                  </div>
                )}
                {page.seo_description && (
                  <div className="space-y-1 mt-2">
                    <Badge variant="outline" className="text-xs">Description SEO</Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">{page.seo_description}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            className="flex-1 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Synchroniser avec Shopify
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
