import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Facebook, Instagram, Zap, Search, Image as ImageIcon, Sparkles } from "lucide-react";

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
  const [channels, setChannels] = useState<string[]>(['facebook', 'instagram']);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

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
        .select('id, title, body_html, product_images(src)')
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
      // Simple caption generation based on product info
      const productName = selectedProduct.title;
      const description = selectedProduct.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || '';
      
      const emojis = ['✨', '🛍️', '💫', '🎁', '⭐', '🔥', '💎', '🌟'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      const generatedCaption = `${randomEmoji} ${productName}\n\n${description ? description + '...\n\n' : ''}Découvrez ce produit sur notre boutique! 🛒\n\n#shopping #nouveaute #promo`;
      
      setCaption(generatedCaption);
      toast.success('Caption générée !');
    } catch (error: any) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePost = async () => {
    if (!selectedProduct || !caption || channels.length === 0) {
      toast.error('Sélectionnez un produit, écrivez une caption et choisissez au moins un canal');
      return;
    }

    setPosting(true);
    try {
      // Get the first image
      const imageUrl = selectedProduct.product_images?.[0]?.src;
      
      if (!imageUrl) {
        toast.error('Ce produit n\'a pas d\'image');
        setPosting(false);
        return;
      }

      // Call share functions for each channel
      for (const channel of channels) {
        const functionName = channel === 'facebook' ? 'share-article-facebook' : 'share-article-instagram';
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            userId,
            imageUrl,
            caption,
            productId: selectedProduct.id,
            productTitle: selectedProduct.title,
          }
        });

        if (error) {
          console.error(`Error posting to ${channel}:`, error);
          toast.error(`Erreur ${channel}: ${error.message}`);
        } else {
          toast.success(`Publié sur ${channel === 'facebook' ? 'Facebook' : 'Instagram'} !`);
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
  };

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
                      <span className="text-sm font-medium truncate">{product.title}</span>
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
                  <p className="font-medium truncate">{selectedProduct.title}</p>
                  <button 
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-sm text-primary hover:underline"
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

              {/* Channels */}
              <div className="space-y-2">
                <Label>Publier sur</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={channels.includes('facebook')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setChannels([...channels, 'facebook']);
                        } else {
                          setChannels(channels.filter(c => c !== 'facebook'));
                        }
                      }}
                    />
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Facebook</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={channels.includes('instagram')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setChannels([...channels, 'instagram']);
                        } else {
                          setChannels(channels.filter(c => c !== 'instagram'));
                        }
                      }}
                    />
                    <Instagram className="h-4 w-4 text-pink-600" />
                    <span className="text-sm">Instagram</span>
                  </label>
                </div>
              </div>

              {/* Post Button */}
              <Button 
                onClick={handlePost} 
                disabled={posting || !caption || channels.length === 0}
                className="w-full"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Publier maintenant
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPostDialog;
