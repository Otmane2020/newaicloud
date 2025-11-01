import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SyncedItem {
  id: string;
  title: string;
  shopifyUrl: string;
  resourceType: 'product' | 'collection' | 'page' | 'article';
}

interface ShopifySyncSuccessDialogProps {
  items: SyncedItem[];
  onClose: () => void;
}

const resourceLabels = {
  product: 'Produit',
  collection: 'Collection',
  page: 'Page',
  article: 'Article'
};

export function ShopifySyncSuccessDialog({ items, onClose }: ShopifySyncSuccessDialogProps) {
  if (items.length === 0) return null;

  return (
    <Dialog open={items.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Synchronisation réussie
          </DialogTitle>
          <DialogDescription>
            {items.length} {items.length > 1 ? 'éléments synchronisés' : 'élément synchronisé'} avec succès sur Shopify
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {resourceLabels[item.resourceType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-md truncate">
                    {item.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Synchronisé
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(item.shopifyUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Voir sur Shopify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="border-t pt-4 mt-4 flex-shrink-0">
          <Button onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
