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
      toast.error(t.campaignWizard.toasts.enterCampaignName);
      return;
    }
    if (step === 2 && !formData.topic_niche) {
      toast.error(t.campaignWizard.toasts.defineMainTopic);
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.campaignWizard.toasts.notAuthenticated);

      // Vérifier les limites de campagnes avant de créer
      if (!canDoAction('campaigns')) {
        toast.error(t.campaignWizard.toasts.campaignLimitReached, {
          description: limits?.isTrialing 
            ? t.campaignWizard.toasts.upgradeForCampaigns
            : t.campaignWizard.toasts.monthlyLimitReached
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

      toast.success(t.campaignWizard.toasts.campaignCreated);
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
      toast.error(error.message || t.campaignWizard.toasts.creationError);
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
              <h3 className="text-lg font-semibold">{t.campaignWizard.steps.basicInfo.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.basicInfo.description}
              </p>
            </div>

            <div>
              <Label htmlFor="name">{t.campaignWizard.labels.campaignName} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.campaignWizard.placeholders.campaignName}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">{t.campaignWizard.labels.description}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.campaignWizard.placeholders.description}
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
              <h3 className="text-lg font-semibold">{t.campaignWizard.steps.topicKeywords.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.topicKeywords.description}
              </p>
            </div>

            <div>
              <Label htmlFor="topic_niche">{t.campaignWizard.labels.mainTopic} *</Label>
              <Input
                id="topic_niche"
                value={formData.topic_niche}
                onChange={(e) => setFormData({ ...formData, topic_niche: e.target.value })}
                placeholder={t.campaignWizard.placeholders.mainTopic}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t.campaignWizard.hints.mainTopic}
              </p>
            </div>

            <div>
              <Label htmlFor="keywords">{t.campaignWizard.labels.keywords}</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder={t.campaignWizard.placeholders.keyword}
                />
                <Button type="button" onClick={addKeyword} variant="secondary">
                  {t.campaignWizard.buttons.add}
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
                {t.campaignWizard.hints.keywords}
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
              <h3 className="text-lg font-semibold">{t.campaignWizard.steps.targetAudience.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.targetAudience.description}
              </p>
            </div>

            <div>
              <Label htmlFor="target_audience">{t.campaignWizard.labels.targetAudience}</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t.campaignWizard.audiences.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionals">{t.campaignWizard.audiences.professionals}</SelectItem>
                  <SelectItem value="individuals">{t.campaignWizard.audiences.individuals}</SelectItem>
                  <SelectItem value="designers">{t.campaignWizard.audiences.designers}</SelectItem>
                  <SelectItem value="young_couples">{t.campaignWizard.audiences.youngCouples}</SelectItem>
                  <SelectItem value="families">{t.campaignWizard.audiences.families}</SelectItem>
                  <SelectItem value="all">{t.campaignWizard.audiences.all}</SelectItem>
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
              <h3 className="text-lg font-semibold">{t.campaignWizard.steps.scheduling.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t.campaignWizard.steps.scheduling.description}
              </p>
            </div>

            <div>
              <Label htmlFor="frequency" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t.campaignWizard.labels.frequency}
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.campaignWizard.frequencies.daily}</SelectItem>
                  <SelectItem value="weekly">{t.campaignWizard.frequencies.weekly}</SelectItem>
                  <SelectItem value="biweekly">{t.campaignWizard.frequencies.biweekly}</SelectItem>
                  <SelectItem value="monthly">{t.campaignWizard.frequencies.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">{t.campaignWizard.labels.startDate}</Label>
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
                <Label htmlFor="auto_publish">{t.campaignWizard.labels.autoPublish}</Label>
                <p className="text-xs text-muted-foreground">
                  {t.campaignWizard.labels.autoPublishDesc}
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
              <DialogTitle className="text-2xl">{t.dialogs.campaignWizard.newCampaign}</DialogTitle>
            </div>
            <DialogDescription>
              {t.dialogs.campaignWizard.stepOf.replace('{{step}}', String(step)).replace('{{total}}', '4')}
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
            {t.dialogs.campaignWizard.back}
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              {t.dialogs.campaignWizard.next}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  {t.dialogs.campaignWizard.creating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.dialogs.campaignWizard.create}
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
      limitType="campaigns"
      usage={limits?.usage.campaigns_count}
      limit={limits?.limits.max_campaigns}
    />
    </>
  );
}
