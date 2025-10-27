import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Calendar, Target, Users, Clock, ArrowRight, ArrowLeft, X } from 'lucide-react';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [keywordInput, setKeywordInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topic_niche: '',
    keywords: [] as string[],
    target_audience: '',
    frequency: 'weekly',
    start_date: new Date().toISOString().split('T')[0],
    auto_publish: false,
  });

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
      toast.error('Veuillez saisir un nom de campagne');
      return;
    }
    if (step === 2 && !formData.topic_niche) {
      toast.error('Veuillez définir le sujet principal');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Vérifier les limites avant de créer la campagne
      const { data: limitsData, error: limitsError } = await supabase.functions.invoke('check-usage-limits');
      
      if (limitsError) throw limitsError;

      if (!limitsData.canAddCampaign) {
        toast.error('Limite de campagnes atteinte', {
          description: 'Passez à un plan supérieur pour créer plus de campagnes'
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('blog_campaigns')
        .insert({
          user_id: user.id,
          name: formData.name,
          frequency: formData.frequency,
          auto_post: formData.auto_publish,
        });

      if (error) throw error;

      // Incrémenter le compteur de campagnes
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'campaigns_count',
        p_increment: 1
      });

      toast.success('Campagne créée avec succès !');
      onSuccess();
      onOpenChange(false);
      setStep(1);
      setFormData({
        name: '',
        description: '',
        topic_niche: '',
        keywords: [],
        target_audience: '',
        frequency: 'weekly',
        start_date: new Date().toISOString().split('T')[0],
        auto_publish: false,
      });
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Erreur lors de la création de la campagne');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Informations de base</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Commençons par nommer votre campagne
              </p>
            </div>

            <div>
              <Label htmlFor="name">Nom de la campagne *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Campagne Blog Meubles Printemps 2025"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez l'objectif de cette campagne..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Sujet et Mots-clés</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Définissez le thème et les mots-clés SEO
              </p>
            </div>

            <div>
              <Label htmlFor="topic_niche">Sujet principal *</Label>
              <Input
                id="topic_niche"
                value={formData.topic_niche}
                onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                placeholder="Ex: Mobilier scandinave, Décoration moderne..."
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Le thème général des articles à générer
              </p>
            </div>

            <div>
              <Label htmlFor="keywords">Mots-clés SEO</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder="Ajouter un mot-clé..."
                />
                <Button type="button" onClick={addKeyword} variant="secondary">
                  Ajouter
                </Button>
              </div>
              
              {formData.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="gap-1">
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
                Appuyez sur Entrée ou cliquez sur Ajouter
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Audience Cible</h3>
              <p className="text-sm text-muted-foreground mt-1">
                À qui s'adressent vos articles ?
              </p>
            </div>

            <div>
              <Label htmlFor="target_audience">Audience cible</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionnez votre audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionals">Professionnels</SelectItem>
                  <SelectItem value="individuals">Particuliers</SelectItem>
                  <SelectItem value="designers">Designers & Architectes</SelectItem>
                  <SelectItem value="young_couples">Jeunes couples</SelectItem>
                  <SelectItem value="families">Familles</SelectItem>
                  <SelectItem value="all">Tous publics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Planification</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez le rythme de publication
              </p>
            </div>

            <div>
              <Label htmlFor="frequency" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Fréquence de génération
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Date de démarrage</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="auto_publish">Publication automatique</Label>
                <p className="text-xs text-muted-foreground">
                  Publier les articles dès leur génération
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <DialogTitle className="text-2xl">Nouvelle Campagne</DialogTitle>
          </div>
          <DialogDescription>
            Étape {step} sur 4
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {renderStep()}

        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la campagne
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
