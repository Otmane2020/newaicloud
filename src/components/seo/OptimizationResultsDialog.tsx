import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptimizedItem {
  id: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  alt_text?: string;
  tags?: string;
  image_url?: string;
}

interface OptimizationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'seo' | 'tags' | 'alt';
  items: OptimizedItem[];
  onSyncClick: () => void;
  onClose: () => void;
}

export function OptimizationResultsDialog({
  open,
  onOpenChange,
  type,
  items,
  onSyncClick,
  onClose,
}: OptimizationResultsDialogProps) {
  const getTitle = () => {
    switch (type) {
      case 'seo':
        return 'Optimisation SEO terminée';
      case 'tags':
        return 'Tags générés avec succès';
      case 'alt':
        return 'Textes ALT générés';
      default:
        return 'Optimisation terminée';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'seo':
        return `${items.length} produits optimisés avec nouveaux titres et descriptions SEO`;
      case 'tags':
        return `${items.length} produits ont reçu de nouveaux tags pertinents`;
      case 'alt':
        return `${items.length} images optimisées avec textes ALT descriptifs`;
      default:
        return `${items.length} éléments optimisés`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{getTitle()}</h3>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {getDescription()}
            </DialogDescription>
          </div>
        </DialogTitle>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    
                    {type === 'seo' && (
                      <div className="space-y-2">
                        {item.seo_title && (
                          <div>
                            <Badge variant="outline" className="mb-1">Titre SEO</Badge>
                            <p className="text-sm text-muted-foreground">{item.seo_title}</p>
                          </div>
                        )}
                        {item.seo_description && (
                          <div>
                            <Badge variant="outline" className="mb-1">Description</Badge>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.seo_description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'tags' && item.tags && (
                      <div>
                        <Badge variant="outline" className="mb-1">Tags</Badge>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.split(',').map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {type === 'alt' && item.alt_text && (
                      <div>
                        <Badge variant="outline" className="mb-1">Texte ALT</Badge>
                        <p className="text-sm text-muted-foreground">{item.alt_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button
            onClick={onSyncClick}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Upload className="w-5 h-5" />
            Synchroniser avec Shopify
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}