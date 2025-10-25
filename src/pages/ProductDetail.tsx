import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ArrowLeft, Package, ShoppingCart, Tag, Palette, Box, Home, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price: number;
  image_url: string;
  currency: string;
  vendor: string;
  category: string;
  sub_category: string;
  tags: string;
  ai_color: string;
  ai_material: string;
  style: string;
  room: string;
  inventory_quantity: number;
  status: string;
}

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchProduct();
  }, [handle]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('handle', handle)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      setProduct(data);
      
      // Get all images for this product
      const imageUrls = [data.image_url].filter(Boolean);
      setImages(imageUrls);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Produit non trouvé');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Package className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Produit non trouvé</h2>
        <Button onClick={() => navigate('/search')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la recherche
        </Button>
      </div>
    );
  }

  const hasPromo = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const discountPercent = hasPromo
    ? Math.round(100 - (Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Carousel */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {images.length > 1 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {images.map((img, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square">
                        <img
                          src={img}
                          alt={`${product.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            ) : (
              <div className="aspect-square">
                <img
                  src={product.image_url || '/placeholder.svg'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </Card>

          {/* Badges */}
          {hasPromo && (
            <Badge className="bg-red-500 text-white text-lg px-4 py-2">
              -{discountPercent}% de réduction
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title & Vendor */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.title}</h1>
            {product.vendor && (
              <p className="text-muted-foreground">Par {product.vendor}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-primary">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasPromo && (
              <span className="text-2xl text-muted-foreground line-through">
                {formatPrice(product.compare_at_price, product.currency)}
              </span>
            )}
          </div>

          {/* Attributes */}
          <div className="flex flex-wrap gap-2">
            {product.ai_color && (
              <Badge variant="outline" className="gap-1">
                <Palette className="w-3 h-3" />
                {product.ai_color}
              </Badge>
            )}
            {product.ai_material && (
              <Badge variant="outline" className="gap-1">
                <Tag className="w-3 h-3" />
                {product.ai_material}
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline" className="gap-1">
                <Box className="w-3 h-3" />
                {product.category}
              </Badge>
            )}
            {product.room && (
              <Badge variant="outline" className="gap-1">
                <Home className="w-3 h-3" />
                {product.room}
              </Badge>
            )}
            {product.style && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                {product.style}
              </Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </Card>
          )}

          {/* Stock Status */}
          <Card className="p-4">
            {product.inventory_quantity > 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="font-medium">
                  En stock ({product.inventory_quantity} disponible{product.inventory_quantity > 1 ? 's' : ''})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span className="font-medium">Rupture de stock</span>
              </div>
            )}
          </Card>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full text-lg"
            disabled={product.inventory_quantity <= 0}
            onClick={() => toast.info('Fonctionnalité panier en cours de développement')}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ajouter au panier
          </Button>

          {/* Additional Info */}
          {product.tags && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
