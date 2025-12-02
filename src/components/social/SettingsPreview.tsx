import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Eye } from "lucide-react";
import { SOCIAL_TEMPLATES, SocialTemplate } from "./templates/socialTemplates";
import { SocialPostPreview } from "./SocialPostPreview";

interface SettingsPreviewProps {
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  brandColor: string;
  logoUrl: string | null;
}

interface PreviewProduct {
  id: string;
  title: string;
  price?: string;
  comparePrice?: string;
  image?: string;
}

export function SettingsPreview({
  selectedTemplateId,
  onTemplateChange,
  brandColor,
  logoUrl
}: SettingsPreviewProps) {
  const { selectedStore } = useStore();
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedStore?.id) {
      loadPreviewProducts();
    } else {
      setLoading(false);
    }
  }, [selectedStore?.id]);

  const loadPreviewProducts = async () => {
    try {
      const { data } = await supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          product_variants(price, compare_at_price),
          product_images(src)
        `)
        .eq('store_id', selectedStore?.id)
        .order('title', { ascending: true })
        .limit(5);

      if (data && data.length > 0) {
        const products = data.map(p => ({
          id: p.id,
          title: p.title,
          price: p.product_variants?.[0]?.price ? `${p.product_variants[0].price}€` : undefined,
          comparePrice: p.product_variants?.[0]?.compare_at_price ? `${p.product_variants[0].compare_at_price}€` : undefined,
          image: p.product_images?.[0]?.src
        }));
        setPreviewProducts(products);
      }
    } catch (error) {
      console.error('Error loading preview products:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = SOCIAL_TEMPLATES.find(t => t.id === selectedTemplateId) || SOCIAL_TEMPLATES[0];
  const currentProduct = previewProducts[selectedProductIndex];

  // Demo caption based on product
  const demoCaption = currentProduct 
    ? `✨ ${currentProduct.title}\n\n🛍️ Découvrez notre sélection exclusive !\n\n${currentProduct.price ? `💰 ${currentProduct.price}` : ''}\n\n👉 Lien en bio\n\n#shopping #nouveaute #tendance`
    : '✨ Découvrez notre nouvelle collection !\n\n🛍️ Des produits de qualité à des prix exceptionnels.\n\n👉 Lien en bio\n\n#shopping #nouveaute';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Aperçu du template
        </CardTitle>
        <CardDescription>
          Visualisez comment vos posts apparaîtront avec un vrai produit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Template par défaut</Label>
          <Select value={selectedTemplateId} onValueChange={onTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Selection for Preview */}
        {previewProducts.length > 1 && (
          <div className="space-y-2">
            <Label>Produit pour l'aperçu</Label>
            <Select 
              value={String(selectedProductIndex)} 
              onValueChange={(v) => setSelectedProductIndex(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {previewProducts.map((product, idx) => (
                  <SelectItem key={product.id} value={String(idx)}>
                    {product.title.substring(0, 40)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preview */}
        <div className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SocialPostPreview
              template={selectedTemplate}
              productImage={currentProduct?.image}
              productTitle={currentProduct?.title || 'Votre produit'}
              productPrice={currentProduct?.price}
              comparePrice={currentProduct?.comparePrice}
              caption={demoCaption}
              storeName={selectedStore?.store_name || 'Ma Boutique'}
              logoUrl={logoUrl || undefined}
              channels={['facebook', 'instagram']}
            />
          )}
        </div>

        {/* Template Info */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium">{selectedTemplate.name}</p>
          <p className="text-muted-foreground text-xs mt-1">
            {selectedTemplate.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsPreview;
