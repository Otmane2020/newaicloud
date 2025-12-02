import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Facebook, Instagram, Calendar, Sparkles } from "lucide-react";

interface SocialCampaignWizardProps {
  userId?: string;
  storeId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const SocialCampaignWizard = ({ userId, storeId, onClose, onCreated }: SocialCampaignWizardProps) => {
  const [step, setStep] = useState(1);
  
  // Campaign settings
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState<'products' | 'collections' | 'articles'>('products');
  const [frequency, setFrequency] = useState('daily');
  const [executionHour, setExecutionHour] = useState(12);
  const [channels, setChannels] = useState<string[]>(['facebook', 'instagram']);
  const [templateStyle, setTemplateStyle] = useState('overlay');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Content selection
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, [userId, storeId]);

  const loadContent = async () => {
    if (!userId) return;
    
    try {
      const [productsRes, collectionsRes] = await Promise.all([
        supabase
          .from('shopify_products')
          .select('id, title')
          .eq('seller_id', userId)
          .limit(100),
        supabase
          .from('shopify_collections')
          .select('id, title')
          .eq('user_id', userId)
          .limit(50),
      ]);

      setProducts(productsRes.data || []);
      setCollections(collectionsRes.data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCampaign = async () => {
    if (!name) {
      toast.error('Donnez un nom à votre campagne');
      return;
    }

    if (channels.length === 0) {
      toast.error('Sélectionnez au moins un canal');
      return;
    }

    setSaving(true);
    try {
      // Calculate next run time
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(executionHour, 0, 0, 0);
      if (nextRun <= now) {
        if (frequency === 'daily') {
          nextRun.setDate(nextRun.getDate() + 1);
        } else if (frequency === 'weekly') {
          nextRun.setDate(nextRun.getDate() + 7);
        } else if (frequency === 'monthly') {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      }

      const { error } = await supabase
        .from('social_campaigns')
        .insert({
          user_id: userId,
          store_id: storeId || null,
          name,
          content_type: contentType,
          frequency,
          execution_hour: executionHour,
          channels,
          template_style: templateStyle,
          include_logo: includeLogo,
          include_link: includeLink,
          custom_prompt: customPrompt || null,
          product_ids: selectedProducts.length > 0 ? selectedProducts : null,
          collection_ids: selectedCollections.length > 0 ? selectedCollections : null,
          next_run_at: nextRun.toISOString(),
          status: 'active',
        });

      if (error) throw error;
      toast.success('Campagne créée !');
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const totalCreditsPerPost = channels.length * 3;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nouvelle campagne Social Media
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 1 && (
            <>
              {/* Campaign Name */}
              <div className="space-y-2">
                <Label>Nom de la campagne</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Promo été 2024"
                />
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label>Type de contenu à publier</Label>
                <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">🏷️ Produits</SelectItem>
                    <SelectItem value="collections">📁 Collections</SelectItem>
                    <SelectItem value="articles">📝 Articles de blog</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label>Fréquence de publication</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Quotidien</SelectItem>
                    <SelectItem value="weekly">📆 Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">🗓️ Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Execution Hour */}
              <div className="space-y-2">
                <Label>Heure de publication</Label>
                <Select value={executionHour.toString()} onValueChange={(v) => setExecutionHour(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
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
                    Facebook
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
                    Instagram
                  </label>
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                Suivant
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Template Style */}
              <div className="space-y-2">
                <Label>Style des visuels</Label>
                <Select value={templateStyle} onValueChange={setTemplateStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">📷 Photo simple</SelectItem>
                    <SelectItem value="overlay">✨ Template avec overlay texte</SelectItem>
                    <SelectItem value="carousel">🎠 Carrousel multi-images</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Inclure le logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajoute votre logo sur les visuels (overlay)
                    </p>
                  </div>
                  <Switch checked={includeLogo} onCheckedChange={setIncludeLogo} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Inclure le lien</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajoute un lien vers le produit/article
                    </p>
                  </div>
                  <Switch checked={includeLink} onCheckedChange={setIncludeLink} />
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label>Instructions personnalisées (optionnel)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ex: Utilise un ton décontracté, ajoute des emojis..."
                  rows={3}
                />
              </div>

              {/* Content Selection */}
              {contentType === 'products' && products.length > 0 && (
                <div className="space-y-2">
                  <Label>Produits à promouvoir (optionnel)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Laissez vide pour sélectionner aléatoirement
                  </p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts([...selectedProducts, product.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(p => p !== product.id));
                            }
                          }}
                        />
                        <span className="text-sm truncate">{product.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {contentType === 'collections' && collections.length > 0 && (
                <div className="space-y-2">
                  <Label>Collections à promouvoir (optionnel)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {collections.map((collection) => (
                      <label key={collection.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded">
                        <Checkbox
                          checked={selectedCollections.includes(collection.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCollections([...selectedCollections, collection.id]);
                            } else {
                              setSelectedCollections(selectedCollections.filter(c => c !== collection.id));
                            }
                          }}
                        />
                        <span className="text-sm truncate">{collection.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">💰 Coût estimé</h4>
                <p className="text-sm text-muted-foreground">
                  {totalCreditsPerPost} crédits par publication
                  {frequency === 'daily' && ` (~${totalCreditsPerPost * 30} crédits/mois)`}
                  {frequency === 'weekly' && ` (~${totalCreditsPerPost * 4} crédits/mois)`}
                  {frequency === 'monthly' && ` (~${totalCreditsPerPost} crédits/mois)`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={saveCampaign} disabled={saving || !name} className="flex-1">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Créer la campagne
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialCampaignWizard;
