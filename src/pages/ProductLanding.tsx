import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  ShoppingCart,
  Heart,
  Share2,
  Ruler,
  Package,
  Sparkles,
  Tag,
  Star,
  ChevronLeft,
  ChevronRight,
  Palette,
  Box,
  Eye,
  Check,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { SeoActionPlan } from '@/components/seo/SeoActionPlan';

const formatPrice = (price: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export default function ProductLanding() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get shop name from shopify_connections
      if (data.store_id) {
        const { data: storeData } = await supabase
          .from('shopify_connections')
          .select('store_url')
          .eq('id', data.store_id)
          .single();

        if (storeData?.store_url) {
          data.shop_name = storeData.store_url.replace('https://', '').replace('http://', '').replace('/', '');
        }
      }

      setProduct(data);

      // Load variants from product_variants table or extract from raw_data
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true });

      if (!variantsError && variantsData && variantsData.length > 0) {
        setVariants(variantsData);
        setSelectedVariant(variantsData[0]);
      } else {
        // Extract variants from raw_data if not in product_variants table
        const rawData = data.raw_data as any;
        if (rawData?.variants && Array.isArray(rawData.variants) && rawData.variants.length > 0) {
          const extractedVariants = rawData.variants.map((v: any) => ({
            id: v.id,
            title: v.title,
            price: v.price,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
            inventory_quantity: v.inventory_quantity,
            image_url: v.image_id && rawData.images ? rawData.images.find((img: any) => img.id === v.image_id)?.src : null
          }));
          setVariants(extractedVariants);
          setSelectedVariant(extractedVariants[0]);
        }
      }
    } catch (error: any) {
      toast.error('Erreur lors du chargement du produit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Produit non trouvé</h2>
        </div>
      </div>
    );
  }

  const images = product.image_url ? [product.image_url] : [];
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  const dimensions = [];
  if (product.width) dimensions.push(`L: ${product.width}${product.width_unit || 'cm'}`);
  if (product.height) dimensions.push(`H: ${product.height}${product.height_unit || 'cm'}`);
  if (product.length) dimensions.push(`P: ${product.length}${product.length_unit || 'cm'}`);

  const handleBuyNow = () => {
    if (product.shop_name && product.handle) {
      const shopUrl = product.shop_name.includes('.myshopify.com') 
        ? product.shop_name 
        : `${product.shop_name}.myshopify.com`;
      window.open(`https://${shopUrl}/products/${product.handle}`, '_blank');
    } else {
      toast.error('Impossible d\'ouvrir le lien du produit');
      console.error('Missing shop_name or handle:', { shop_name: product.shop_name, handle: product.handle });
    }
  };

  const handleShare = async () => {
    if (!product.shop_name || !product.handle) {
      toast.error('Impossible de partager ce produit');
      return;
    }

    const shopUrl = product.shop_name.includes('.myshopify.com') 
      ? product.shop_name 
      : `${product.shop_name}.myshopify.com`;
    const shareUrl = `https://${shopUrl}/products/${product.handle}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Découvrez ce produit : ${product.title}`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Lien copié dans le presse-papier');
      } catch (err) {
        toast.error('Impossible de copier le lien');
      }
    }
  };

  const currentVariant = selectedVariant || product;
  const isOutOfStock = selectedVariant ? (selectedVariant.inventory_quantity <= 0) : (product.inventory_quantity <= 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header fixe */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Retour au chat</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-lg transition ${
                isFavorite ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Galerie d'images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl shadow-lg overflow-hidden group">
              {hasDiscount && (
                <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="font-bold text-lg">-{discountPercent}%</span>
                </div>
              )}
              {product.enrichment_status === 'enriched' && (
                <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-semibold">Enrichi par IA</span>
                </div>
              )}
              <img
                src={images[selectedImage] || product.image_url}
                alt={product.title}
                className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Thumbnails si plusieurs images */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === idx ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations produit */}
          <div className="space-y-6">
            {/* En-tête produit */}
            <div>
              {product.category && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Package className="w-4 h-4" />
                  <span>{product.category}</span>
                  {product.sub_category && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span>{product.sub_category}</span>
                    </>
                  )}
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>

              {/* Prix */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-blue-600">
                  {formatPrice(Number(currentVariant.price || product.price), currentVariant.currency || product.currency || 'EUR')}
                </span>
                {hasDiscount && (
                  <span className="text-2xl text-gray-400 line-through">
                    {formatPrice(Number(product.compare_at_price), product.currency || 'EUR')}
                  </span>
                )}
              </div>

              {/* Note (simulée) */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(4.8 sur 5 - 127 avis)</span>
              </div>
            </div>

            {/* Variations */}
            {variants.length > 0 && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-sm text-gray-700">Sélectionnez vos options</h3>
                {variants.some(v => v.option1) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Option</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      value={selectedVariant?.id || ''}
                      onChange={(e) => {
                        const variant = variants.find(v => v.id === e.target.value);
                        if (variant) setSelectedVariant(variant);
                      }}
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.option1} {v.option2 ? `- ${v.option2}` : ''} {v.option3 ? `- ${v.option3}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Disponibilité */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
              isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
              {isOutOfStock ? (
                <>
                  <X className="w-5 h-5 text-red-600" />
                  <span className="text-red-700 font-medium">Rupture de stock</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    En stock - {currentVariant.inventory_quantity || product.inventory_quantity || 'Disponible'}
                  </span>
                </>
              )}
            </div>

            {/* Caractéristiques principales */}
            <div className="grid grid-cols-2 gap-4">
              {product.style && (
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <Palette className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Style</p>
                    <p className="text-sm font-semibold text-gray-900">{product.style}</p>
                  </div>
                </div>
              )}
              {(product.ai_color || product.color) && (
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <Eye className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Couleur</p>
                    <p className="text-sm font-semibold text-gray-900">{product.ai_color || product.color}</p>
                  </div>
                </div>
              )}
              {(product.ai_material || product.material) && (
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <Box className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Matériau</p>
                    <p className="text-sm font-semibold text-gray-900">{product.ai_material || product.material}</p>
                  </div>
                </div>
              )}
              {dimensions.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <Ruler className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Dimensions</p>
                    <p className="text-sm font-semibold text-gray-900">{dimensions.join(' × ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quantité et achat */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Quantité:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all ${
                  isOutOfStock 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                <ShoppingCart className="w-6 h-6" />
                {isOutOfStock ? 'Produit indisponible' : 'Acheter maintenant'}
              </button>
            </div>

            {/* Tags */}
            {product.tags && (
              <div className="flex flex-wrap gap-2">
                {product.tags.split(',').slice(0, 8).map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description complète */}
        {(product.description || product.ai_vision_analysis) && (
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Description détaillée</h2>

            {product.description && (
              <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
                <div
                  className="prose prose-blue max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {product.ai_vision_analysis && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Analyse IA enrichie</h3>
                    <p className="text-sm text-gray-600">Description générée par intelligence artificielle</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.ai_vision_analysis}</p>
              </div>
            )}
          </div>
        )}

        {/* Informations additionnelles */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Livraison rapide</h3>
            <p className="text-sm text-gray-600">Expédition sous 24-48h partout en France</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Garantie qualité</h3>
            <p className="text-sm text-gray-600">Satisfait ou remboursé sous 30 jours</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Info className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Service client</h3>
            <p className="text-sm text-gray-600">Support disponible 7j/7 pour vous accompagner</p>
          </div>
        </div>

        {/* Plan d'Action SEO */}
        <div className="mt-12">
          <SeoActionPlan productId={id!} />
        </div>
      </div>
    </div>
  );
}
