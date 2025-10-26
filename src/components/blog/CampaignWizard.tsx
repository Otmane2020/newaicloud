import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Calendar, Target, Users, Clock } from 'lucide-react';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topic_niche: '',
    target_audience: '',
    frequency: 'weekly',
    start_date: new Date().toISOString().split('T')[0],
    auto_publish: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.topic_niche) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('blog_campaigns')
        .insert({
          user_id: user.id,
          ...formData,
          status: 'active',
          articles_generated: 0,
          articles_published: 0,
        });

      if (error) throw error;

      toast.success('Campagne créée avec succès !');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Erreur lors de la création de la campagne');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Créer une Campagne Automatique</DialogTitle>
          </div>
          <DialogDescription>
            Configurez une campagne pour générer automatiquement des articles de blog selon votre calendrier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Nom de la campagne *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Campagne Blog Été 2025"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez les objectifs de cette campagne..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Stratégie de Contenu
            </h4>

            <div>
              <Label htmlFor="topic">Thématique / Niche *</Label>
              <Input
                id="topic"
                value={formData.topic_niche}
                onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                placeholder="Ex: Mode, Électronique, Maison..."
                required
              />
            </div>

            <div>
              <Label htmlFor="audience" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Audience Cible
              </Label>
              <Input
                id="audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Ex: Jeunes professionnels 25-40 ans"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Planification
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Fréquence
                </Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="biweekly">Bi-hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="auto_publish" className="text-base font-medium">
                Publication automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Publier automatiquement sur Shopify
              </p>
            </div>
            <Switch
              id="auto_publish"
              checked={formData.auto_publish}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_publish: checked })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer la Campagne
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
