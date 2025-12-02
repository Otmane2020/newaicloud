import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Zap, Search, Image as ImageIcon, Sparkles, Eye, ArrowLeft } from "lucide-react";
import { SocialPageSelector } from "./SocialPageSelector";
import { SocialPostPreview } from "./SocialPostPreview";
import { SOCIAL_TEMPLATES } from "./templates/socialTemplates";

interface QuickPostDialogProps {
  userId?: string;
  onClose: () => void;
  onPosted?: () => void;
}

const QuickPostDialog = ({ userId, onClose, onPosted }: QuickPostDialogProps) => {
  const { selectedStore } = useStore();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [selectedFacebookPages, setSelectedFacebookPages] = useState<string[]>([]);
  const [selectedInstagramAccounts, setSelectedInstagramAccounts] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  // Get default template
  const defaultTemplate = SOCIAL_TEMPLATES.find(t => t.id === 'product_spotlight') || SOCIAL_TEMPLATES[0];

  useEffect(() => {
    loadProducts();
  }, [selectedStore?.id]);

  const loadProducts = async () => {
    if (!selectedStore?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('shopify_products')
        .select('id, title, body_html, product_images(src), product_variants(price, compare_at_price)')
        .eq('store_id', selectedStore.id)
        .order('title', { ascending: true })
        .limit(100);

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const generateCaption = async () => {
    if (!selectedProduct) return;
    
    setGeneratingCaption(true);
    try {
      const productName = selectedProduct.title;
      const description = selectedProduct.body_html?.replace(/<[^>]*>/g, '').substring(0, 300) || '';
      const price = selectedProduct.product_variants?.[0]?.price;
      const comparePrice = selectedProduct.product_variants?.[0]?.compare_at_price;
      
      // Use AI to generate engaging caption
      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          productTitle: productName,
          productDescription: description,
          productPrice: price ? `${price}€` : undefined,
          comparePrice: comparePrice ? `${comparePrice}€` : undefined,
          storeName: selectedStore?.store_name,
          language: 'fr',
          tone: 'engaging',
          platform: selectedInstagramAccounts.length > 0 ? 'instagram' : 'facebook'
        }
      });

      if (error) throw error;
      
      if (data?.caption) {
        setCaption(data.caption);
        toast.success('Caption générée avec AI !');
      } else {
        throw new Error('No caption returned');
      }
    } catch (error: any) {
      console.error('Error generating caption:', error);
      // Fallback to simple caption
      const emojis = ['✨', '🛍️', '💫', '🎁', '⭐', '🔥', '💎', '🌟'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const fallbackCaption = `${randomEmoji} ${selectedProduct.title}\n\n🛒 Découvrez ce produit exclusif sur notre boutique !\n\n#shopping #nouveaute #tendance`;
      setCaption(fallbackCaption);
      toast.info('Caption générée (mode simplifié)');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePost = async () => {
    const hasSelectedPages = selectedFacebookPages.length > 0 || selectedInstagramAccounts.length > 0;
    
    if (!selectedProduct || !caption || !hasSelectedPages) {
      toast.error('Sélectionnez un produit, écrivez une caption et choisissez au moins une page');
      return;
    }

    setPosting(true);
    try {
      const imageUrl = selectedProduct.product_images?.[0]?.src;
      
      if (!imageUrl) {
        toast.error('Ce produit n\'a pas d\'image');
        setPosting(false);
        return;
      }

      // Post to selected Facebook pages
      for (const pageId of selectedFacebookPages) {
        const { data, error } = await supabase.functions.invoke('share-article-facebook', {
          body: {
            userId,
            imageUrl,
            caption,
            productId: selectedProduct.id,
            productTitle: selectedProduct.title,
            pageId, // Specific page to post to
          }
        });

        if (error) {
          console.error(`Error posting to Facebook page ${pageId}:`, error);
          toast.error(`Erreur Facebook: ${error.message}`);
        } else {
          toast.success('Publié sur Facebook !');
        }
      }

      // Post to selected Instagram accounts
      for (const accountId of selectedInstagramAccounts) {
        const { data, error } = await supabase.functions.invoke('share-article-instagram', {
          body: {
            userId,
            imageUrl,
            caption,
            productId: selectedProduct.id,
            productTitle: selectedProduct.title,
            accountId, // Specific account to post to
          }
        });

        if (error) {
          console.error(`Error posting to Instagram account ${accountId}:`, error);
          toast.error(`Erreur Instagram: ${error.message}`);
        } else {
          toast.success('Publié sur Instagram !');
        }
      }

      onPosted?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setCaption('');
    setShowPreview(false);
  };

  const hasSelectedPages = selectedFacebookPages.length > 0 || selectedInstagramAccounts.length > 0;
  const canShowPreview = selectedProduct && caption && hasSelectedPages;
  
  // Build channels array for preview
  const previewChannels: string[] = [];
  if (selectedFacebookPages.length > 0) previewChannels.push('facebook');
  if (selectedInstagramAccounts.length > 0) previewChannels.push('instagram');

  // Preview Mode
  if (showPreview && selectedProduct) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Aperçu de la publication
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <SocialPostPreview
              template={defaultTemplate}
              productImage={selectedProduct.product_images?.[0]?.src}
              productTitle={selectedProduct.title}
              productPrice={selectedProduct.product_variants?.[0]?.price ? `${selectedProduct.product_variants[0].price}€` : undefined}
              caption={caption}
              storeName={selectedStore?.store_name || 'Ma boutique'}
              channels={previewChannels}
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button 
                onClick={handlePost} 
                disabled={posting}
                className="flex-1"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Publier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Publication instantanée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Selection */}
          {!selectedProduct ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {!selectedStore ? 'Sélectionnez une boutique' : 'Aucun produit trouvé'}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                  {filteredProducts.slice(0, 20).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left transition-colors"
                    >
                      {product.product_images?.[0]?.src ? (
                        <img 
                          src={product.product_images[0].src} 
                          alt="" 
                          className="h-12 w-12 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium line-clamp-2 break-words flex-1 min-w-0">
                        {product.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Product Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedProduct.product_images?.[0]?.src && (
                  <img 
                    src={selectedProduct.product_images[0].src} 
                    alt="" 
                    className="h-16 w-16 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2 break-words text-sm">{selectedProduct.title}</p>
                  <button 
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Changer de produit
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Caption</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateCaption}
                    disabled={generatingCaption}
                  >
                    {generatingCaption ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Générer
                  </Button>
                </div>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Écrivez votre caption ou générez-en une automatiquement..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Page/Account Selection */}
              <div className="space-y-2">
                <Label>Publier sur</Label>
                <div className="border rounded-lg p-3">
                  <SocialPageSelector
                    userId={userId}
                    selectedFacebookPages={selectedFacebookPages}
                    selectedInstagramAccounts={selectedInstagramAccounts}
                    onFacebookChange={setSelectedFacebookPages}
                    onInstagramChange={setSelectedInstagramAccounts}
                    compact
                  />
                </div>
              </div>

              {/* Preview & Post Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowPreview(true)} 
                  disabled={!canShowPreview}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
                <Button 
                  onClick={handlePost} 
                  disabled={posting || !caption || !hasSelectedPages}
                  className="flex-1"
                >
                  {posting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Publier
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPostDialog;
