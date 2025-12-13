import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wand2, 
  Loader2, 
  Copy, 
  Check, 
  Home, 
  Sparkles, 
  Calendar, 
  Gift, 
  Heart, 
  Zap,
  ShoppingBag,
  Package,
  ChevronRight,
  Eye,
  Code,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  currency: string;
  handle?: string;
}

interface Collection {
  id: string;
  title: string;
  image_url: string | null;
  products_count?: number;
}

type EventType = 'normal' | 'promotion' | 'black_friday' | 'valentine' | 'christmas' | 'summer_sale' | 'new_arrivals';
type SelectionMode = 'products' | 'collection' | 'smart';

const EVENT_OPTIONS: { value: EventType; label: string; labelFr: string; icon: React.ReactNode }[] = [
  { value: 'normal', label: 'Normal Homepage', labelFr: "Page d'accueil normale", icon: <Home className="w-4 h-4" /> },
  { value: 'promotion', label: 'Promotion', labelFr: 'Promotion', icon: <Zap className="w-4 h-4" /> },
  { value: 'black_friday', label: 'Black Friday', labelFr: 'Black Friday', icon: <ShoppingBag className="w-4 h-4" /> },
  { value: 'valentine', label: "Valentine's Day", labelFr: 'Saint-Valentin', icon: <Heart className="w-4 h-4" /> },
  { value: 'christmas', label: 'Christmas', labelFr: 'Noël', icon: <Gift className="w-4 h-4" /> },
  { value: 'summer_sale', label: 'Summer Sale', labelFr: 'Soldes été', icon: <Calendar className="w-4 h-4" /> },
  { value: 'new_arrivals', label: 'New Arrivals', labelFr: 'Nouveautés', icon: <Sparkles className="w-4 h-4" /> },
];

export function HomepageGenerator() {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { t, language } = useTranslation();
  
  // Wizard state
  const [step, setStep] = useState(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('smart');
  const [eventType, setEventType] = useState<EventType>('normal');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Generation
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generatedLiquid, setGeneratedLiquid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'preview' | 'html' | 'liquid'>('preview');

  useEffect(() => {
    if (user && selectedStore?.id) {
      loadData();
    }
  }, [user, selectedStore?.id]);

  const loadData = async () => {
    if (!selectedStore?.id) return;
    
    setLoading(true);
    try {
      // Load products
      const { data: productsData } = await supabase
        .from('shopify_products')
        .select('id, title, image_url, price, currency, handle')
        .eq('store_id', selectedStore.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      // Load collections
      const { data: collectionsData } = await supabase
        .from('shopify_collections')
        .select('id, title, image_url, products_count')
        .eq('store_id', selectedStore.id)
        .order('title');

      setProducts(productsData || []);
      setCollections(collectionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleGenerate = async () => {
    if (!selectedStore?.id) {
      toast.error(language === 'fr' ? 'Aucune boutique sélectionnée' : 'No store selected');
      return;
    }

    // Validation
    if (selectionMode === 'products' && selectedProducts.length === 0) {
      toast.error(language === 'fr' ? 'Sélectionnez au moins un produit' : 'Select at least one product');
      return;
    }
    if (selectionMode === 'collection' && !selectedCollection) {
      toast.error(language === 'fr' ? 'Sélectionnez une collection' : 'Select a collection');
      return;
    }

    setGenerating(true);
    try {
      // Get selected products data
      let showcaseProducts: Product[] = [];
      
      if (selectionMode === 'products') {
        showcaseProducts = products.filter(p => selectedProducts.includes(p.id));
      } else if (selectionMode === 'collection') {
        // Get products from collection
        const { data: collectionProducts } = await supabase
          .from('shopify_products')
          .select('id, title, image_url, price, currency, handle')
          .eq('store_id', selectedStore.id)
          .contains('collection_ids', [selectedCollection])
          .limit(12);
        showcaseProducts = collectionProducts || [];
      } else {
        // Smart mode - AI picks best products
        showcaseProducts = products.slice(0, 8);
      }

      const selectedCollectionData = collections.find(c => c.id === selectedCollection);

      const { data, error } = await supabase.functions.invoke('generate-homepage-liquid', {
        body: {
          storeId: selectedStore.id,
          storeName: selectedStore.store_name,
          storeUrl: selectedStore.store_url,
          selectionMode,
          eventType,
          products: showcaseProducts.map(p => ({
            id: p.id,
            title: p.title,
            imageUrl: p.image_url,
            price: p.price,
            currency: p.currency,
            handle: p.handle
          })),
          collection: selectedCollectionData ? {
            id: selectedCollectionData.id,
            title: selectedCollectionData.title,
            imageUrl: selectedCollectionData.image_url
          } : null,
          customTitle,
          customSubtitle,
          language
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedHtml(data.htmlPreview);
        setGeneratedLiquid(data.liquidCode);
        setStep(3);
        toast.success(language === 'fr' ? 'Page d\'accueil générée !' : 'Homepage generated!');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Error generating homepage:', error);
      toast.error(language === 'fr' ? 'Erreur de génération' : 'Generation error', {
        description: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(language === 'fr' ? 'Copié dans le presse-papier !' : 'Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur de copie' : 'Copy failed');
    }
  };

  const getEventLabel = (event: EventType) => {
    const option = EVENT_OPTIONS.find(o => o.value === event);
    return language === 'fr' ? option?.labelFr : option?.label;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {language === 'fr' ? 'Générateur de Page d\'Accueil' : 'Homepage Generator'}
              </CardTitle>
              <CardDescription>
                {language === 'fr' 
                  ? 'Générez du code Liquid Shopify prêt à coller dans votre thème'
                  : 'Generate Shopify Liquid code ready to paste into your theme'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Selection Mode & Event */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'fr' ? 'Configuration' : 'Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selection Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {language === 'fr' ? 'Mode de sélection' : 'Selection Mode'}
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Card 
                  className={`cursor-pointer p-4 transition-all ${selectionMode === 'smart' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectionMode('smart')}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Sparkles className={`w-6 h-6 ${selectionMode === 'smart' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      {language === 'fr' ? 'Smart IA' : 'Smart AI'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'L\'IA choisit les meilleurs produits' : 'AI picks best products'}
                    </span>
                  </div>
                </Card>
                <Card 
                  className={`cursor-pointer p-4 transition-all ${selectionMode === 'products' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectionMode('products')}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Package className={`w-6 h-6 ${selectionMode === 'products' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      {language === 'fr' ? 'Produits' : 'Products'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Sélectionnez manuellement' : 'Select manually'}
                    </span>
                  </div>
                </Card>
                <Card 
                  className={`cursor-pointer p-4 transition-all ${selectionMode === 'collection' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectionMode('collection')}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ShoppingBag className={`w-6 h-6 ${selectionMode === 'collection' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Collection</span>
                    <span className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Utilisez une collection' : 'Use a collection'}
                    </span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Event Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {language === 'fr' ? 'Type d\'événement' : 'Event Type'}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <Card 
                    key={event.value}
                    className={`cursor-pointer p-3 transition-all ${eventType === event.value ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setEventType(event.value)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={eventType === event.value ? 'text-primary' : 'text-muted-foreground'}>
                        {event.icon}
                      </span>
                      <span className="text-sm">
                        {language === 'fr' ? event.labelFr : event.label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Title/Subtitle */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Titre personnalisé (optionnel)' : 'Custom Title (optional)'}</Label>
                <Input 
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={language === 'fr' ? 'Ex: Découvrez notre collection' : 'Ex: Discover our collection'}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Sous-titre (optionnel)' : 'Subtitle (optional)'}</Label>
                <Input 
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder={language === 'fr' ? 'Ex: Qualité premium' : 'Ex: Premium quality'}
                />
              </div>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              {language === 'fr' ? 'Suivant' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Product/Collection Selection */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectionMode === 'smart' 
                ? (language === 'fr' ? 'Confirmation Smart IA' : 'Smart AI Confirmation')
                : selectionMode === 'products'
                  ? (language === 'fr' ? 'Sélection des produits' : 'Product Selection')
                  : (language === 'fr' ? 'Sélection de collection' : 'Collection Selection')
              }
            </CardTitle>
            <CardDescription>
              {selectionMode === 'smart' 
                ? (language === 'fr' ? 'L\'IA sélectionnera automatiquement vos meilleurs produits' : 'AI will automatically select your best products')
                : selectionMode === 'products'
                  ? (language === 'fr' ? `${selectedProducts.length} produit(s) sélectionné(s)` : `${selectedProducts.length} product(s) selected`)
                  : (language === 'fr' ? 'Choisissez une collection à mettre en avant' : 'Choose a collection to showcase')
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectionMode === 'smart' && (
              <div className="p-6 bg-primary/5 rounded-lg text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? `L'IA analysera vos ${products.length} produits et sélectionnera les meilleurs pour votre page d'accueil.`
                    : `AI will analyze your ${products.length} products and select the best ones for your homepage.`
                  }
                </p>
              </div>
            )}

            {selectionMode === 'products' && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <Card 
                      key={product.id}
                      className={`cursor-pointer p-2 transition-all ${selectedProducts.includes(product.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => handleProductToggle(product.id)}
                    >
                      <div className="aspect-square bg-muted rounded-md overflow-hidden mb-2 relative">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        {selectedProducts.includes(product.id) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{product.title}</p>
                      {product.price && (
                        <p className="text-xs text-muted-foreground">{product.currency} {product.price}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectionMode === 'collection' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {collections.map((collection) => (
                  <Card 
                    key={collection.id}
                    className={`cursor-pointer p-3 transition-all ${selectedCollection === collection.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedCollection(collection.id)}
                  >
                    <div className="aspect-video bg-muted rounded-md overflow-hidden mb-2">
                      {collection.image_url ? (
                        <img src={collection.image_url} alt={collection.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{collection.title}</p>
                    {collection.products_count && (
                      <p className="text-xs text-muted-foreground">{collection.products_count} {language === 'fr' ? 'produits' : 'products'}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                {language === 'fr' ? 'Retour' : 'Back'}
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'fr' ? 'Génération...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {language === 'fr' ? 'Générer' : 'Generate'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Copy */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  {language === 'fr' ? 'Page d\'accueil générée !' : 'Homepage Generated!'}
                </CardTitle>
                <CardDescription>
                  {language === 'fr' ? `Événement: ${getEventLabel(eventType)}` : `Event: ${getEventLabel(eventType)}`}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => { setStep(1); setGeneratedHtml(null); setGeneratedLiquid(null); }}>
                {language === 'fr' ? 'Recommencer' : 'Start Over'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View Toggle */}
            <div className="flex gap-2">
              <Button 
                variant={previewMode === 'preview' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setPreviewMode('preview')}
              >
                <Eye className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Aperçu' : 'Preview'}
              </Button>
              <Button 
                variant={previewMode === 'html' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setPreviewMode('html')}
              >
                <Code className="w-4 h-4 mr-2" />
                HTML
              </Button>
              <Button 
                variant={previewMode === 'liquid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setPreviewMode('liquid')}
              >
                <Code className="w-4 h-4 mr-2" />
                Liquid
              </Button>
            </div>

            {/* Preview */}
            {previewMode === 'preview' && generatedHtml && (
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe 
                  srcDoc={generatedHtml}
                  className="w-full h-[500px]"
                  title="Homepage Preview"
                />
              </div>
            )}

            {/* HTML Code */}
            {previewMode === 'html' && generatedHtml && (
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleCopy(generatedHtml)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <ScrollArea className="h-[400px] border rounded-lg">
                  <pre className="p-4 text-xs font-mono bg-muted/50">
                    {generatedHtml}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Liquid Code */}
            {previewMode === 'liquid' && generatedLiquid && (
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleCopy(generatedLiquid)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <ScrollArea className="h-[400px] border rounded-lg">
                  <pre className="p-4 text-xs font-mono bg-muted/50">
                    {generatedLiquid}
                  </pre>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'fr' 
                    ? '💡 Collez ce code dans votre section Shopify ou fichier index.liquid'
                    : '💡 Paste this code in your Shopify section or index.liquid file'}
                </p>
              </div>
            )}

            {/* Product Images Gallery */}
            {generatedHtml && (
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {language === 'fr' ? 'URLs des images produits' : 'Product Image URLs'}
                  </span>
                </div>
                <div className="space-y-2">
                  {products.filter(p => selectionMode === 'smart' || selectedProducts.includes(p.id)).slice(0, 8).map((product) => (
                    product.image_url && (
                      <div key={product.id} className="flex items-center gap-2 text-xs">
                        <img src={product.image_url} alt={product.title} className="w-8 h-8 rounded object-cover" />
                        <span className="truncate flex-1 text-muted-foreground">{product.image_url}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(product.image_url!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
