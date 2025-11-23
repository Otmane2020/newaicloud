import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Tag, FileText, Image, RefreshCw, Eye, Trash2, Loader2 } from 'lucide-react';

interface TestProductCardProps {
  product: any;
}

export function TestProductCard({ product }: TestProductCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerateSEO = async () => {
    setLoading('seo');
    try {
      const { error } = await supabase.functions.invoke('generate-title-description', {
        body: { 
          currentTitle: product.title || 'Produit sans titre',
          imageUrl: product.image_url || product.images?.[0]?.src,
          vendor: product.vendor
        }
      });
      if (error) throw error;
      toast.success('SEO généré avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération du SEO');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateTags = async () => {
    setLoading('tags');
    try {
      const { error } = await supabase.functions.invoke('generate-tags', {
        body: { 
          title: product.title,
          description: product.description,
          productType: product.product_type,
          vendor: product.vendor
        }
      });
      if (error) throw error;
      toast.success('Tags générés avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération des tags');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateLanding = async () => {
    setLoading('landing');
    try {
      const { error } = await supabase.functions.invoke('generate-landing-ai', {
        body: { 
          product_id: product.id,
          productTitle: product.title,
          description: product.description || product.body_html || "",
          vendor: product.vendor || "Marque",
          imageUrl: product.image_url || product.images?.[0]?.src,
          style: 'modern',
          layout: 'single-column',
          language: 'fr',
          designStyle: 'modern',
          length: 'short',
        }
      });
      if (error) throw error;
      toast.success('Landing page générée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération de la landing page');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAltTexts = async () => {
    setLoading('alt');
    try {
      const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
        body: { 
          productId: product.id,
          images: product.images || [],
          title: product.title
        }
      });
      if (error) throw error;
      toast.success('Alt texts générés avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération des alt texts');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleSync = async () => {
    setLoading('sync');
    try {
      const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
        body: { productIds: [product.id] }
      });
      if (error) throw error;
      toast.success('Synchronisé avec Shopify');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleToggleStatus = async () => {
    setLoading('status');
    try {
      const { error } = await supabase.functions.invoke('update-product-status', {
        body: {
          productId: product.shopify_product_id,
          storeId: product.store_id,
          status: product.status === 'active' ? 'draft' : 'active'
        }
      });
      if (error) throw error;
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    setLoading('delete');
    try {
      const { error } = await supabase.functions.invoke('delete-shopify-product', {
        body: {
          productId: product.shopify_product_id,
          storeId: product.store_id
        }
      });
      if (error) throw error;
      toast.success('Produit supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-20 h-20 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold">{product.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {product.seo_description || 'Pas de description'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
              {product.seo_score && (
                <Badge variant="outline">Score: {product.seo_score}/100</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSEO}
              disabled={!!loading}
            >
              {loading === 'seo' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              SEO
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateTags}
              disabled={!!loading}
            >
              {loading === 'tags' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Tag className="w-3 h-3 mr-1" />
              )}
              Tags
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateLanding}
              disabled={!!loading}
            >
              {loading === 'landing' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <FileText className="w-3 h-3 mr-1" />
              )}
              Landing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAltTexts}
              disabled={!!loading}
            >
              {loading === 'alt' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Image className="w-3 h-3 mr-1" />
              )}
              Alt Texts
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={!!loading}
            >
              {loading === 'sync' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Sync
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStatus}
              disabled={!!loading}
            >
              {loading === 'status' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Eye className="w-3 h-3 mr-1" />
              )}
              Toggle
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={!!loading}
            >
              {loading === 'delete' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
