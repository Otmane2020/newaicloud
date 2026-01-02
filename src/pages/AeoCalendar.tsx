import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  CalendarClock, 
  Calendar, 
  Sparkles, 
  FileText, 
  Play, 
  Pause,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface CalendarConfig {
  id: string;
  qa_per_day: number;
  pillar_frequency: string;
  pillar_day_of_week: number;
  publication_hour: number;
  link_qa_to_pillar: boolean;
  is_active: boolean;
  total_qa_published: number;
  total_pillars_published: number;
  next_qa_scheduled_at: string | null;
  next_pillar_scheduled_at: string | null;
}

interface PendingQA {
  id: string;
  question: string;
  platform: string;
  created_at: string;
}

const dayNames = {
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};

const frequencyOptions = [
  { value: 'daily', label: { fr: 'Quotidien', en: 'Daily' } },
  { value: 'weekly', label: { fr: 'Hebdomadaire', en: 'Weekly' } },
  { value: 'bi-weekly', label: { fr: 'Bi-hebdomadaire', en: 'Bi-weekly' } },
  { value: 'monthly', label: { fr: 'Mensuel', en: 'Monthly' } },
];

export default function AeoCalendar() {
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [pendingQAs, setPendingQAs] = useState<PendingQA[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const locale = language === 'fr' ? fr : enUS;
  const days = dayNames[language === 'fr' ? 'fr' : 'en'];

  useEffect(() => {
    if (user?.id) {
      fetchCalendarConfig();
      fetchPendingQAs();
    }
  }, [user?.id, selectedStore?.id]);

  const fetchCalendarConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('aeo_publication_calendar')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig(data as CalendarConfig);
      } else {
        // Create default config
        const defaultConfig = {
          user_id: user!.id,
          store_id: selectedStore?.id || null,
          qa_per_day: 1,
          pillar_frequency: 'weekly',
          pillar_day_of_week: 1,
          publication_hour: 9,
          link_qa_to_pillar: true,
          is_active: false,
        };
        
        const { data: newConfig, error: createError } = await supabase
          .from('aeo_publication_calendar')
          .insert(defaultConfig)
          .select()
          .single();
          
        if (createError) throw createError;
        setConfig(newConfig as CalendarConfig);
      }
    } catch (error) {
      console.error('Error fetching calendar config:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingQAs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_answers')
        .select('id, question, platform, created_at')
        .eq('user_id', user!.id)
        .is('synced_at', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      setPendingQAs(data || []);
    } catch (error) {
      console.error('Error fetching pending QAs:', error);
    }
  };

  const updateConfig = async (updates: Partial<CalendarConfig>) => {
    if (!config?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aeo_publication_calendar')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;
      
      setConfig(prev => prev ? { ...prev, ...updates } : null);
      toast.success(language === 'fr' ? 'Configuration sauvegardée' : 'Configuration saved');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error(language === 'fr' ? 'Erreur de sauvegarde' : 'Save error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCalendar = async () => {
    await updateConfig({ is_active: !config?.is_active });
  };

  // Generate calendar view
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getScheduledItemsForDay = (date: Date) => {
    const items: { type: 'qa' | 'pillar'; count: number }[] = [];
    
    if (config?.is_active) {
      // Q&A are scheduled every day
      items.push({ type: 'qa', count: config.qa_per_day });
      
      // Pillar article based on frequency and day
      const dayOfWeek = date.getDay();
      if (config.pillar_day_of_week === dayOfWeek) {
        if (config.pillar_frequency === 'daily' || 
            config.pillar_frequency === 'weekly' ||
            (config.pillar_frequency === 'bi-weekly' && Math.floor(date.getDate() / 7) % 2 === 0) ||
            (config.pillar_frequency === 'monthly' && date.getDate() <= 7)) {
          items.push({ type: 'pillar', count: 1 });
        }
      }
    }
    
    return items;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <CalendarClock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'fr' ? 'Calendrier AEO' : 'AEO Calendar'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === 'fr' 
                ? 'Planifiez vos publications Q&A et articles piliers automatiquement'
                : 'Schedule your Q&A and pillar articles automatically'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={config?.is_active ? "default" : "secondary"} className="gap-1">
            {config?.is_active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {config?.is_active 
              ? (language === 'fr' ? 'Actif' : 'Active')
              : (language === 'fr' ? 'Inactif' : 'Inactive')}
          </Badge>
          <Button onClick={toggleCalendar} variant={config?.is_active ? "destructive" : "default"} disabled={saving}>
            {config?.is_active 
              ? (language === 'fr' ? 'Désactiver' : 'Disable')
              : (language === 'fr' ? 'Activer' : 'Enable')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {language === 'fr' ? 'Configuration' : 'Configuration'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' 
                ? 'Paramètres de publication automatique'
                : 'Automatic publishing settings'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Q&A per day */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>{language === 'fr' ? 'Q&A par jour' : 'Q&A per day'}</span>
                <Badge variant="outline">{config?.qa_per_day}</Badge>
              </Label>
              <Slider
                value={[config?.qa_per_day || 1]}
                onValueChange={([value]) => updateConfig({ qa_per_day: value })}
                min={1}
                max={5}
                step={1}
                disabled={saving}
              />
            </div>

            {/* Pillar frequency */}
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Fréquence articles piliers' : 'Pillar articles frequency'}</Label>
              <Select 
                value={config?.pillar_frequency} 
                onValueChange={(value) => updateConfig({ pillar_frequency: value })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label[language === 'fr' ? 'fr' : 'en']}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pillar day */}
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Jour de publication pilier' : 'Pillar publication day'}</Label>
              <Select 
                value={String(config?.pillar_day_of_week)} 
                onValueChange={(value) => updateConfig({ pillar_day_of_week: parseInt(value) })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Publication hour */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'fr' ? 'Heure de publication' : 'Publication hour'}
              </Label>
              <Select 
                value={String(config?.publication_hour)} 
                onValueChange={(value) => updateConfig({ publication_hour: parseInt(value) })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link Q&A to pillar */}
            <div className="flex items-center justify-between">
              <Label htmlFor="link-qa" className="text-sm">
                {language === 'fr' ? 'Lier Q&A aux piliers' : 'Link Q&A to pillars'}
              </Label>
              <Switch
                id="link-qa"
                checked={config?.link_qa_to_pillar}
                onCheckedChange={(checked) => updateConfig({ link_qa_to_pillar: checked })}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Calendar Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'fr' ? 'Aperçu du calendrier' : 'Calendar preview'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                  {language === 'fr' ? 'Aujourd\'hui' : 'Today'}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {format(weekStart, 'd MMM', { locale })} - {format(weekEnd, 'd MMM yyyy', { locale })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {days[day.getDay()]}
                </div>
              ))}
              
              {/* Day cells */}
              {weekDays.map((day, idx) => {
                const items = getScheduledItemsForDay(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <div 
                    key={idx} 
                    className={`min-h-[100px] rounded-lg border p-2 ${
                      isCurrentDay ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isCurrentDay ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div 
                          key={i}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                            item.type === 'qa' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {item.type === 'qa' ? (
                            <>
                              <Target className="h-3 w-3" />
                              <span>{item.count} Q&A</span>
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              <span>{language === 'fr' ? 'Pilier' : 'Pillar'}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">Q&A {language === 'fr' ? 'courts' : 'short'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm text-muted-foreground">{language === 'fr' ? 'Article pilier' : 'Pillar article'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats and Queue */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'fr' ? 'Statistiques' : 'Statistics'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-green-600">{config?.total_qa_published || 0}</div>
                <div className="text-sm text-muted-foreground">Q&A {language === 'fr' ? 'publiés' : 'published'}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-blue-600">{config?.total_pillars_published || 0}</div>
                <div className="text-sm text-muted-foreground">{language === 'fr' ? 'Piliers publiés' : 'Pillars published'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{language === 'fr' ? 'File d\'attente Q&A' : 'Q&A Queue'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchPendingQAs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingQAs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'fr' ? 'Aucun Q&A en attente' : 'No pending Q&A'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {pendingQAs.map((qa, idx) => (
                  <div key={qa.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                    <span className="text-sm truncate flex-1">{qa.question}</span>
                    <Badge variant="secondary" className="shrink-0">{qa.platform}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
