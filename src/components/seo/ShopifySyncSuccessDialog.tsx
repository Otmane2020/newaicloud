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
import { useTranslation } from '@/lib/language';

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

export function ShopifySyncSuccessDialog({ items, onClose }: ShopifySyncSuccessDialogProps) {
  const { t, tf } = useTranslation();
  
  if (items.length === 0) return null;

  const resourceLabels: Record<string, string> = {
    product: t.dialogs.shopifySync.resourceTypes.product,
    collection: t.dialogs.shopifySync.resourceTypes.collection,
    page: t.dialogs.shopifySync.resourceTypes.page,
    article: t.dialogs.shopifySync.resourceTypes.article
  };

  const getShopifyAdminUrl = (item: SyncedItem) => {
    // Extract store domain from Shopify URL (e.g., https://store-name.myshopify.com/...)
    try {
      const url = new URL(item.shopifyUrl);
      const storeDomain = url.hostname;
      const shopifyId = item.shopifyUrl.split('/').pop();
      
      const resourcePaths = {
        product: 'products',
        collection: 'collections',
        page: 'pages',
        article: 'articles'
      };
      
      return `https://${storeDomain}/admin/${resourcePaths[item.resourceType]}/${shopifyId}`;
    } catch {
      return item.shopifyUrl;
    }
  };

  return (
    <Dialog open={items.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            ✅ {t.dialogs.shopifySync.successTitle}
          </DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <p className="font-medium">
              {tf(items.length === 1 ? 'dialogs.shopifySync.itemsSynced_one' : 'dialogs.shopifySync.itemsSynced_other', { count: items.length })}
            </p>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📍 {t.dialogs.shopifySync.howToVerify}
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>{t.dialogs.shopifySync.step1}</li>
                <li>{t.dialogs.shopifySync.step2} <strong>"{t.dialogs.shopifySync.previewSection}"</strong></li>
                <li>{t.dialogs.shopifySync.step3}</li>
              </ol>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                ⏱️ <strong>{t.dialogs.shopifySync.noteLabel}</strong> {t.dialogs.shopifySync.cacheNote}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 mt-4">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>{t.dialogs.shopifySync.type}</TableHead>
                <TableHead>{t.dialogs.shopifySync.title}</TableHead>
                <TableHead>{t.dialogs.shopifySync.status}</TableHead>
                <TableHead className="text-right">{t.dialogs.shopifySync.action}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
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
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t.dialogs.shopifySync.synchronized}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(getShopifyAdminUrl(item), '_blank')}
                      className="hover:bg-primary/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {t.dialogs.shopifySync.viewInAdmin}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="border-t pt-4 mt-4 flex-shrink-0">
          <Button onClick={onClose} className="w-full">
            {t.dialogs.shopifySync.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
