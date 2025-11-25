import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Download, FolderOpen, RefreshCw } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useTranslation } from '@/lib/language';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  image?: {
    src: string;
  };
  products_count: number;
}

export function CollectionImportSelector() {
  const { t, tf } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<number>>(new Set());
  const [existingCollections, setExistingCollections] = useState<Set<number>>(new Set());

  const fetchShopifyCollections = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get Shopify connection
      const { data: connection } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!connection) {
        toast.error(t.toasts.collections.import.noActiveConnection);
        return;
      }

      // Fetch existing collections from our DB
      const { data: existing } = await supabase
        .from('shopify_collections')
        .select('shopify_collection_id')
        .eq('user_id', user.id);

      if (existing) {
        setExistingCollections(new Set(existing.map(c => Number(c.shopify_collection_id))));
      }

      // Fetch collections from Shopify
      const shopifyUrl = connection.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const response = await fetch(
        `https://${shopifyUrl}/admin/api/2025-01/custom_collections.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch collections from Shopify');
      
      const data = await response.json();
      setCollections(data.custom_collections || []);

      // Also fetch smart collections
      const smartResponse = await fetch(
        `https://${shopifyUrl}/admin/api/2025-01/smart_collections.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (smartResponse.ok) {
        const smartData = await smartResponse.json();
        setCollections(prev => [...prev, ...(smartData.smart_collections || [])]);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error(t.toasts.collections.import.loadingError);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedCollections.size === 0) {
      toast.error(t.toasts.collections.import.selectAtLeast);
      return;
    }

    // Vérifier les limites avant d'importer
    if (!canDoAction('optimizations')) {
      toast.error(t.toasts.warning.limitReached, {
        description: limits?.isTrialing 
          ? t.toasts.collections.import.limitReachedDesc
          : t.toasts.collections.import.limitReachedDesc
      });
      setShowUpgradeDialog(true);
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!connection) {
        toast.error(t.toasts.collections.import.noActiveConnection);
        return;
      }

      // Extract shop name from store_url
      const shopName = connection.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');

      // Use edge function for consistent import
      const { data, error } = await supabase.functions.invoke('import-shopify-collections', {
        body: { 
          shopName, 
          apiSecret: connection.access_token, 
          storeId: connection.id 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast.success(tf('toasts.collections.import.importSuccess', { count: data.imported || 0 }));
        setSelectedCollections(new Set());
        setOpen(false);
        await refreshLimits();
        
        // Refresh the list
        await fetchShopifyCollections();
      } else {
        throw new Error(data?.error || t.toasts.error.generic);
      }
    } catch (error) {
      console.error('Error importing collections:', error);
      toast.error(tf('toasts.collections.import.importError', { message: error.message }));
    } finally {
      setImporting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedCollections.size === collections.filter(c => !existingCollections.has(c.id)).length) {
      setSelectedCollections(new Set());
    } else {
      const newSelected = collections
        .filter(c => !existingCollections.has(c.id))
        .map(c => c.id);
      setSelectedCollections(new Set(newSelected));
    }
  };

  const handleSelectCollection = (id: number) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCollections(newSelected);
  };

  useEffect(() => {
    if (open) {
      fetchShopifyCollections();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            {t.toasts.collections.import.button}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t.toasts.collections.import.title}</DialogTitle>
            <DialogDescription>
              {t.toasts.collections.import.description}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t.toasts.collections.import.noCollections.title}</h3>
              <p className="text-muted-foreground mb-4">
                {t.toasts.collections.import.noCollections.description}
              </p>
              <Button onClick={fetchShopifyCollections} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.toasts.collections.import.noCollections.retry}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCollections.size === collections.filter(c => !existingCollections.has(c.id)).length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tf('toasts.collections.import.selectAll', { count: collections.filter(c => !existingCollections.has(c.id)).length })}
                  </span>
                </div>
                <Badge variant="secondary">
                  {tf('toasts.collections.import.selected', { count: selectedCollections.size })}
                </Badge>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {collections.map((collection) => {
                    const isExisting = existingCollections.has(collection.id);
                    const isSelected = selectedCollections.has(collection.id);

                    return (
                      <Card 
                        key={collection.id}
                        className={`transition-all ${
                          isExisting 
                            ? 'opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'ring-2 ring-primary' 
                              : 'cursor-pointer hover:shadow-md'
                        }`}
                        onClick={() => !isExisting && handleSelectCollection(collection.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={isSelected}
                              disabled={isExisting}
                              onCheckedChange={() => handleSelectCollection(collection.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {collection.image?.src && (
                              <img
                                src={collection.image.src}
                                alt={collection.title}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium flex items-center gap-2">
                                {collection.title}
                                {isExisting && (
                                  <Badge variant="outline" className="text-xs">
                                    {t.toasts.collections.import.alreadyImported}
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {tf('toasts.collections.import.products', { count: collection.products_count || 0 })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t.toasts.collections.import.cancel}
                </Button>
                <Button onClick={handleImport} disabled={importing || selectedCollections.size === 0}>
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.toasts.collections.import.importing}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {tf('toasts.collections.import.import', { count: selectedCollections.size })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count}
        limit={limits?.limits.max_optimizations}
      />
    </>
  );
}
