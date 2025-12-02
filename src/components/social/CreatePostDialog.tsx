import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Facebook, Instagram, Wand2, Image } from "lucide-react";

interface CreatePostDialogProps {
  userId?: string;
  storeId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreatePostDialog = ({ userId, storeId, onClose, onCreated }: CreatePostDialogProps) => {
  const [contentType, setContentType] = useState<'product' | 'collection' | 'article'>('product');
  const [contentId, setContentId] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [channels, setChannels] = useState<string[]>(['facebook', 'instagram']);
  const [templateStyle, setTemplateStyle] = useState('simple');
  const [includeLink, setIncludeLink] = useState(true);
  
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, [userId, storeId]);

  const loadContent = async () => {
    if (!userId) return;
    
    try {
      const [productsRes, collectionsRes, articlesRes] = await Promise.all([
        supabase
          .from('shopify_products')
          .select('id, title, product_images(src)')
          .eq('seller_id', userId)
          .limit(50),
        supabase
          .from('shopify_collections')
          .select('id, title, image_src')
          .eq('user_id', userId)
          .limit(50),
        supabase
          .from('blog_articles')
          .select('id, title, featured_image')
          .eq('user_id', userId)
          .limit(50),
      ]);

      setProducts(productsRes.data || []);
      setCollections(collectionsRes.data || []);
      setArticles(articlesRes.data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async () => {
    if (!contentId) {
      toast.error('Sélectionnez un contenu');
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-social-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            contentType,
            contentId,
            templateStyle,
            channels,
            includeLink,
            language: 'fr',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setCaption(data.caption);
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        }
        toast.success('Légende générée !');
      } else {
        throw new Error(data.error || 'Erreur de génération');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleContentSelect = (id: string) => {
    setContentId(id);
    
    // Auto-set image URL
    if (contentType === 'product') {
      const product = products.find(p => p.id === id);
      setImageUrl(product?.product_images?.[0]?.src || '');
    } else if (contentType === 'collection') {
      const collection = collections.find(c => c.id === id);
      setImageUrl(collection?.image_src || '');
    } else if (contentType === 'article') {
      const article = articles.find(a => a.id === id);
      setImageUrl(article?.featured_image || '');
    }
  };

  const savePost = async () => {
    if (!contentId || !caption) {
      toast.error('Sélectionnez un contenu et ajoutez une légende');
      return;
    }

    if (channels.length === 0) {
      toast.error('Sélectionnez au moins un canal');
      return;
    }

    setSaving(true);
    try {
      const postData: any = {
        user_id: userId,
        store_id: storeId || null,
        content_type: contentType,
        caption,
        image_url: imageUrl || null,
        channels,
        template_style: templateStyle,
        link_url: includeLink ? null : null, // Will be set by backend
        status: 'draft',
      };

      // Set the appropriate content ID field
      if (contentType === 'product') {
        postData.product_id = contentId;
      } else if (contentType === 'collection') {
        postData.collection_id = contentId;
      } else if (contentType === 'article') {
        postData.article_id = contentId;
      }

      const { error } = await supabase
        .from('social_posts')
        .insert(postData);

      if (error) throw error;
      toast.success('Post créé !');
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getContentOptions = () => {
    switch (contentType) {
      case 'product':
        return products;
      case 'collection':
        return collections;
      case 'article':
        return articles;
      default:
        return [];
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un post social</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content Type */}
          <div className="space-y-2">
            <Label>Type de contenu</Label>
            <Select value={contentType} onValueChange={(v: any) => { setContentType(v); setContentId(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">🏷️ Produit</SelectItem>
                <SelectItem value="collection">📁 Collection</SelectItem>
                <SelectItem value="article">📝 Article</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Selection */}
          <div className="space-y-2">
            <Label>Sélectionner le contenu</Label>
            <Select value={contentId} onValueChange={handleContentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {getContentOptions().map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Légende</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateCaption}
                disabled={generating || !contentId}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Écrivez votre légende..."
              rows={4}
            />
          </div>

          {/* Template Style */}
          <div className="space-y-2">
            <Label>Style du template</Label>
            <Select value={templateStyle} onValueChange={setTemplateStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">📷 Photo simple</SelectItem>
                <SelectItem value="overlay">✨ Template avec overlay</SelectItem>
                <SelectItem value="carousel">🎠 Carrousel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Canaux de publication</Label>
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
                Facebook (3 crédits)
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
                Instagram (3 crédits)
              </label>
            </div>
          </div>

          {/* Include Link */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={includeLink}
              onCheckedChange={(checked) => setIncludeLink(!!checked)}
            />
            Inclure le lien vers le produit/article
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button onClick={savePost} disabled={saving || !contentId || !caption} className="flex-1">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Créer le post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
