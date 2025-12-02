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
import { Loader2, Facebook, Instagram, Calendar, Sparkles, Video, Image, Music } from "lucide-react";

interface SocialCampaignWizardProps {
  userId?: string;
  storeId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const FREE_MUSIC_TRACKS = [
  { id: 'upbeat_corporate', name: '🎵 Upbeat Corporate', duration: '30s' },
  { id: 'chill_lofi', name: '🎶 Chill Lo-Fi', duration: '30s' },
  { id: 'energetic_pop', name: '🎸 Energetic Pop', duration: '30s' },
  { id: 'soft_piano', name: '🎹 Soft Piano', duration: '30s' },
  { id: 'modern_tech', name: '🔊 Modern Tech', duration: '30s' },
  { id: 'happy_acoustic', name: '🎻 Happy Acoustic', duration: '30s' },
];

const SocialCampaignWizard = ({ userId, storeId, onClose, onCreated }: SocialCampaignWizardProps) => {
  const [step, setStep] = useState(1);
  
  // Campaign settings
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState<'products' | 'collections' | 'articles'>('products');
  const [frequency, setFrequency] = useState('daily');
  const [postsPerRun, setPostsPerRun] = useState(1);
  const [executionHour, setExecutionHour] = useState(12);
  const [channels, setChannels] = useState<string[]>(['facebook', 'instagram']);
  const [postFormat, setPostFormat] = useState<'image' | 'carousel' | 'video' | 'reel'>('image');
  const [templateStyle, setTemplateStyle] = useState('overlay');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Video/Reel options
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [musicTrack, setMusicTrack] = useState('');
  
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
          .select('id, title, product_images(src)')
          .eq('seller_id', userId)
          .limit(100),
        supabase
          .from('shopify_collections')
          .select('id, title, image_src')
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
          posts_per_run: postsPerRun,
          execution_hour: executionHour,
          channels,
          post_format: postFormat,
          template_style: templateStyle,
          include_logo: includeLogo,
          include_link: includeLink,
          custom_prompt: customPrompt || null,
          voice_enabled: voiceEnabled,
          music_track: musicTrack || null,
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

  const isVideoFormat = postFormat === 'video' || postFormat === 'reel';
  const creditsPerPost = channels.length * (isVideoFormat ? 5 : 3);
  const totalCreditsPerRun = creditsPerPost * postsPerRun;

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
                    <SelectItem value="products">🏷️ Produits (titre, description, photos, variations)</SelectItem>
                    <SelectItem value="collections">📁 Collections</SelectItem>
                    <SelectItem value="articles">📝 Articles de blog</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency & Posts per run */}
              <div className="grid grid-cols-2 gap-4">
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
                
                <div className="space-y-2">
                  <Label>Posts par exécution</Label>
                  <Select value={postsPerRun.toString()} onValueChange={(v) => setPostsPerRun(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} post{n > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Execution Hour */}
              <div className="space-y-2">
                <Label>Heure de publication (UTC)</Label>
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
              {/* Post Format */}
              <div className="space-y-2">
                <Label>Format des publications</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPostFormat('image')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      postFormat === 'image' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    }`}
                  >
                    <Image className="h-5 w-5 mb-2" />
                    <div className="font-medium">📷 Image</div>
                    <div className="text-xs text-muted-foreground">Photo simple avec texte</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPostFormat('carousel')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      postFormat === 'carousel' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    }`}
                  >
                    <Image className="h-5 w-5 mb-2" />
                    <div className="font-medium">🎠 Carrousel</div>
                    <div className="text-xs text-muted-foreground">Multi-images (toutes les photos)</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPostFormat('video')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      postFormat === 'video' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    }`}
                  >
                    <Video className="h-5 w-5 mb-2" />
                    <div className="font-medium">🎬 Vidéo</div>
                    <div className="text-xs text-muted-foreground">Slideshow animé + musique</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPostFormat('reel')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      postFormat === 'reel' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    }`}
                  >
                    <Video className="h-5 w-5 mb-2" />
                    <div className="font-medium">📱 Reel</div>
                    <div className="text-xs text-muted-foreground">Format vertical 9:16</div>
                  </button>
                </div>
              </div>

              {/* Video/Reel Options */}
              {isVideoFormat && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Options vidéo
                  </h4>
                  
                  {/* Music Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Musique de fond (gratuite)
                    </Label>
                    <Select value={musicTrack} onValueChange={setMusicTrack}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une musique..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune musique</SelectItem>
                        {FREE_MUSIC_TRACKS.map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.name} ({track.duration})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Voice Option (ElevenLabs - coming soon) */}
                  <div className="flex items-center justify-between opacity-60">
                    <div>
                      <Label>Voix IA (ElevenLabs)</Label>
                      <p className="text-xs text-muted-foreground">
                        Bientôt disponible - Narration automatique
                      </p>
                    </div>
                    <Switch 
                      checked={voiceEnabled} 
                      onCheckedChange={setVoiceEnabled} 
                      disabled 
                    />
                  </div>
                </div>
              )}

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
                    <SelectItem value="product_spotlight">🎯 Product Spotlight</SelectItem>
                    <SelectItem value="promo">🔥 Promo / Black Friday</SelectItem>
                    <SelectItem value="testimonial">💬 Testimonial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Inclure le logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajoute votre logo sur les visuels
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

              <Button onClick={() => setStep(3)} className="w-full">
                Suivant - Sélection contenu
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              {/* Content Selection */}
              {contentType === 'products' && products.length > 0 && (
                <div className="space-y-2">
                  <Label>Produits à promouvoir (optionnel)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Laissez vide pour rotation automatique de tous vos produits
                  </p>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted rounded">
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
                        {product.product_images?.[0]?.src && (
                          <img 
                            src={product.product_images[0].src} 
                            alt="" 
                            className="h-10 w-10 object-cover rounded"
                          />
                        )}
                        <span className="text-sm truncate flex-1">{product.title}</span>
                      </label>
                    ))}
                  </div>
                  {selectedProducts.length > 0 && (
                    <p className="text-sm text-primary">
                      {selectedProducts.length} produit(s) sélectionné(s)
                    </p>
                  )}
                </div>
              )}

              {contentType === 'collections' && collections.length > 0 && (
                <div className="space-y-2">
                  <Label>Collections à promouvoir (optionnel)</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {collections.map((collection) => (
                      <label key={collection.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted rounded">
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
                        {collection.image_src && (
                          <img 
                            src={collection.image_src} 
                            alt="" 
                            className="h-10 w-10 object-cover rounded"
                          />
                        )}
                        <span className="text-sm truncate flex-1">{collection.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {contentType === 'articles' && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Les articles publiés seront automatiquement partagés
                  </p>
                </div>
              )}

              {/* Cost Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">💰 Coût estimé</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Par post:</span> {creditsPerPost} crédits
                    {isVideoFormat && ' (vidéo)'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Par exécution:</span> {totalCreditsPerRun} crédits 
                    ({postsPerRun} post{postsPerRun > 1 ? 's' : ''})
                  </p>
                  <p className="font-medium text-primary">
                    {frequency === 'daily' && `~${totalCreditsPerRun * 30} crédits/mois`}
                    {frequency === 'weekly' && `~${totalCreditsPerRun * 4} crédits/mois`}
                    {frequency === 'monthly' && `~${totalCreditsPerRun} crédits/mois`}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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
