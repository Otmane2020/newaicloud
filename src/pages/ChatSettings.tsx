import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Save, 
  Smile, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Copy, 
  Check, 
  Store,
  MessageCircle,
  Palette,
  Code,
  Eye,
  ShoppingCart,
  Users,
  BarChart3,
  Shield
} from 'lucide-react';

interface ChatSettings {
  assistant_style: string;
  tone: string;
  default_language: string;
  response_length: string;
  custom_instructions: string;
  save_history: boolean;
  embed_enabled: boolean;
  embed_position: string;
  embed_welcome_message: string;
  embed_primary_color: string;
  embed_button_text: string;
  embed_avatar: string;
  embed_sales_focus: boolean;
  embed_product_recommendations: boolean;
  embed_order_support: boolean;
}

export default function ChatSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('behavior');
  const [settings, setSettings] = useState<ChatSettings>({
    assistant_style: 'professional',
    tone: 'professional',
    default_language: 'fr',
    response_length: 'medium',
    custom_instructions: '',
    save_history: true,
    embed_enabled: false,
    embed_position: 'bottom-right',
    embed_welcome_message: 'Bonjour ! Je suis votre assistant commercial. Comment puis-je vous aider aujourd\'hui ?',
    embed_primary_color: '#2563eb',
    embed_button_text: 'Assistance Commerciale',
    embed_avatar: 'professional',
    embed_sales_focus: true,
    embed_product_recommendations: true,
    embed_order_support: true,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        // Fusionner les données avec les valeurs par défaut
        setSettings(prev => ({
          ...prev,
          ...data,
          // Assurer que les nouveaux champs ont des valeurs par défaut
          embed_avatar: data.embed_avatar || 'professional',
          embed_sales_focus: data.embed_sales_focus !== undefined ? data.embed_sales_focus : true,
          embed_product_recommendations: data.embed_product_recommendations !== undefined ? data.embed_product_recommendations : true,
          embed_order_support: data.embed_order_support !== undefined ? data.embed_order_support : true,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: user?.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Paramètres sauvegardés avec succès !');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const embedCode = `<script>
window.chatWidgetConfig = {
  position: '${settings.embed_position}',
  welcomeMessage: '${settings.embed_welcome_message}',
  primaryColor: '${settings.embed_primary_color}',
  buttonText: '${settings.embed_button_text}',
  avatar: '${settings.embed_avatar}',
  salesFocus: ${settings.embed_sales_focus},
  productRecommendations: ${settings.embed_product_recommendations},
  orderSupport: ${settings.embed_order_support},
  shopDomain: '${typeof window !== 'undefined' ? window.location.hostname : 'your-store.myshopify.com'}'
};
</script>
<script src="https://cdn.yourdomain.com/chat-widget-pro.js" defer></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Code copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  const styleOptions = [
    { 
      value: 'sales', 
      label: 'Commercial', 
      icon: Users, 
      desc: 'Orientation vente, persuasif, conseils produits',
      recommended: true
    },
    { 
      value: 'professional', 
      label: 'Professionnel', 
      icon: Briefcase, 
      desc: 'Formel, précis, adapté aux B2B' 
    },
    { 
      value: 'friendly', 
      label: 'Service Client', 
      icon: Smile, 
      desc: 'Convivial, empathique, résolution problèmes' 
    },
    { 
      value: 'expert', 
      label: 'Expert Produit', 
      icon: GraduationCap, 
      desc: 'Technique, détaillé, spécifications' 
    },
  ];

  const avatarOptions = [
    { value: 'professional', label: 'Avatar Professionnel', desc: 'Représentation corporate' },
    { value: 'friendly', label: 'Avatar Amical', desc: 'Approche service client' },
    { value: 'ai', label: 'Icône IA Moderne', desc: 'Style moderne et technologique' },
    { value: 'brand', label: 'Logo Marque', desc: 'Identité visuelle de la marque' },
  ];

  const previewStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Paramètres du Chat Commercial</h1>
        </div>
        <p className="text-muted-foreground">Configurez votre assistant IA pour optimiser les ventes et le service client</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comportement
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Intégration Shopify
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Aperçu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Style de l'assistant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Profil Commercial
                </CardTitle>
                <CardDescription>Choisissez le style de votre assistant commercial</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={settings.assistant_style}
                  onValueChange={(value) => setSettings({ ...settings, assistant_style: value })}
                  className="space-y-3"
                >
                  {styleOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Label
                        key={option.value}
                        htmlFor={option.value}
                        className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent ${
                          settings.assistant_style === option.value ? 'border-primary bg-accent' : 'border-muted'
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-5 h-5" />
                            <span className="font-semibold">{option.label}</span>
                            {option.recommended && (
                              <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{option.desc}</span>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Paramètres de réponse */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Paramètres Avancés
                </CardTitle>
                <CardDescription>Optimisez les réponses pour votre boutique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tone">Ton Commercial</Label>
                  <Select value={settings.tone} onValueChange={(value) => setSettings({ ...settings, tone: value })}>
                    <SelectTrigger id="tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professionnel (B2B)</SelectItem>
                      <SelectItem value="persuasive">Persuasif (Ventes)</SelectItem>
                      <SelectItem value="empathetic">Empathique (Service Client)</SelectItem>
                      <SelectItem value="consultative">Consultatif (Conseil)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Langue des Réponses</Label>
                  <Select value={settings.default_language} onValueChange={(value) => setSettings({ ...settings, default_language: value })}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="length">Longueur des Réponses</Label>
                  <Select value={settings.response_length} onValueChange={(value) => setSettings({ ...settings, response_length: value })}>
                    <SelectTrigger id="length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concis (≈80 mots)</SelectItem>
                      <SelectItem value="medium">Équilibré (≈150 mots)</SelectItem>
                      <SelectItem value="detailed">Détaillé (250+ mots)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="history" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Historique des Conversations
                    </Label>
                    <Switch
                      id="history"
                      checked={settings.save_history}
                      onCheckedChange={(checked) => setSettings({ ...settings, save_history: checked })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conserve l'historique pour le suivi commercial et la formation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Instructions personnalisées */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Directives Commerciales Spécifiques</CardTitle>
                <CardDescription>
                  Instructions pour guider votre assistant (promotions, politiques, focus produits...)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ex: Toujours mentionner la livraison gratuite au-dessus de 50€, mettre en avant la collection Printemps, proposer un conseil personnalisé selon le profil client..."
                  value={settings.custom_instructions}
                  onChange={(e) => setSettings({ ...settings, custom_instructions: e.target.value })}
                  rows={5}
                  className="resize-none"
                />
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <ShoppingCart className="w-4 h-4" />
                  Ces instructions orientent toutes les conversations commerciales
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Configuration Shopify
              </CardTitle>
              <CardDescription>Intégrez le widget chat sur votre boutique en ligne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="embed" className="text-base">Activer le Widget Commercial</Label>
                  <p className="text-sm text-muted-foreground">
                    Affichez le chat sur votre site Shopify pour engager les visiteurs
                  </p>
                </div>
                <Switch
                  id="embed"
                  checked={settings.embed_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, embed_enabled: checked })}
                />
              </div>

              {settings.embed_enabled && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Apparence
                      </h3>
                      
                      <div>
                        <Label htmlFor="position">Position sur la page</Label>
                        <Select value={settings.embed_position} onValueChange={(value) => setSettings({ ...settings, embed_position: value })}>
                          <SelectTrigger id="position">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bas droite (Standard)</SelectItem>
                            <SelectItem value="bottom-left">Bas gauche</SelectItem>
                            <SelectItem value="top-right">Haut droite</SelectItem>
                            <SelectItem value="top-left">Haut gauche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="avatar">Avatar du Conseiller</Label>
                        <Select value={settings.embed_avatar} onValueChange={(value) => setSettings({ ...settings, embed_avatar: value })}>
                          <SelectTrigger id="avatar">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {avatarOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="color">Couleur de la marque</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="color"
                            type="color"
                            value={settings.embed_primary_color}
                            onChange={(e) => setSettings({ ...settings, embed_primary_color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={settings.embed_primary_color}
                            onChange={(e) => setSettings({ ...settings, embed_primary_color: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Messages & Fonctionnalités
                      </h3>

                      <div>
                        <Label htmlFor="welcome">Message d'accueil commercial</Label>
                        <Input
                          id="welcome"
                          value={settings.embed_welcome_message}
                          onChange={(e) => setSettings({ ...settings, embed_welcome_message: e.target.value })}
                          placeholder="Bonjour ! Comment puis-je vous aider à trouver le produit parfait ?"
                        />
                      </div>

                      <div>
                        <Label htmlFor="button">Texte du bouton</Label>
                        <Input
                          id="button"
                          value={settings.embed_button_text}
                          onChange={(e) => setSettings({ ...settings, embed_button_text: e.target.value })}
                          placeholder="Conseil Personnalisé"
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sales-focus" className="text-sm">
                            Orientation vente
                          </Label>
                          <Switch
                            id="sales-focus"
                            checked={settings.embed_sales_focus}
                            onCheckedChange={(checked) => setSettings({ ...settings, embed_sales_focus: checked })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="product-rec" className="text-sm">
                            Recommandations produits
                          </Label>
                          <Switch
                            id="product-rec"
                            checked={settings.embed_product_recommendations}
                            onCheckedChange={(checked) => setSettings({ ...settings, embed_product_recommendations: checked })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="order-support" className="text-sm">
                            Support commandes
                          </Label>
                          <Switch
                            id="order-support"
                            checked={settings.embed_order_support}
                            onCheckedChange={(checked) => setSettings({ ...settings, embed_order_support: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base">Code d'intégration Shopify</Label>
                      <Button onClick={handleCopyCode} className="flex items-center gap-2">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copié !' : 'Copier le code'}
                      </Button>
                    </div>
                    
                    <div className="relative bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm text-gray-100 overflow-x-auto">
                        <code>{embedCode}</code>
                      </pre>
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Instructions d'installation Shopify
                      </h4>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Dans votre admin Shopify, allez dans <strong>Boutique en ligne {'>'} Thèmes</strong></li>
                        <li>Cliquez sur <strong>Actions {'>'} Modifier le code</strong></li>
                        <li>Ouvrez le fichier <code>theme.liquid</code></li>
                        <li>Collez le code juste avant la balise fermante <code>&lt;/body&gt;</code></li>
                        <li>Sauvegardez les modifications</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu du Widget Commercial</CardTitle>
              <CardDescription>Visualisez l'apparence du chat sur votre site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg h-96 relative bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Preview website mockup */}
                <div className="absolute inset-4 bg-white rounded border">
                  {/* Mock website content */}
                  <div className="h-8 bg-gray-200 rounded-t flex items-center px-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                  
                  {/* Chat widget preview */}
                  {settings.embed_enabled && (
                    <div 
                      className="absolute w-80 bg-white rounded-lg shadow-lg border"
                      style={previewStyles[settings.embed_position]}
                    >
                      {/* Widget header */}
                      <div 
                        className="flex items-center gap-3 p-4 rounded-t-lg text-white"
                        style={{ backgroundColor: settings.embed_primary_color }}
                      >
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{settings.embed_button_text}</div>
                          <div className="text-xs opacity-90">En ligne</div>
                        </div>
                      </div>
                      
                      {/* Widget content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0"></div>
                          <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                            {settings.embed_welcome_message}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Button 
                            size="sm" 
                            style={{ backgroundColor: settings.embed_primary_color }}
                          >
                            Démarrer la conversation
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!settings.embed_enabled && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Activez le widget pour voir l'aperçu</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 border rounded-lg">
                  <div className="font-semibold">Style</div>
                  <div className="text-muted-foreground capitalize">{settings.assistant_style}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="font-semibold">Position</div>
                  <div className="text-muted-foreground">{settings.embed_position}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6 border-t">
        <Button size="lg" onClick={handleSave} disabled={loading} className="min-w-48">
          <Save className="w-5 h-5 mr-2" />
          {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
        </Button>
      </div>
    </div>
  );
}