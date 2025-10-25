import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
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
  TrendingUp,
  Eye,
  Zap,
  ArrowRight,
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
    if (activeTab === 'needs-alt' && img.alt_text) return false;
    if (activeTab === 'has-alt' && !img.alt_text) return false;
    if (activeTab === 'to-sync' && !img.alt_text) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        img.product.title.toLowerCase().includes(term) ||
        img.alt_text?.toLowerCase().includes(term) ||
        img.product.category?.toLowerCase().includes(term)
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
  const altCompletionRate = images.length > 0 ? Math.round((imagesWithAlt / images.length) * 100) : 0;

  const tabs = [
    { id: 'all' as AltImageTab, label: 'Toutes', count: images.length },
    { id: 'needs-alt' as AltImageTab, label: 'Sans ALT', count: imagesNeedingAlt },
    { id: 'has-alt' as AltImageTab, label: 'Avec ALT', count: imagesWithAlt },
    { id: 'to-sync' as AltImageTab, label: 'À synchroniser', count: imagesWithAlt }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner with CTA */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Textes ALT Image Intelligents
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Améliorez l'accessibilité et le SEO avec des descriptions d'images optimisées par IA. Augmentez votre référencement images de 40%.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Accessibilité optimale</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+40% référencement images</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">IA performante</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{altCompletionRate}%</div>
              <div className="text-sm text-muted-foreground">Images optimisées</div>
            </div>
            <Button
              size="lg"
              onClick={() => toast.info('Sélectionnez des images ci-dessous')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Optimiser les images
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <ImageIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Images</h3>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1">{images.length}</p>
          <p className="text-sm text-muted-foreground">Dans votre catalogue</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Sans ALT text</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-1">{imagesNeedingAlt}</p>
          <p className="text-sm text-orange-700 dark:text-orange-300">À optimiser</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Avec ALT text</h3>
            </div>
            <Badge className="bg-green-600 text-white">{altCompletionRate}%</Badge>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{imagesWithAlt}</p>
          <p className="text-sm text-green-700 dark:text-green-300">Images accessibles</p>
        </Card>
      </div>

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
                Générer ALT ({selectedImages.size})
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
                Synchroniser ({selectedImages.size})
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Génération des textes ALT...' : 'Synchronisation...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Images Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedImages.map((img) => (
            <Card key={img.id} className="overflow-hidden hover:shadow-md transition group">
              <div className="aspect-square bg-muted relative">
                <img 
                  src={img.src} 
                  alt={img.alt_text || ''} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(img.id)}
                    onChange={() => handleSelectImage(img.id)}
                    className="w-5 h-5 rounded shadow-lg"
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
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
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
        </Card>
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