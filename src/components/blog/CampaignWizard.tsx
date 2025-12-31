import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Calendar, Target, Users, Clock, ArrowRight, ArrowLeft, X, Package, ShoppingBag } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';

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

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TOTAL_STEPS = 6;

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const { t, language } = useTranslation();
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const [step, setStep] = useState(1);
  const [keywordInput, setKeywordInput] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topic_niche: '',
    keywords: [] as string[],
    target_audience: '',
    frequency: 'weekly',
    start_date: new Date().toISOString().split('T')[0],
    auto_publish: false,
    execution_hour: 12,
  });

  useEffect(() => {
    if (open && selectedStore) {
      loadCollections();
    }
  }, [open, selectedStore]);

  const loadCollections = async () => {
    if (!selectedStore) {
      console.log('CampaignWizard - No store selected');
      return;
    }
    
    try {
      console.log('CampaignWizard - Loading collections for store:', selectedStore.id, selectedStore.store_name);
      
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('id, title, products_count')
        .eq('store_id', selectedStore.id)
        .order('title', { ascending: true });

      if (error) throw error;
      
      console.log('CampaignWizard - Collections loaded:', {
        count: data?.length || 0,
        storeId: selectedStore.id,
        collections: data?.map(c => c.title)
      });
      
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadProducts = async () => {
    if (!selectedStore || selectedCollections.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, handle')
        .eq('store_id', selectedStore.id)
        .filter('collection_ids', 'cs', `{${selectedCollections.join(',')}}`)
        .order('title', { ascending: true })
        .limit(100);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    if (selectedCollections.length > 0) {
      loadProducts();
    } else {
      setProducts([]);
      setSelectedProducts([]);
    }
  }, [selectedCollections]);

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword)
    });
  };

  const nextStep = () => {
    if (step === 1 && !formData.name) {
      toast.error(t.campaignWizard.toasts.enterCampaignName);
      return;
    }
    if (step === 2 && !formData.topic_niche) {
      toast.error(t.campaignWizard.toasts.defineMainTopic);
      return;
    }
    // Load products when moving from collections step to products step
    if (step === 3 && selectedCollections.length > 0) {
      loadProducts();
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.campaignWizard.toasts.notAuthenticated);

      if (!selectedStore) {
        toast.error(t.campaignWizard.toasts.selectStore);
        setLoading(false);
        return;
      }

      // Vérifier les limites de campagnes avant de créer
      if (!canDoAction('campaigns')) {
        toast.error(t.campaignWizard.toasts.campaignLimitReached, {
          description: limits?.isTrialing 
            ? t.campaignWizard.toasts.upgradeForCampaigns
            : t.campaignWizard.toasts.monthlyLimitReached
        });
        setShowUpgradeDialog(true);
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('blog_campaigns')
        .insert({
          user_id: user.id,
          store_id: selectedStore.id,
          name: formData.name,
          frequency: formData.frequency,
          auto_post: formData.auto_publish,
          topic_niche: formData.topic_niche,
          keywords: formData.keywords,
          target_audience: formData.target_audience,
          collection_ids: selectedCollections,
          product_ids: selectedProducts,
          next_execution_at: new Date(formData.start_date).toISOString(),
          execution_hour: formData.execution_hour,
        });

      if (error) throw error;

      // Incrémenter le compteur de campagnes
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'campaigns_count',
        p_increment: 1
      });

      toast.success(t.campaignWizard.toasts.campaignCreated);
      await refreshLimits();
      onSuccess();
      onOpenChange(false);
      setStep(1);
      setSelectedCollections([]);
      setSelectedProducts([]);
      setFormData({
        name: '',
        description: '',
        topic_niche: '',
        keywords: [],
        target_audience: '',
        frequency: 'weekly',
        start_date: new Date().toISOString().split('T')[0],
        auto_publish: false,
        execution_hour: 12,
      });
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || t.campaignWizard.toasts.creationError);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{t.campaignWizard.steps.basicInfo.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.basicInfo.description}
              </p>
            </div>

            <div>
              <Label htmlFor="name" className="text-sm">{t.campaignWizard.labels.campaignName} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.campaignWizard.placeholders.campaignName}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm">{t.campaignWizard.labels.description}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.campaignWizard.placeholders.description}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{t.campaignWizard.steps.topicKeywords.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.topicKeywords.description}
              </p>
            </div>

            <div>
              <Label htmlFor="topic_niche" className="text-sm">{t.campaignWizard.labels.mainTopic} *</Label>
              <Input
                id="topic_niche"
                value={formData.topic_niche}
                onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                placeholder={t.campaignWizard.placeholders.mainTopic}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t.campaignWizard.hints.mainTopic}
              </p>
            </div>

            <div>
              <Label htmlFor="keywords" className="text-sm">{t.campaignWizard.labels.keywords}</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder={t.campaignWizard.placeholders.keyword}
                  className="flex-1"
                />
                <Button type="button" onClick={addKeyword} variant="secondary" size="sm" className="sm:size-default shrink-0">
                  {t.campaignWizard.buttons.add}
                </Button>
              </div>
              
              {formData.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                  {formData.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="gap-1 text-xs">
                      {keyword}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeKeyword(keyword)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-1.5">
                {t.campaignWizard.hints.keywords}
              </p>
            </div>
          </div>
        );

      // Step 3: Collections only
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">
                {t.campaignWizard.steps.collectionsProducts.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {language === 'fr' 
                  ? 'Sélectionnez les collections de produits à inclure'
                  : 'Select the product collections to include'}
              </p>
            </div>

            {collections.length > 0 ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4" />
                  {t.campaignWizard.steps.collectionsProducts.collections} ({collections.length})
                </Label>
                <ScrollArea className="h-[200px] sm:h-[280px] border rounded-lg p-3 sm:p-4">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center gap-2 sm:gap-3 py-2 border-b last:border-b-0">
                      <Checkbox
                        checked={selectedCollections.includes(collection.id)}
                        onCheckedChange={() => {
                          setSelectedCollections(prev =>
                            prev.includes(collection.id)
                              ? prev.filter(id => id !== collection.id)
                              : [...prev, collection.id]
                          );
                        }}
                      />
                      <span className="text-xs sm:text-sm flex-1 truncate">{collection.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {collection.products_count} {t.campaignWizard.steps.collectionsProducts.productsCount}
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedCollections.length > 0 
                    ? `${selectedCollections.length} ${language === 'fr' ? 'collection(s) sélectionnée(s)' : 'collection(s) selected'}`
                    : t.campaignWizard.steps.collectionsProducts.collectionsHelp}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Aucune collection trouvée pour ce store. Synchronisez vos produits depuis Shopify.'
                    : 'No collections found for this store. Sync your products from Shopify.'}
                </p>
              </div>
            )}
          </div>
        );

      // Step 4: Products selection (only if collections selected)
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">
                {t.campaignWizard.steps.collectionsProducts.specificProducts}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {language === 'fr' 
                  ? 'Optionnel: Sélectionnez des produits spécifiques'
                  : 'Optional: Select specific products'}
              </p>
            </div>

            {selectedCollections.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t.campaignWizard.steps.collectionsProducts.noCollectionSelected}
                </p>
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  {language === 'fr' ? 'Produits disponibles' : 'Available products'} ({products.length})
                </Label>
                <ScrollArea className="h-[200px] sm:h-[280px] border rounded-lg p-3 sm:p-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 sm:gap-3 py-2 border-b last:border-b-0">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => {
                          setSelectedProducts(prev =>
                            prev.includes(product.id)
                              ? prev.filter(id => id !== product.id)
                              : [...prev, product.id]
                          );
                        }}
                      />
                      <span className="text-xs sm:text-sm truncate">{product.title}</span>
                    </div>
                  ))}
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedProducts.length > 0 
                    ? `${selectedProducts.length} ${language === 'fr' ? 'produit(s) sélectionné(s)' : 'product(s) selected'}`
                    : (language === 'fr' 
                      ? 'Laissez vide pour utiliser tous les produits des collections'
                      : 'Leave empty to use all products from collections')}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Chargement des produits...'
                    : 'Loading products...'}
                </p>
              </div>
            )}
          </div>
        );

      // Step 5: Target Audience
      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{t.campaignWizard.steps.targetAudience.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.targetAudience.description}
              </p>
            </div>

            <div>
              <Label htmlFor="target_audience" className="text-sm">{t.campaignWizard.labels.targetAudience}</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t.campaignWizard.audiences.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionals">{t.campaignWizard.audiences.professionals}</SelectItem>
                  <SelectItem value="individuals">{t.campaignWizard.audiences.individuals}</SelectItem>
                  <SelectItem value="designers">{t.campaignWizard.audiences.designers}</SelectItem>
                  <SelectItem value="young_couples">{t.campaignWizard.audiences.youngCouples}</SelectItem>
                  <SelectItem value="families">{t.campaignWizard.audiences.families}</SelectItem>
                  <SelectItem value="all">{t.campaignWizard.audiences.all}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // Step 6: Scheduling
      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{t.campaignWizard.steps.scheduling.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.scheduling.description}
              </p>
            </div>

            <div>
              <Label htmlFor="frequency" className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                {t.campaignWizard.labels.frequency}
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.campaignWizard.frequencies.daily}</SelectItem>
                  <SelectItem value="weekly">{t.campaignWizard.frequencies.weekly}</SelectItem>
                  <SelectItem value="biweekly">{t.campaignWizard.frequencies.biweekly}</SelectItem>
                  <SelectItem value="monthly">{t.campaignWizard.frequencies.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date" className="text-sm">{t.campaignWizard.labels.startDate}</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1.5"
              />
            </div>

            {formData.frequency === 'daily' && (
              <div>
                <Label htmlFor="execution_hour" className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  {t.campaignWizard.labels.executionHour}
                </Label>
                <Select
                  value={String(formData.execution_hour)}
                  onValueChange={(value) => setFormData({ ...formData, execution_hour: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t.campaignWizard.hints.executionHour}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg gap-3">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="auto_publish" className="text-sm">{t.campaignWizard.labels.autoPublish}</Label>
                <p className="text-xs text-muted-foreground">
                  {t.campaignWizard.labels.autoPublishDesc}
                </p>
              </div>
              <Switch
                id="auto_publish"
                checked={formData.auto_publish}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_publish: checked })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl">{t.dialogs.campaignWizard.newCampaign}</DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm">
              {t.dialogs.campaignWizard.stepOf.replace('{{step}}', String(step)).replace('{{total}}', String(TOTAL_STEPS))}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-1.5 sm:h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {renderStep()}

          <div className="flex justify-between pt-3 sm:pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 1 || loading}
              size="sm"
              className="sm:size-default"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.dialogs.campaignWizard.back}</span>
              <span className="sm:hidden">{language === 'fr' ? 'Retour' : 'Back'}</span>
            </Button>

            {step < TOTAL_STEPS ? (
              <Button type="button" onClick={nextStep} size="sm" className="sm:size-default">
                <span className="hidden sm:inline">{t.dialogs.campaignWizard.next}</span>
                <span className="sm:hidden">{language === 'fr' ? 'Suivant' : 'Next'}</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} size="sm" className="sm:size-default">
                {loading ? (
                  <>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="text-xs sm:text-sm">{t.dialogs.campaignWizard.creating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">{t.dialogs.campaignWizard.create}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="campaigns"
        usage={limits?.usage.campaigns_count}
        limit={limits?.limits.max_campaigns}
      />
    </>
  );
}
