import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, Package, FolderOpen, Store, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language';

interface AdsCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type CampaignType = 'product' | 'collection' | 'store';

interface Highlight {
  text: string;
}

interface FormData {
  name: string;
  campaignType: CampaignType | null;
  selectedCollections: string[];
  selectedProducts: string[];
  ctaText: string;
  headline: string;
  subheadline: string;
  highlights: Highlight[];
  storeSummary: string;
  designStyle: 'artistic' | 'minimal' | 'bold';
}

export function AdsCampaignWizard({ open, onOpenChange, onSuccess }: AdsCampaignWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingLanding, setGeneratingLanding] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    campaignType: null,
    selectedCollections: [],
    selectedProducts: [],
    ctaText: '',
    headline: '',
    subheadline: '',
    highlights: [],
    storeSummary: '',
    designStyle: 'artistic',
  });
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [newHighlight, setNewHighlight] = useState('');

  const totalSteps = 6; // Updated to 6 steps with design style
  const progress = (step / totalSteps) * 100;

  // Charger les collections et produits au montage du composant
  useEffect(() => {
    if (open) {
      fetchCollections();
      // For collection type, fetch products after collections are selected
      if (formData.campaignType === 'collection' && formData.selectedCollections.length > 0) {
        fetchProducts(formData.selectedCollections);
      } else if (formData.campaignType !== 'collection') {
        fetchProducts();
      }
    }
  }, [open, formData.campaignType, formData.selectedCollections]);

  const fetchCollections = async () => {
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        setLoadingData(false);
        return;
      }
      
      console.log('Fetching collections for user:', user.id);
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('id, title, image_url')
        .eq('user_id', user.id)
        .order('title');
      
      console.log('Collections data:', data);
      console.log('Collections error:', error);
      
      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error(t.adsCampaign.toasts.collectionsLoadError);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchProducts = async (collectionIds?: string[]) => {
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        setLoadingData(false);
        return;
      }
      
      console.log('Fetching products for user:', user.id);
      let query = supabase
        .from('shopify_products')
        .select('id, title, image_url, vendor, collection_ids')
        .eq('seller_id', user.id);
      
      // Filter by collections if provided (for collection campaign type)
      if (collectionIds && collectionIds.length > 0) {
        query = query.or(
          collectionIds.map(id => `collection_ids.cs.{${id}}`).join(',')
        );
      }
      
      const { data, error } = await query.order('title');
      
      console.log('Products data:', data);
      console.log('Products error:', error);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t.adsCampaign.toasts.productsLoadError);
    } finally {
      setLoadingData(false);
    }
  };

  const generateStoreSummary = async () => {
    setLoadingSummary(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: stores } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!stores || stores.length === 0) {
        toast.error(t.adsCampaign.toasts.noShopifyStore);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-store-summary', {
        body: { storeId: stores[0].id }
      });
      
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, storeSummary: data.summary }));
      toast.success(t.adsCampaign.toasts.summaryGenerated);
      // Auto-advance to next step
      setTimeout(() => setStep(3), 500);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error(t.adsCampaign.toasts.summaryError);
    } finally {
      setLoadingSummary(false);
    }
  };

  const generateLandingPage = async (campaignId: string) => {
    setGeneratingLanding(true);
    try {
      toast.info(t.adsCampaign.toasts.creatingLanding);
      
      const { data, error } = await supabase.functions.invoke('generate-ads-landing-page', {
        body: { campaignId }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      toast.success(t.adsCampaign.toasts.landingCreated);
      
      // Wait a bit to ensure DB update is committed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { landingPageUrl: data.landingPageUrl, html: data.code };
    } catch (error) {
      console.error('Error generating landing page:', error);
      toast.error(t.adsCampaign.toasts.landingError);
      throw error;
    } finally {
      setGeneratingLanding(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !formData.campaignType) {
      toast.error(t.adsCampaign.validation.selectType);
      return;
    }
    if (step === 1 && !formData.name) {
      toast.error(t.adsCampaign.validation.enterName);
      return;
    }
    if (step === 2 && formData.campaignType === 'store' && !formData.storeSummary) {
      await generateStoreSummary();
      return;
    }
    if (step === 2 && formData.selectedCollections.length === 0 && formData.campaignType !== 'store') {
      toast.error(t.adsCampaign.validation.selectCollection);
      return;
    }
    if (step === 3 && formData.selectedProducts.length === 0) {
      toast.error(t.adsCampaign.validation.selectProduct);
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, { text: newHighlight.trim() }]
      }));
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.ctaText || !formData.headline) {
      toast.error(t.adsCampaign.validation.fillRequired);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.adsCampaign.validation.mustBeLoggedIn);
        setLoading(false);
        return;
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('ads_campaigns')
        .insert({
          user_id: user.id,
          name: formData.name,
          campaign_type: formData.campaignType!,
          cta_text: formData.ctaText,
          headline: formData.headline,
          subheadline: formData.subheadline,
          status: 'draft' as const,
          products_count: formData.selectedProducts.length,
          collections_count: formData.selectedCollections.length,
          highlights: formData.highlights as any,
          store_summary: formData.storeSummary || null,
          design_style: formData.designStyle,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert selected collections
      if (formData.selectedCollections.length > 0) {
        const collectionsData = formData.selectedCollections.map(collectionId => ({
          campaign_id: campaign.id,
          collection_id: collectionId,
        }));
        const { error: collectionsError } = await supabase
          .from('ads_campaign_collections')
          .insert(collectionsData);
        if (collectionsError) throw collectionsError;
      }

      // Insert selected products
      if (formData.selectedProducts.length > 0) {
        const productsData = formData.selectedProducts.map(productId => ({
          campaign_id: campaign.id,
          product_id: productId,
        }));
        const { error: productsError } = await supabase
          .from('ads_campaign_products')
          .insert(productsData);
        if (productsError) throw productsError;
      }

      // Generate landing page with AI
      const landingPageData = await generateLandingPage(campaign.id);
      
      // Update campaign with landing page URL
      await supabase
        .from('ads_campaigns')
        .update({ 
          landing_page_url: landingPageData.landingPageUrl,
          status: 'active'
        })
        .eq('id', campaign.id);

      // Create Shopify page (with additional delay to ensure DB commit)
      try {
        toast.info(t.adsCampaign.toasts.creatingShopifyPage);
        
        // Additional safety delay to ensure landing_page_html is committed to DB
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: shopifyData, error: shopifyError } = await supabase.functions.invoke(
          'create-shopify-landing-page',
          {
            body: { campaignId: campaign.id }
          }
        );

        if (shopifyError) throw shopifyError;
        
        if (shopifyData?.shopifyPageUrl) {
          toast.success(t.adsCampaign.toasts.shopifyPageCreated, {
            action: {
              label: 'Voir sur Shopify',
              onClick: () => window.open(shopifyData.shopifyPageUrl, '_blank')
            },
            duration: 10000
          });
        }
      } catch (shopifyErr) {
        console.error('Shopify page creation error:', shopifyErr);
        toast.warning(t.adsCampaign.toasts.landingCreatedShopifyError);
      }

      toast.success(t.adsCampaign.toasts.campaignCreated);
      toast.info(t.adsCampaign.toasts.artisticLandingGenerated, {
        action: {
          label: 'Voir',
          onClick: () => window.open(landingPageData.landingPageUrl, '_blank')
        },
        duration: 10000
      });
      
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setStep(1);
      setFormData({
        name: '',
        campaignType: null,
        selectedCollections: [],
        selectedProducts: [],
        ctaText: '',
        headline: '',
        subheadline: '',
        highlights: [],
        storeSummary: '',
        designStyle: 'artistic',
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(t.adsCampaign.toasts.campaignError);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCollections: prev.selectedCollections.includes(id)
        ? prev.selectedCollections.filter(c => c !== id)
        : [...prev.selectedCollections, id],
    }));
  };

  const toggleProduct = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(id)
        ? prev.selectedProducts.filter(p => p !== id)
        : [...prev.selectedProducts, id],
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la campagne *</Label>
              <Input
                id="name"
                placeholder="Ex: Galerie Collection Élément"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Type de campagne *</Label>
              <div className="grid grid-cols-1 gap-3">
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    formData.campaignType === 'product'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setFormData({ ...formData, campaignType: 'product' })}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Produit</h3>
                      <p className="text-sm text-muted-foreground">
                        Galerie artistique pour mettre en valeur vos produits
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    formData.campaignType === 'collection'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setFormData({ ...formData, campaignType: 'collection' })}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Collection</h3>
                      <p className="text-sm text-muted-foreground">
                        Expérience immersive pour une collection complète
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    formData.campaignType === 'store'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setFormData({ ...formData, campaignType: 'store' })}
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Boutique</h3>
                      <p className="text-sm text-muted-foreground">
                        Présentation artistique de votre univers boutique
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case 2:
        if (formData.campaignType === 'store') {
          return (
            <div className="space-y-4">
              <div>
                <Label>Résumé de votre boutique</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Un résumé intelligent sera généré automatiquement
                </p>
              </div>
              {formData.storeSummary ? (
                <Card className="p-4 bg-primary/5">
                  <p className="text-sm">{formData.storeSummary}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={generateStoreSummary}
                    disabled={loadingSummary}
                  >
                    {loadingSummary ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Régénération...
                      </>
                    ) : (
                      'Régénérer le résumé'
                    )}
                  </Button>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Cliquez sur "Suivant" pour générer un résumé intelligent de votre boutique
                  </p>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div>
              <Label>Sélectionnez les collections à afficher *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Ces collections seront mises en avant sur votre landing page
              </p>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune collection trouvée</h3>
                <p className="text-muted-foreground mb-4">
                  Vous devez d'abord importer vos collections depuis Shopify
                </p>
                <Button variant="outline" onClick={() => window.open('/integration', '_blank')}>
                  Aller aux Intégrations
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <Card
                      key={collection.id}
                      className={`p-3 cursor-pointer transition-all ${
                        formData.selectedCollections.includes(collection.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleCollection(collection.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={formData.selectedCollections.includes(collection.id)}
                          onCheckedChange={() => toggleCollection(collection.id)}
                        />
                        {collection.image_url && (
                          <img
                            src={collection.image_url}
                            alt={collection.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <span className="font-medium">{collection.title}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-sm text-muted-foreground">
              {formData.selectedCollections.length} collection(s) sélectionnée(s)
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Sélectionnez les produits à afficher *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Ces produits seront présentés comme des œuvres d'art dans votre galerie
              </p>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Vous devez d'abord importer vos produits depuis Shopify
                </p>
                <Button variant="outline" onClick={() => window.open('/integration', '_blank')}>
                  Aller aux Intégrations
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-2">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className={`p-3 cursor-pointer transition-all ${
                        formData.selectedProducts.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleProduct(product.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={formData.selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{product.title}</p>
                          {product.vendor && (
                            <p className="text-sm text-muted-foreground">{product.vendor}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-sm text-muted-foreground">
              {formData.selectedProducts.length} produit(s) sélectionné(s)
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Points forts à mettre en avant</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Ajoutez des highlights qui attirent l'attention (avis, certifications, avantages...)
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ex: Avis Google 4,9/5"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
              />
              <Button type="button" onClick={addHighlight} variant="outline">
                Ajouter
              </Button>
            </div>

            {formData.highlights.length > 0 && (
              <div className="space-y-2">
                {formData.highlights.map((highlight, index) => (
                  <Card key={index} className="p-3 flex items-center justify-between">
                    <span className="text-sm">{highlight.text}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHighlight(index)}
                    >
                      ✕
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Exemples de highlights :
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Avis Google 4,9/5</li>
                <li>• Showroom de plus de 300m² en région parisienne</li>
                <li>• Livraison en 10 jours</li>
                <li>• Produits de qualité européenne</li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="headline">Titre principal *</Label>
              <Input
                id="headline"
                placeholder="Ex: Découvrez notre galerie d'art contemporain"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subheadline">Sous-titre</Label>
              <Input
                id="subheadline"
                placeholder="Ex: Des pièces uniques qui transforment votre intérieur"
                value={formData.subheadline}
                onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Texte du bouton Call-to-Action *</Label>
              <Input
                id="cta"
                placeholder="Ex: Explorer la galerie"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Ce texte sera adapté automatiquement selon le contexte
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Style de design</h3>
              <p className="text-muted-foreground">
                Choisissez le style artistique de votre landing page
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card
                className={`p-4 cursor-pointer transition-all border-2 ${
                  formData.designStyle === 'artistic'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-primary/30'
                }`}
                onClick={() => setFormData({ ...formData, designStyle: 'artistic' })}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">Galerie Artistique</h4>
                      <Badge variant="secondary" className="bg-purple-500 text-white">
                        Recommandé
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Layout asymétrique unique pour chaque produit, comme une galerie d'art contemporain
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Masonry organique et asymétrique</li>
                      <li>• Overlays morphing au hover</li>
                      <li>• Expérience immersive type galerie</li>
                      <li>• Layout unique par produit</li>
                    </ul>
                  </div>
                  {formData.designStyle === 'artistic' && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all border-2 ${
                  formData.designStyle === 'minimal'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-primary/30'
                }`}
                onClick={() => setFormData({ ...formData, designStyle: 'minimal' })}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Minimal Élégant</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Design épuré avec focus sur l'essentiel, typographie soignée
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Espace blanc généreux</li>
                      <li>• Typographie hiérarchisée</li>
                      <li>• Animations subtiles</li>
                      <li>• Navigation intuitive</li>
                    </ul>
                  </div>
                  {formData.designStyle === 'minimal' && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all border-2 ${
                  formData.designStyle === 'bold'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-primary/30'
                }`}
                onClick={() => setFormData({ ...formData, designStyle: 'bold' })}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Audacieux & Moderne</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Design impactant avec couleurs vibrantes et animations dynamiques
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Couleurs contrastées</li>
                      <li>• Animations bold</li>
                      <li>• Layout non-conventionnel</li>
                      <li>• Expérience mémorable</li>
                    </ul>
                  </div>
                  {formData.designStyle === 'bold' && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </Card>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-primary font-medium">
                🎨 Votre landing page sera générée automatiquement avec le style "{formData.designStyle}" sélectionné
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une Landing Page Artistique</DialogTitle>
          <DialogDescription>
            Étape {step} sur {totalSteps} - Design galerie d'art unique
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="mb-6" />

        <div className="py-4">{renderStep()}</div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading || generatingLanding}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={loading || generatingLanding}>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || generatingLanding}>
              {loading || generatingLanding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {generatingLanding ? 'Génération...' : 'Création...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la galerie
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}