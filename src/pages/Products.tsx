import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ProductCard';
import { Plus, Search, Filter, Package, Grid3x3, List, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [showFilters, setShowFilters] = useState(false);

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
      toast.error('Error loading products');
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
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="container mx-auto">
          {/* Mobile Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Search bar skeleton */}
          <Skeleton className="h-12 w-full mb-4 rounded-lg" />
          
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-sm">
                <Skeleton className="aspect-square" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-16 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Sticky header for mobile */}
      <div className="sticky top-0 bg-background border-b z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Products</h1>
            <p className="text-xs text-muted-foreground">
              {products.length} product{products.length !== 1 ? 's' : ''} • {totalValue.toFixed(2)} €
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="h-9 px-3"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm bg-muted/50 border-0"
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('draft')}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            Draft
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap text-xs h-8 px-3">
                Sort
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name-asc')}>
                A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name-desc')}>
                Z-A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price-asc')}>
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price-desc')}>
                Price: High to Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="whitespace-nowrap text-xs h-8 px-3"
          >
            {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid3x3 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-muted rounded-full">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No products</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Import your products from Shopify to get started
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <Card className="p-6 text-center border-0 shadow-sm">
                <p className="text-muted-foreground text-sm">
                  No products match your search criteria
                </p>
              </Card>
            ) : viewMode === 'grid' ? (
              // Optimized mobile grid (2 columns)
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id}
                    onClick={() => navigate(`/product-landing/${product.id}`)}
                    className="cursor-pointer border-0 shadow-sm overflow-hidden transition-all active:scale-95"
                  >
                    <div className="aspect-square bg-muted/50 relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge 
                        className={`absolute top-2 left-2 text-xs px-1.5 py-0 ${
                          product.status === 'active' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        {product.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1 leading-tight">
                        {product.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {product.vendor || 'No vendor'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base">
                          {product.price?.toFixed(2) || '0.00'} €
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          product.inventory_quantity > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.inventory_quantity} in stock
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Optimized mobile list
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    onClick={() => navigate(`/product-landing/${product.id}`)}
                    className="cursor-pointer border-0 shadow-sm p-3 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-muted/50 rounded-lg overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-medium text-sm line-clamp-2 flex-1 mr-2">
                            {product.title}
                          </h3>
                          <Badge 
                            variant={product.status === 'active' ? 'success' : 'outline'}
                            className="text-xs whitespace-nowrap"
                          >
                            {product.status === 'active' ? 'Active' : 'Draft'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {product.vendor || 'No vendor'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">
                            {product.price?.toFixed(2) || '0.00'} €
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            product.inventory_quantity > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
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

      {/* Floating button for mobile */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          size="lg"
          onClick={() => navigate('/dashboard')}
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>
    </div>
  );
}