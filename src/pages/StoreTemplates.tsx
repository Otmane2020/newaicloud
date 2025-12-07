import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Palette, 
  Sparkles, 
  Layout, 
  Eye, 
  Download, 
  RefreshCw,
  Store,
  ShoppingBag,
  Layers,
  Wand2,
  Code,
  Copy
} from "lucide-react";

// Template styles disponibles
const TEMPLATE_STYLES = [
  { id: 'minimal', name: 'Minimal', nameEn: 'Minimal', description: 'Design épuré et moderne' },
  { id: 'premium', name: 'Premium', nameEn: 'Premium', description: 'Style luxueux et élégant' },
  { id: 'tech', name: 'Tech', nameEn: 'Tech', description: 'Style moderne et technologique' },
  { id: 'boutique', name: 'Boutique', nameEn: 'Boutique', description: 'Style boutique chic' },
  { id: 'eco', name: 'Éco-responsable', nameEn: 'Eco-friendly', description: 'Style naturel et vert' },
  { id: 'urban', name: 'Urbain', nameEn: 'Urban', description: 'Style streetwear et moderne' },
];

// Color schemes disponibles
const COLOR_SCHEMES = [
  { id: 'light', name: 'Clair', nameEn: 'Light', colors: { bg: '#ffffff', text: '#1a1a1a', accent: '#3b82f6' } },
  { id: 'dark', name: 'Sombre', nameEn: 'Dark', colors: { bg: '#0f0f0f', text: '#ffffff', accent: '#60a5fa' } },
  { id: 'warm', name: 'Chaleureux', nameEn: 'Warm', colors: { bg: '#fef7ed', text: '#451a03', accent: '#ea580c' } },
  { id: 'cool', name: 'Froid', nameEn: 'Cool', colors: { bg: '#f0f9ff', text: '#0c4a6e', accent: '#0284c7' } },
  { id: 'nature', name: 'Nature', nameEn: 'Nature', colors: { bg: '#f0fdf4', text: '#14532d', accent: '#16a34a' } },
  { id: 'luxury', name: 'Luxe', nameEn: 'Luxury', colors: { bg: '#1c1917', text: '#d4af37', accent: '#fbbf24' } },
];

// Layout options
const LAYOUT_OPTIONS = [
  { id: 'grid', name: 'Grille', nameEn: 'Grid', icon: Layout },
  { id: 'masonry', name: 'Masonry', nameEn: 'Masonry', icon: Layers },
  { id: 'carousel', name: 'Carrousel', nameEn: 'Carousel', icon: ShoppingBag },
];

export default function StoreTemplates() {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { language, t } = useTranslation();
  
  const [selectedStyle, setSelectedStyle] = useState('minimal');
  const [selectedColorScheme, setSelectedColorScheme] = useState('light');
  const [selectedLayout, setSelectedLayout] = useState('grid');
  const [storeName, setStoreName] = useState(selectedStore?.store_name || '');
  const [storeDescription, setStoreDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('configure');

  const handleGenerateTemplate = async () => {
    if (!selectedStore) {
      toast.error(language === 'fr' ? 'Veuillez sélectionner une boutique' : 'Please select a store');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Récupérer les produits de la boutique pour le template
      const { data: products } = await supabase
        .from('shopify_products')
        .select('id, title, image_url, price, currency, seo_description')
        .eq('store_id', selectedStore.id)
        .limit(12);

      const style = TEMPLATE_STYLES.find(s => s.id === selectedStyle);
      const colorScheme = COLOR_SCHEMES.find(c => c.id === selectedColorScheme);
      
      // Générer le template HTML
      const templateHtml = generateTemplateHtml({
        storeName: storeName || selectedStore.store_name,
        storeDescription,
        style,
        colorScheme,
        layout: selectedLayout,
        products: products || [],
      });

      setGeneratedTemplate(templateHtml);
      setActiveTab('preview');
      
      toast.success(language === 'fr' ? 'Template généré avec succès!' : 'Template generated successfully!');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la génération' : 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedTemplate) {
      navigator.clipboard.writeText(generatedTemplate);
      toast.success(language === 'fr' ? 'Code copié!' : 'Code copied!');
    }
  };

  const handleDownload = () => {
    if (generatedTemplate) {
      const blob = new Blob([generatedTemplate], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storeName || 'store'}-template.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(language === 'fr' ? 'Template téléchargé!' : 'Template downloaded!');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Palette className="h-8 w-8 text-primary" />
            {language === 'fr' ? 'Générateur de Templates' : 'Template Generator'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'fr' 
              ? 'Créez des templates personnalisés pour votre boutique' 
              : 'Create custom templates for your store'}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="w-3 h-3 mr-1" />
          {language === 'fr' ? 'Fonctionnalité Beta' : 'Beta Feature'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            {language === 'fr' ? 'Configurer' : 'Configure'}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!generatedTemplate}>
            <Eye className="w-4 h-4" />
            {language === 'fr' ? 'Aperçu' : 'Preview'}
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2" disabled={!generatedTemplate}>
            <Code className="w-4 h-4" />
            {language === 'fr' ? 'Code' : 'Code'}
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Store Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {language === 'fr' ? 'Informations Boutique' : 'Store Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Nom de la boutique' : 'Store Name'}</Label>
                  <Input 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={selectedStore?.store_name || 'Ma Boutique'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Description' : 'Description'}</Label>
                  <Textarea 
                    value={storeDescription} 
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder={language === 'fr' ? 'Décrivez votre boutique...' : 'Describe your store...'}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Style Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  {language === 'fr' ? 'Style du Template' : 'Template Style'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Style visuel' : 'Visual Style'}</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_STYLES.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          {language === 'fr' ? style.name : style.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Palette de couleurs' : 'Color Scheme'}</Label>
                  <Select value={selectedColorScheme} onValueChange={setSelectedColorScheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map(scheme => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: scheme.colors.accent }}
                            />
                            {language === 'fr' ? scheme.name : scheme.nameEn}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Layout Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                {language === 'fr' ? 'Disposition des Produits' : 'Product Layout'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {LAYOUT_OPTIONS.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedLayout === layout.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <layout.icon className="w-8 h-8" />
                    <span className="font-medium">
                      {language === 'fr' ? layout.name : layout.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleGenerateTemplate}
              disabled={isGenerating || !selectedStore}
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  {language === 'fr' ? 'Génération...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {language === 'fr' ? 'Générer le Template' : 'Generate Template'}
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{language === 'fr' ? 'Aperçu du Template' : 'Template Preview'}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Copier' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Télécharger' : 'Download'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
                {generatedTemplate && (
                  <iframe 
                    srcDoc={generatedTemplate}
                    className="w-full h-full"
                    title="Template Preview"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{language === 'fr' ? 'Code HTML' : 'HTML Code'}</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                <Copy className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Copier le code' : 'Copy code'}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                <code>{generatedTemplate}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fonction de génération du template HTML
function generateTemplateHtml(config: {
  storeName: string;
  storeDescription: string;
  style: any;
  colorScheme: any;
  layout: string;
  products: any[];
}) {
  const { storeName, storeDescription, style, colorScheme, layout, products } = config;
  const colors = colorScheme?.colors || { bg: '#ffffff', text: '#1a1a1a', accent: '#3b82f6' };

  const productCards = products.map(product => `
    <div class="product-card">
      <div class="product-image">
        <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=Product'}" alt="${product.title}" />
      </div>
      <div class="product-info">
        <h3>${product.title}</h3>
        <p class="price">${product.price} ${product.currency || '€'}</p>
      </div>
    </div>
  `).join('');

  const layoutClass = layout === 'masonry' ? 'masonry' : layout === 'carousel' ? 'carousel' : 'grid';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: ${colors.bg};
      color: ${colors.text};
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    /* Header */
    header {
      padding: 20px 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: ${colors.accent};
    }
    
    /* Hero */
    .hero {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(135deg, ${colors.accent}15, ${colors.bg});
    }
    
    .hero h1 {
      font-size: 2.5rem;
      margin-bottom: 16px;
      font-weight: 700;
    }
    
    .hero p {
      font-size: 1.125rem;
      opacity: 0.8;
      max-width: 600px;
      margin: 0 auto;
    }
    
    /* Products */
    .products-section {
      padding: 60px 0;
    }
    
    .section-title {
      text-align: center;
      font-size: 2rem;
      margin-bottom: 40px;
    }
    
    .products-${layoutClass} {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    
    .product-card {
      background: ${colors.bg};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }
    
    .product-image {
      aspect-ratio: 1;
      overflow: hidden;
    }
    
    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    
    .product-card:hover .product-image img {
      transform: scale(1.05);
    }
    
    .product-info {
      padding: 16px;
    }
    
    .product-info h3 {
      font-size: 1rem;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .price {
      color: ${colors.accent};
      font-weight: 700;
      font-size: 1.125rem;
    }
    
    /* Footer */
    footer {
      padding: 40px 0;
      text-align: center;
      border-top: 1px solid rgba(0,0,0,0.1);
      opacity: 0.7;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 1.75rem;
      }
      
      .products-${layoutClass} {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="logo">${storeName}</div>
    </div>
  </header>
  
  <section class="hero">
    <div class="container">
      <h1>${storeName}</h1>
      <p>${storeDescription || 'Découvrez notre collection unique de produits soigneusement sélectionnés pour vous.'}</p>
    </div>
  </section>
  
  <section class="products-section">
    <div class="container">
      <h2 class="section-title">Nos Produits</h2>
      <div class="products-${layoutClass}">
        ${productCards}
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${storeName}. Tous droits réservés.</p>
    </div>
  </footer>
</body>
</html>`;
}
