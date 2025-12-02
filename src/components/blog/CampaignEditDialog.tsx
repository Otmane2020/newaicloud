import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Trash2, X, Package, ShoppingBag } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Collection {
  id: string;
  title: string;
  products_count: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
}

interface Campaign {
  id: string;
  name: string;
  topic_niche: string;
  keywords: string[];
  frequency: string;
  is_active: boolean;
  next_execution_at: string;
  target_audience: string | null;
  auto_post: boolean;
  execution_hour: number;
  store_id: string | null;
  collection_ids: string[] | null;
  product_ids: string[] | null;
}

interface CampaignEditDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignEditDialog({ campaign, open, onOpenChange, onSuccess }: CampaignEditDialogProps) {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<Partial<Campaign>>({});

  useEffect(() => {
    if (campaign && open) {
      setFormData(campaign);
      if (campaign.store_id) {
        loadCollections(campaign.store_id);
        loadProducts(campaign.store_id);
      }
    }
  }, [campaign, open]);

  const loadCollections = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('id, title, products_count')
        .eq('store_id', storeId)
        .order('title', { ascending: true });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, handle')
        .eq('store_id', storeId)
        .order('title', { ascending: true })
        .limit(100);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords?.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...(formData.keywords || []), keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords?.filter(k => k !== keyword) || []
    });
  };

  const toggleCollection = (collectionId: string) => {
    const current = formData.collection_ids || [];
    const newIds = current.includes(collectionId)
      ? current.filter(id => id !== collectionId)
      : [...current, collectionId];
    setFormData({ ...formData, collection_ids: newIds });
  };

  const toggleProduct = (productId: string) => {
    const current = formData.product_ids || [];
    const newIds = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    setFormData({ ...formData, product_ids: newIds });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('blog_campaigns')
        .update({
          name: formData.name,
          topic_niche: formData.topic_niche,
          keywords: formData.keywords,
          frequency: formData.frequency,
          is_active: formData.is_active,
          target_audience: formData.target_audience,
          auto_post: formData.auto_post,
          execution_hour: formData.execution_hour,
          collection_ids: formData.collection_ids || [],
          product_ids: formData.product_ids || [],
        })
        .eq('id', campaign?.id);

      if (error) throw error;

      toast.success(language === 'fr' ? 'Campagne mise à jour' : 'Campaign updated');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast.error(error.message || (language === 'fr' ? 'Erreur de mise à jour' : 'Update error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(language === 'fr' ? 'Supprimer cette campagne ?' : 'Delete this campaign?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('blog_campaigns')
        .delete()
        .eq('id', campaign?.id);

      if (error) throw error;

      toast.success(language === 'fr' ? 'Campagne supprimée' : 'Campaign deleted');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{language === 'fr' ? 'Modifier la campagne' : 'Edit Campaign'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{language === 'fr' ? 'Nom de la campagne' : 'Campaign Name'}</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="topic_niche">{language === 'fr' ? 'Sujet principal' : 'Main Topic'}</Label>
                <Input
                  id="topic_niche"
                  value={formData.topic_niche || ''}
                  onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                />
              </div>

              <div>
                <Label>{language === 'fr' ? 'Mots-clés' : 'Keywords'}</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder={language === 'fr' ? 'Ajouter un mot-clé' : 'Add keyword'}
                  />
                  <Button type="button" onClick={addKeyword} variant="secondary">
                    {language === 'fr' ? 'Ajouter' : 'Add'}
                  </Button>
                </div>
                {formData.keywords && formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeKeyword(keyword)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Collections Selection */}
            {collections.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {language === 'fr' ? 'Collections (optionnel)' : 'Collections (optional)'}
                </Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center gap-2 py-2">
                      <Checkbox
                        checked={formData.collection_ids?.includes(collection.id)}
                        onCheckedChange={() => toggleCollection(collection.id)}
                      />
                      <span className="text-sm">{collection.title}</span>
                      <Badge variant="outline" className="ml-auto">
                        {collection.products_count} {language === 'fr' ? 'produits' : 'products'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' 
                    ? 'Laissez vide pour génération automatique basée sur tous les produits'
                    : 'Leave empty for automatic generation based on all products'}
                </p>
              </div>
            )}

            {/* Products Selection */}
            {products.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {language === 'fr' ? 'Produits spécifiques (optionnel)' : 'Specific Products (optional)'}
                </Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 py-2">
                      <Checkbox
                        checked={formData.product_ids?.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <span className="text-sm">{product.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduling */}
            <div className="space-y-4">
              <div>
                <Label>{language === 'fr' ? 'Fréquence' : 'Frequency'}</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{language === 'fr' ? 'Quotidien' : 'Daily'}</SelectItem>
                    <SelectItem value="weekly">{language === 'fr' ? 'Hebdomadaire' : 'Weekly'}</SelectItem>
                    <SelectItem value="biweekly">{language === 'fr' ? 'Bihebdomadaire' : 'Biweekly'}</SelectItem>
                    <SelectItem value="monthly">{language === 'fr' ? 'Mensuel' : 'Monthly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>{language === 'fr' ? 'Campagne active' : 'Active Campaign'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Désactivez pour mettre en pause' : 'Disable to pause'}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>{language === 'fr' ? 'Publication automatique' : 'Auto-publish'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Publier sur Shopify automatiquement' : 'Publish to Shopify automatically'}
                  </p>
                </div>
                <Switch
                  checked={formData.auto_post}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_post: checked })}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </Button>

          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Enregistrer' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}