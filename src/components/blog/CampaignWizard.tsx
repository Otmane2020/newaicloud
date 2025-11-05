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
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useTranslation } from '@/lib/language';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
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
      toast.error(t.wizards.campaign.errors.nameRequired);
      return;
    }
    if (step === 2 && !formData.topic_niche) {
      toast.error(t.wizards.campaign.errors.topicRequired);
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.wizards.campaign.errors.notAuthenticated);

      // Vérifier les limites avant de créer la campagne
      if (!canDoAction('articles')) {
        toast.error(t.wizards.campaign.errors.limitReached, {
          description: limits?.isTrialing 
            ? t.wizards.campaign.errors.limitDescription
            : 'Limite mensuelle atteinte. Contactez le support ou attendez le mois prochain.'
        });
        setShowUpgradeDialog(true);
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
          topic_niche: formData.topic_niche,
          keywords: formData.keywords,
          target_audience: formData.target_audience,
          next_execution_at: new Date(formData.start_date).toISOString(),
        });

      if (error) throw error;

      // Incrémenter le compteur de campagnes
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'campaigns_count',
        p_increment: 1
      });

      toast.success(t.wizards.campaign.success);
      await refreshLimits();
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
      toast.error(error.message || t.wizards.campaign.errors.createError);
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
              <h3 className="text-lg font-semibold">{t.wizards.campaign.steps.basic.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.wizards.campaign.steps.basic.subtitle}
              </p>
            </div>

            <div>
              <Label htmlFor="name">{t.wizards.campaign.steps.basic.nameLabel}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.wizards.campaign.steps.basic.namePlaceholder}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">{t.wizards.campaign.steps.basic.descriptionLabel}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.wizards.campaign.steps.basic.descriptionPlaceholder}
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
              <h3 className="text-lg font-semibold">{t.wizards.campaign.steps.topic.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.wizards.campaign.steps.topic.subtitle}
              </p>
            </div>

            <div>
              <Label htmlFor="topic_niche">{t.wizards.campaign.steps.topic.topicLabel}</Label>
              <Input
                id="topic_niche"
                value={formData.topic_niche}
                onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                placeholder={t.wizards.campaign.steps.topic.topicPlaceholder}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t.wizards.campaign.steps.topic.topicHelp}
              </p>
            </div>

            <div>
              <Label htmlFor="keywords">{t.wizards.campaign.steps.topic.keywordsLabel}</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder={t.wizards.campaign.steps.topic.keywordPlaceholder}
                />
                <Button type="button" onClick={addKeyword} variant="secondary">
                  {t.wizards.campaign.steps.topic.addButton}
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
                {t.wizards.campaign.steps.topic.keywordsHelp}
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
              <h3 className="text-lg font-semibold">{t.wizards.campaign.steps.audience.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.wizards.campaign.steps.audience.subtitle}
              </p>
            </div>

            <div>
              <Label htmlFor="target_audience">{t.wizards.campaign.steps.audience.audienceLabel}</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t.wizards.campaign.steps.audience.audiencePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionals">{t.wizards.campaign.steps.audience.professionals}</SelectItem>
                  <SelectItem value="individuals">{t.wizards.campaign.steps.audience.individuals}</SelectItem>
                  <SelectItem value="designers">{t.wizards.campaign.steps.audience.designers}</SelectItem>
                  <SelectItem value="young_couples">{t.wizards.campaign.steps.audience.youngCouples}</SelectItem>
                  <SelectItem value="families">{t.wizards.campaign.steps.audience.families}</SelectItem>
                  <SelectItem value="all">{t.wizards.campaign.steps.audience.all}</SelectItem>
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
              <h3 className="text-lg font-semibold">{t.wizards.campaign.steps.scheduling.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.wizards.campaign.steps.scheduling.subtitle}
              </p>
            </div>

            <div>
              <Label htmlFor="frequency" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t.wizards.campaign.steps.scheduling.frequencyLabel}
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.wizards.campaign.steps.scheduling.daily}</SelectItem>
                  <SelectItem value="weekly">{t.wizards.campaign.steps.scheduling.weekly}</SelectItem>
                  <SelectItem value="biweekly">{t.wizards.campaign.steps.scheduling.biweekly}</SelectItem>
                  <SelectItem value="monthly">{t.wizards.campaign.steps.scheduling.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">{t.wizards.campaign.steps.scheduling.startDateLabel}</Label>
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
                <Label htmlFor="auto_publish">{t.wizards.campaign.steps.scheduling.autoPublishLabel}</Label>
                <p className="text-xs text-muted-foreground">
                  {t.wizards.campaign.steps.scheduling.autoPublishHelp}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <DialogTitle className="text-2xl">{t.wizards.campaign.title}</DialogTitle>
            </div>
            <DialogDescription>
              {t.wizards.campaign.description.replace('{{step}}', step.toString())}
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
            {t.wizards.campaign.actions.back}
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              {t.wizards.campaign.actions.next}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  {t.wizards.campaign.actions.creating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.wizards.campaign.actions.create}
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
      limitType="articles"
      usage={limits?.usage.articles_count}
      limit={limits?.limits.max_articles}
    />
    </>
  );
}
