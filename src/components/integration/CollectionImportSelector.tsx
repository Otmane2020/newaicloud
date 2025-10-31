import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Download, FolderOpen, RefreshCw } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
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
        toast.error('Aucune connexion Shopify active');
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
        `https://${shopifyUrl}/admin/api/2024-01/custom_collections.json?limit=250`,
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
        `https://${shopifyUrl}/admin/api/2024-01/smart_collections.json?limit=250`,
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
      toast.error('Erreur lors du chargement des collections');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedCollections.size === 0) {
      toast.error('Veuillez sélectionner au moins une collection');
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

      if (!connection) return;

      const selectedCollectionsList = collections.filter(c => selectedCollections.has(c.id));

      // Import collections
      const collectionsToInsert = selectedCollectionsList.map(collection => ({
        user_id: user.id,
        store_id: connection.id,
        shopify_collection_id: collection.id,
        title: collection.title,
        handle: collection.handle,
        image_url: collection.image?.src || null,
      }));

      const { error } = await supabase
        .from('shopify_collections')
        .upsert(collectionsToInsert, {
          onConflict: 'shopify_collection_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast.success(`${selectedCollections.size} collection(s) importée(s) avec succès`);
      setOpen(false);
      setSelectedCollections(new Set());
      
      // Refresh existing collections
      fetchShopifyCollections();
    } catch (error) {
      console.error('Error importing collections:', error);
      toast.error('Erreur lors de l\'import des collections');
    } finally {
      setImporting(false);
    }
  };

  const toggleCollection = (id: number) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCollections(newSelected);
  };

  const selectAll = () => {
    const newCollections = collections.filter(c => !existingCollections.has(c.id));
    setSelectedCollections(new Set(newCollections.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedCollections(new Set());
  };

  useEffect(() => {
    if (open) {
      fetchShopifyCollections();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Importer des Collections
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importer des Collections depuis Shopify</DialogTitle>
          <DialogDescription>
            Sélectionnez les collections que vous souhaitez importer
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune collection trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Créez d'abord des collections dans votre boutique Shopify
            </p>
            <Button variant="outline" onClick={fetchShopifyCollections}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {collections.length} collection(s) disponible(s) • {selectedCollections.size} sélectionnée(s)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Tout sélectionner
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>
                  Tout désélectionner
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {collections.map((collection) => {
                  const isExisting = existingCollections.has(collection.id);
                  const isSelected = selectedCollections.has(collection.id);

                  return (
                    <Card
                      key={collection.id}
                      className={`p-3 transition-all ${
                        isExisting
                          ? 'bg-muted/50 opacity-60'
                          : isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50 cursor-pointer'
                      }`}
                      onClick={() => !isExisting && toggleCollection(collection.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={isExisting}
                          onCheckedChange={() => !isExisting && toggleCollection(collection.id)}
                        />
                        {collection.image?.src && (
                          <img
                            src={collection.image.src}
                            alt={collection.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{collection.title}</p>
                            {isExisting && (
                              <Badge variant="secondary" className="text-xs">
                                Déjà importée
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {collection.products_count || 0} produit(s)
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleImport} disabled={importing || selectedCollections.size === 0}>
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importer ({selectedCollections.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
