import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Check,
  Package,
  Truck,
  Shield,
  ArrowLeft,
  Sparkles,
  Ruler,
  Palette,
  Box
} from "lucide-react";
import { toast } from "sonner";

export default function ProductLanding() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du produit");
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
          <Link to="/products">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux produits
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.image_url ? [product.image_url] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {images.length > 0 ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.title}
                    className="w-full h-[500px] object-cover"
                  />
                ) : (
                  <div className="w-full h-[500px] bg-muted flex items-center justify-center">
                    <Package className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
            
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <Card
                    key={idx}
                    className={`cursor-pointer overflow-hidden ${
                      selectedImage === idx ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img} alt="" className="w-full h-20 object-cover" />
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <Badge variant="outline" className="mb-3">
                  {product.category}
                </Badge>
              )}
              <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
              
              {product.seo_description && (
                <p className="text-lg text-muted-foreground mb-6">
                  {product.seo_description}
                </p>
              )}

              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-4xl font-bold text-primary">
                  {product.price} {product.currency}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-2xl text-muted-foreground line-through">
                    {product.compare_at_price} {product.currency}
                  </span>
                )}
              </div>

              <div className="flex gap-3 mb-6">
                <Button size="lg" className="flex-1">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Ajouter au panier
                </Button>
                <Button size="lg" variant="outline">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Truck className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-semibold">Livraison rapide</p>
                  <p className="text-sm text-muted-foreground">2-5 jours</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-semibold">Garantie</p>
                  <p className="text-sm text-muted-foreground">2 ans</p>
                </div>
              </div>
            </div>

            {/* AI Attributes */}
            {(product.ai_color || product.ai_material || product.ai_shape) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Caractéristiques détectées par IA
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {product.ai_color && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Palette className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Couleur</p>
                          <p className="font-medium">{product.ai_color}</p>
                        </div>
                      </div>
                    )}
                    {product.ai_material && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Box className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Matériau</p>
                          <p className="font-medium">{product.ai_material}</p>
                        </div>
                      </div>
                    )}
                    {product.ai_shape && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Ruler className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Forme</p>
                          <p className="font-medium">{product.ai_shape}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Dimensions */}
            {(product.smart_length || product.smart_width || product.smart_height) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dimensions</h3>
                  <div className="space-y-2">
                    {product.smart_length && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Longueur</span>
                        <span className="font-medium">
                          {product.smart_length} {product.smart_length_unit}
                        </span>
                      </div>
                    )}
                    {product.smart_width && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Largeur</span>
                        <span className="font-medium">
                          {product.smart_width} {product.smart_width_unit}
                        </span>
                      </div>
                    )}
                    {product.smart_height && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hauteur</span>
                        <span className="font-medium">
                          {product.smart_height} {product.smart_height_unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <div className="prose max-w-none">
                <p>{product.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vision AI Analysis */}
        {product.ai_vision_analysis && (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Analyse Vision AI
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.ai_vision_analysis}
              </p>
              {product.ai_presentation_quality && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Qualité de présentation: </span>
                  <span className="font-semibold">{product.ai_presentation_quality}/10</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
