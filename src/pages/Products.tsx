import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ProductCard';
import { Plus, Search, Filter, Package, Grid3x3, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  image_url: string | null;
  inventory_quantity: number;
  created_at: string;
}

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, statusFilter, sortBy]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    setFilteredProducts(filtered);
  };

  const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * p.inventory_quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
          <Skeleton className="h-8 sm:h-12 w-48 sm:w-64 mb-6 sm:mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <Skeleton className="h-5 sm:h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Gestion des Produits</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {products.length} produit{products.length !== 1 ? 's' : ''} • {totalValue.toFixed(2)} EUR
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
            </Button>
            <Button 
              size="sm" 
              onClick={() => navigate('/dashboard')} 
              className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10"
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Importer des produits</span>
              <span className="sm:hidden">Importer</span>
            </Button>
          </div>
        </div>

        {products.length === 0 ? (
          <Card className="p-6 sm:p-8 lg:p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 sm:p-4 bg-muted rounded-full">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucun produit</h3>
                <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                  Commencez par importer vos produits depuis Shopify
                </p>
                <Button onClick={() => navigate('/dashboard')} size="sm" className="h-9 sm:h-10">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Importer des produits
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Filters - Layout adapté mobile */}
            <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm h-10 sm:h-11"
                  />
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm h-10 sm:h-11">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="draft">Brouillons</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="text-sm h-10 sm:h-11">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Récents</SelectItem>
                    <SelectItem value="name-asc">A-Z</SelectItem>
                    <SelectItem value="name-desc">Z-A</SelectItem>
                    <SelectItem value="price-asc">Prix ↑</SelectItem>
                    <SelectItem value="price-desc">Prix ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Products grid/list */}
            {filteredProducts.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <p className="text-muted-foreground text-sm sm:text-base">
                  Aucun produit ne correspond à vos critères de recherche
                </p>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/product-landing/${product.id}`)}
                    className="cursor-pointer"
                  >
                    <ProductCard {...product} />
                  </div>
                ))}
              </div>
            ) : (
              // Liste view corrigée pour mobile
              <div className="space-y-3 sm:space-y-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    onClick={() => navigate(`/product-landing/${product.id}`)}
                    className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-shadow border"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg line-clamp-2 sm:truncate">
                            {product.title}
                          </h3>
                          <div className="text-lg sm:text-xl font-bold text-right">
                            {product.price?.toFixed(2) || '0.00'} {product.currency}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                          {product.description || 'Pas de description'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            variant={product.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {product.status === 'active' ? 'Actif' : 'Brouillon'}
                          </Badge>
                          {product.vendor && (
                            <Badge variant="outline" className="text-xs">
                              {product.vendor}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            Stock: {product.inventory_quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}