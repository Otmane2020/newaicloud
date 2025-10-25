import { useState, useEffect } from 'react';
import { Search, Package, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  image_url: string;
  currency: string;
  ai_color?: string;
  ai_material?: string;
  category?: string;
  handle?: string;
}

export function ProductSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Veuillez entrer une recherche');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-smart', {
        body: {
          userMessage: searchQuery,
          history: [],
          sellerId: user?.id
        }
      });

      if (error) throw error;

      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      } else {
        setProducts([]);
        toast.info('Aucun produit trouvé pour cette recherche');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price);
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center md:justify-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Search className="w-8 h-8 text-primary" />
          </div>
          Recherche IA de Produits
        </h2>
        <p className="text-muted-foreground text-base md:text-lg">
          Recherche intelligente alimentée par IA - Trouvez le produit parfait en langage naturel
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-4 md:p-6 shadow-lg border-2">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ex: canapé scandinave bleu pour salon moins de 500€"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-12 text-base"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSearch}
            size="lg"
            disabled={loading || !searchQuery.trim()}
            className="px-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Rechercher
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {searched && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Recherche en cours...</p>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  {products.length} produit{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => {
                  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
                  return (
                    <Card
                      key={product.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/product/${product.handle}`)}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={product.image_url || '/placeholder.svg'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                        {hasPromo && (
                          <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                            -{Math.round(100 - (product.price / product.compare_at_price!) * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold mb-2 line-clamp-2">{product.title}</h4>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          {hasPromo && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.compare_at_price!, product.currency)}
                            </span>
                          )}
                        </div>
                        {(product.ai_color || product.ai_material || product.category) && (
                          <div className="flex flex-wrap gap-1">
                            {product.ai_color && (
                              <Badge variant="outline" className="text-xs">
                                {product.ai_color}
                              </Badge>
                            )}
                            {product.ai_material && (
                              <Badge variant="outline" className="text-xs">
                                {product.ai_material}
                              </Badge>
                            )}
                            {product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground">
                Essayez avec d'autres mots-clés ou une description différente
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Features */}
      {!searched && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold">IA Avancée</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Comprend les requêtes en langage naturel et les intentions d'achat
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold">Recherche Contextuelle</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyse le contexte pour trouver les produits les plus pertinents
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold">Résultats Instantanés</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Scoring de pertinence intelligent pour des résultats optimaux
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}