import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateDescriptionScore } from '@/lib/seoQuality';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  Sparkles,
  Upload,
  Loader2,
  Package,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

interface Collection {
  id: string;
  title: string;
  handle: string;
  body_html: string | null;
  image_url: string | null;
  image_alt: string | null;
  shopify_collection_id: number;
  seo_title?: string | null;
  seo_description?: string | null;
  optimization_count?: number;
  last_optimization_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function CollectionOptimization() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const calculateCollectionSeoScore = (collection: Collection): number => {
    const titleScore = calculateDescriptionScore(collection.seo_title || collection.title);
    const descScore = calculateDescriptionScore(collection.seo_description || collection.body_html?.substring(0, 160));
    return Math.round((titleScore.score + descScore.score) / 2);
  };

  const getSeoScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { variant: 'secondary' as const, label: 'Bon', color: 'text-blue-600' };
    if (score >= 40) return { variant: 'outline' as const, label: 'Moyen', color: 'text-yellow-600' };
    return { variant: 'outline' as const, label: 'Faible', color: 'text-red-600' };
  };

  const handleImportCollections = async () => {
    try {
      setSyncing(true);
      const toastId = toast.loading('Importing collections from Shopify...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error("Aucune connexion Shopify active", { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['collections'] }
      });

      if (error) throw error;

      const totalImported = data?.totalImported || 0;
      toast.success(`✅ ${totalImported} images de collections importées`, { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to import collections');
    } finally {
      setSyncing(false);
    }
  };

  const handleOptimizeCollections = async () => {
    if (selectedCollections.size === 0) {
      toast.error("Sélectionnez au moins une collection");
      return;
    }

    try {
      setOptimizing(true);
      const toastId = toast.loading(`Optimisation SEO de ${selectedCollections.size} collection(s)...`);

      const { data, error } = await supabase.functions.invoke('generate-collection-seo', {
        body: { collection_ids: Array.from(selectedCollections) }
      });

      if (error) throw error;

      const successCount = data?.success_count || 0;

      if (successCount > 0) {
        toast.success(`✅ ${successCount} collection(s) optimisée(s)`, { id: toastId });
        await fetchCollections();
        setSelectedCollections(new Set());
      } else {
        toast.error(`Échec de l'optimisation`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to optimize collections');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedCollections.size === filteredCollections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(filteredCollections.map(c => c.id)));
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollections(newSelected);
  };

  const filteredCollections = collections.filter((col) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      col.title.toLowerCase().includes(term) ||
      col.handle?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: collections.length,
    optimized: collections.filter(c => c.optimization_count && c.optimization_count > 0).length,
    withImages: collections.filter(c => c.image_url).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Collections</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.optimized}</p>
              <p className="text-sm text-muted-foreground">Optimisées SEO</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ImageIcon className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withImages}</p>
              <p className="text-sm text-muted-foreground">Avec images</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher des collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2 items-center w-full md:w-auto">
            {selectedCollections.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOptimizeCollections}
                disabled={optimizing || syncing}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Optimiser SEO ({selectedCollections.size})
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportCollections}
              disabled={syncing || optimizing}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Shopify
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCollections}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Collections Table */}
      {filteredCollections.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune collection trouvée</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Ajustez votre recherche' : 'Importez vos collections depuis Shopify'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={selectedCollections.size === filteredCollections.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Score SEO</TableHead>
                  <TableHead>SEO Title</TableHead>
                  <TableHead>SEO Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => {
                  const seoScore = calculateCollectionSeoScore(collection);
                  const scoreBadge = getSeoScoreBadge(seoScore);
                  
                  return (
                    <TableRow key={collection.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCollections.has(collection.id)}
                          onCheckedChange={() => handleSelectCollection(collection.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {collection.image_url ? (
                            <img
                              src={collection.image_url}
                              alt={collection.image_alt || collection.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{collection.title}</div>
                            <div className="text-xs text-muted-foreground">{collection.handle}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={scoreBadge.variant}>
                            <span className={scoreBadge.color}>{seoScore}/100</span>
                          </Badge>
                          {collection.optimization_count && collection.optimization_count > 0 && (
                            <Sparkles className="w-3 h-3 text-primary" />
                          )}
                        </div>
                        {collection.optimization_count && collection.optimization_count > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Optimisé {collection.optimization_count}x
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-sm line-clamp-1">
                            {collection.seo_title || <span className="text-muted-foreground">Non défini</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-sm line-clamp-2">
                            {collection.seo_description || <span className="text-muted-foreground">Non défini</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // TODO: Ouvrir modal de détails collection
                            toast.info("Détails de la collection à venir");
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
