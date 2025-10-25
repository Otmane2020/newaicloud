import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle,
  Clock,
  Grid3x3,
  List,
} from 'lucide-react';

interface ProductImage {
  id: string;
  product_id: string;
  src: string;
  alt_text: string | null;
  position: number;
  shopify_image_id: number;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
}

interface Product {
  id: string;
  title: string;
  vendor: string;
  category: string;
  image_url: string;
}

interface ImageWithProduct extends ProductImage {
  product: Product;
}

type AltImageTab = 'all' | 'needs-alt' | 'has-alt' | 'to-sync';

export function SeoAltImage() {
  const [images, setImages] = useState<ImageWithProduct[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AltImageTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const IMAGES_PER_PAGE = 50;

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .order('position', { ascending: true });

      if (imagesError) throw imagesError;

      const { data: productsData, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, vendor, category, image_url');

      if (productsError) throw productsError;

      const productMap = new Map(productsData?.map(p => [p.id, p]));
      
      const imagesWithProducts = (imagesData || [])
        .map(img => ({
          ...img,
          product: productMap.get(img.product_id)
        }))
        .filter(img => img.product) as ImageWithProduct[];

      setImages(imagesWithProducts);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Erreur lors du chargement des images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const filteredImages = images.filter((img) => {
    // Tab filters
    if (activeTab === 'needs-alt' && img.alt_text) return false;
    if (activeTab === 'has-alt' && !img.alt_text) return false;
    if (activeTab === 'to-sync' && !img.alt_text) return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        img.product.title.toLowerCase().includes(term) ||
        img.alt_text?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
  const paginatedImages = filteredImages.slice(startIndex, startIndex + IMAGES_PER_PAGE);

  const handleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)));
    }
  };

  const handleSelectImage = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleGenerateForSelected = async () => {
    const imagesToGenerate = images.filter(
      img => selectedImages.has(img.id) && !img.alt_text
    );

    if (imagesToGenerate.length === 0) {
      toast.info('Aucune image à traiter');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: imagesToGenerate.length });

    for (let i = 0; i < imagesToGenerate.length; i++) {
      try {
        await supabase.functions.invoke('generate-alt-texts', {
          body: { imageId: imagesToGenerate[i].id }
        });
        setProgress({ current: i + 1, total: imagesToGenerate.length });
      } catch (error) {
        console.error('Error generating ALT text:', error);
      }
    }

    setGenerating(false);
    setProgress({ current: 0, total: 0 });
    setSelectedImages(new Set());
    toast.success('Génération des textes ALT terminée');
    await fetchImages();
  };

  const handleSyncSelected = async () => {
    const imagesToSync = images.filter(
      img => selectedImages.has(img.id) && img.alt_text
    );

    if (imagesToSync.length === 0) {
      toast.info('Aucune image à synchroniser');
      return;
    }

    setSyncing(true);
    setProgress({ current: 0, total: imagesToSync.length });

    for (let i = 0; i < imagesToSync.length; i++) {
      try {
        await supabase.functions.invoke('sync-seo-to-shopify', {
          body: { imageId: imagesToSync[i].id, syncAltText: true }
        });
        setProgress({ current: i + 1, total: imagesToSync.length });
      } catch (error) {
        console.error('Error syncing:', error);
      }
    }

    setSyncing(false);
    setProgress({ current: 0, total: 0 });
    setSelectedImages(new Set());
    toast.success('Synchronisation terminée');
    await fetchImages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const imagesNeedingAlt = images.filter(img => !img.alt_text).length;
  const imagesWithAlt = images.filter(img => img.alt_text).length;

  const tabs = [
    { id: 'all' as AltImageTab, label: 'Toutes', count: images.length },
    { id: 'needs-alt' as AltImageTab, label: 'Sans ALT', count: imagesNeedingAlt },
    { id: 'has-alt' as AltImageTab, label: 'Avec ALT', count: imagesWithAlt },
    { id: 'to-sync' as AltImageTab, label: 'À synchroniser', count: imagesWithAlt }
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? 'secondary' : 'outline'}>
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <h3 className="font-semibold">Total Images</h3>
          </div>
          <p className="text-4xl font-bold">{images.length}</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Sans ALT text</h3>
          </div>
          <p className="text-4xl font-bold text-orange-900">{imagesNeedingAlt}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-green-900">Avec ALT text</h3>
          </div>
          <p className="text-4xl font-bold text-green-900">{imagesWithAlt}/{images.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          <Button
            onClick={handleGenerateForSelected}
            disabled={generating || selectedImages.size === 0}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Générer ALT
              </>
            )}
          </Button>
          <Button
            onClick={handleSyncSelected}
            disabled={syncing || selectedImages.size === 0}
            className="gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchro...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Synchroniser
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchImages}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      {(generating || syncing) && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Génération des textes ALT...' : 'Synchronisation...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </div>
      )}

      {/* Images Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedImages.map((img) => (
            <div key={img.id} className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-muted relative">
                <img src={img.src} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(img.id)}
                    onChange={() => handleSelectImage(img.id)}
                    className="w-5 h-5 rounded"
                  />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm font-medium line-clamp-2">{img.product.title}</div>
                {img.alt_text ? (
                  <>
                    <div className="text-xs text-muted-foreground line-clamp-2">{img.alt_text}</div>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      ALT OK
                    </Badge>
                  </>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    Sans ALT
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedImages.size === filteredImages.length && filteredImages.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Image</th>
                <th className="px-4 py-3 text-left font-semibold">Produit</th>
                <th className="px-4 py-3 text-left font-semibold">Texte ALT</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedImages.map((img) => (
                <tr key={img.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(img.id)}
                      onChange={() => handleSelectImage(img.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <img src={img.src} alt={img.alt_text || ''} className="w-16 h-16 object-cover rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{img.product.title}</div>
                    <div className="text-xs text-muted-foreground">Position: {img.position}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md line-clamp-2">{img.alt_text || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {img.alt_text ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        ALT OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Sans ALT
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Affichage {startIndex + 1} à {Math.min(startIndex + IMAGES_PER_PAGE, filteredImages.length)} sur {filteredImages.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}