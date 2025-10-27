import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Smile, Briefcase, GraduationCap, Zap, Copy, Check } from 'lucide-react';

export default function ChatSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    assistant_style: 'friendly',
    tone: 'informal',
    default_language: 'fr',
    response_length: 'medium',
    custom_instructions: '',
    save_history: true,
    embed_enabled: false,
    embed_position: 'bottom-right',
    embed_welcome_message: 'Bonjour ! Comment puis-je vous aider ?',
    embed_primary_color: '#3b82f6',
    embed_button_text: 'Besoin d\'aide ?',
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
        setSettings(data);
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

  const embedCode = `<script src="https://votre-app.com/chat-widget.js"></script>
<script>
  NewAIChatWidget.init({
    position: '${settings.embed_position}',
    welcomeMessage: '${settings.embed_welcome_message}',
    primaryColor: '${settings.embed_primary_color}',
    buttonText: '${settings.embed_button_text}'
  });
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const styleOptions = [
    { value: 'friendly', label: 'Amical', icon: Smile, desc: 'Convivial, chaleureux, émojis' },
    { value: 'professional', label: 'Professionnel', icon: Briefcase, desc: 'Formel, précis, sans émojis' },
    { value: 'expert', label: 'Expert', icon: GraduationCap, desc: 'Technique, détaillé, jargon' },
    { value: 'casual', label: 'Décontracté', icon: Zap, desc: 'Casual, familier, moderne' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Paramètres du Chat</h1>
        <p className="text-muted-foreground">Configurez le style et le comportement de votre assistant IA</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Style de l'assistant */}
        <Card>
          <CardHeader>
            <CardTitle>Style de l'assistant</CardTitle>
            <CardDescription>Choisissez la personnalité de votre assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.assistant_style}
              onValueChange={(value) => setSettings({ ...settings, assistant_style: value })}
              className="grid grid-cols-2 gap-4"
            >
              {styleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent ${
                      settings.assistant_style === option.value ? 'border-primary bg-accent' : 'border-muted'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    <Icon className="w-8 h-8 mb-2" />
                    <span className="font-semibold mb-1">{option.label}</span>
                    <span className="text-xs text-center text-muted-foreground">{option.desc}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Paramètres de réponse */}
        <Card>
          <CardHeader>
            <CardTitle>Paramètres de réponse</CardTitle>
            <CardDescription>Personnalisez le ton et la longueur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tone">Ton</Label>
              <Select value={settings.tone} onValueChange={(value) => setSettings({ ...settings, tone: value })}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formel</SelectItem>
                  <SelectItem value="informal">Informel</SelectItem>
                  <SelectItem value="humorous">Humoristique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Langue par défaut</Label>
              <Select value={settings.default_language} onValueChange={(value) => setSettings({ ...settings, default_language: value })}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="length">Longueur des réponses</Label>
              <Select value={settings.response_length} onValueChange={(value) => setSettings({ ...settings, response_length: value })}>
                <SelectTrigger id="length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Court (≈50 mots)</SelectItem>
                  <SelectItem value="medium">Moyen (≈150 mots)</SelectItem>
                  <SelectItem value="detailed">Détaillé (300+ mots)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="history">Sauvegarder l'historique</Label>
              <Switch
                id="history"
                checked={settings.save_history}
                onCheckedChange={(checked) => setSettings({ ...settings, save_history: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Instructions personnalisées */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Instructions personnalisées</CardTitle>
            <CardDescription>Ajoutez des directives spécifiques pour votre assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Toujours mentionner les délais de livraison, privilégier les produits en stock..."
              value={settings.custom_instructions}
              onChange={(e) => setSettings({ ...settings, custom_instructions: e.target.value })}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Configuration Embed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Widget Embed</CardTitle>
            <CardDescription>Intégrez le chat sur votre site Shopify</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="embed">Activer le widget</Label>
              <Switch
                id="embed"
                checked={settings.embed_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, embed_enabled: checked })}
              />
            </div>

            {settings.embed_enabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select value={settings.embed_position} onValueChange={(value) => setSettings({ ...settings, embed_position: value })}>
                      <SelectTrigger id="position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bas droite</SelectItem>
                        <SelectItem value="bottom-left">Bas gauche</SelectItem>
                        <SelectItem value="top-right">Haut droite</SelectItem>
                        <SelectItem value="top-left">Haut gauche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="color">Couleur principale</Label>
                    <Input
                      id="color"
                      type="color"
                      value={settings.embed_primary_color}
                      onChange={(e) => setSettings({ ...settings, embed_primary_color: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcome">Message d'accueil</Label>
                    <Input
                      id="welcome"
                      value={settings.embed_welcome_message}
                      onChange={(e) => setSettings({ ...settings, embed_welcome_message: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="button">Texte du bouton</Label>
                    <Input
                      id="button"
                      value={settings.embed_button_text}
                      onChange={(e) => setSettings({ ...settings, embed_button_text: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Code d'intégration</Label>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={handleCopyCode}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Copiez ce code dans le fichier <code>theme.liquid</code> de votre thème Shopify, juste avant la balise <code>&lt;/body&gt;</code>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={loading}>
          <Save className="w-5 h-5 mr-2" />
          Sauvegarder les paramètres
        </Button>
      </div>
    </div>
  );
}
