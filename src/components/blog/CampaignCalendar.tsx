import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDays, FileText, Sparkles, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  status: string;
  shopify_article_id: number | null;
}

interface Campaign {
  id: string;
  name: string;
  next_execution_at: string;
  frequency: string;
  topic_niche: string;
}

export function CampaignCalendar() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [articles, setArticles] = useState<Article[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showArticlesDialog, setShowArticlesDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && date) {
      loadCalendarData();
    }
  }, [user, date]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(date || new Date());
      const monthEnd = endOfMonth(date || new Date());

      // Load articles for the current month
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, published_at, created_at, status, shopify_article_id')
        .eq('user_id', user?.id)
        .or(`published_at.gte.${monthStart.toISOString()},created_at.gte.${monthStart.toISOString()}`)
        .or(`published_at.lte.${monthEnd.toISOString()},created_at.lte.${monthEnd.toISOString()}`);

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);

      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('blog_campaigns')
        .select('id, name, next_execution_at, frequency, topic_niche')
        .eq('user_id', user?.id)
        .gte('next_execution_at', monthStart.toISOString())
        .lte('next_execution_at', monthEnd.toISOString());

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement du calendrier' : 'Error loading calendar');
    } finally {
      setLoading(false);
    }
  };

  const getArticlesForDate = (checkDate: Date) => {
    return articles.filter(article => {
      const articleDate = article.published_at ? new Date(article.published_at) : new Date(article.created_at);
      return isSameDay(articleDate, checkDate);
    });
  };

  const getCampaignsForDate = (checkDate: Date) => {
    return campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.next_execution_at);
      return isSameDay(campaignDate, checkDate);
    });
  };

  const hasEventsOnDate = (checkDate: Date) => {
    return getArticlesForDate(checkDate).length > 0 || getCampaignsForDate(checkDate).length > 0;
  };

  const handleDateClick = (selectedDate: Date) => {
    setSelectedDate(selectedDate);
    setShowArticlesDialog(true);
  };

  const modifiers = {
    hasEvents: (day: Date) => hasEventsOnDate(day),
  };

  const modifiersStyles = {
    hasEvents: {
      position: 'relative' as const,
      fontWeight: 'bold' as const,
    },
  };

  const selectedDateArticles = selectedDate ? getArticlesForDate(selectedDate) : [];
  const selectedDateCampaigns = selectedDate ? getCampaignsForDate(selectedDate) : [];

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {language === 'fr' ? 'Calendrier des Publications' : 'Publication Calendar'}
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              onDayClick={handleDateClick}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border pointer-events-auto"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
              }}
            />

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Articles publiés' : 'Published articles'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Campagnes planifiées' : 'Scheduled campaigns'}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:w-80 space-y-4">
            <div>
              <h3 className="font-semibold mb-3">
                {language === 'fr' ? 'Événements à venir' : 'Upcoming Events'}
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map(campaign => (
                    <Card key={campaign.id} className="p-3 border-l-4 border-l-purple-500">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(campaign.next_execution_at), 'PPP')}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {campaign.frequency}
                          </Badge>
                        </div>
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}

                  {articles.filter(a => a.status === 'published').slice(0, 3).map(article => (
                    <Card key={article.id} className="p-3 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{article.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(article.published_at || article.created_at), 'PPP')}
                          </p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {article.status}
                          </Badge>
                        </div>
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      </div>
                    </Card>
                  ))}

                  {campaigns.length === 0 && articles.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {language === 'fr' 
                        ? 'Aucun événement à venir ce mois-ci' 
                        : 'No upcoming events this month'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showArticlesDialog} onOpenChange={setShowArticlesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'PPP')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDateCampaigns.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {language === 'fr' ? 'Campagnes planifiées' : 'Scheduled Campaigns'}
                </h3>
                <div className="space-y-2">
                  {selectedDateCampaigns.map(campaign => (
                    <Card key={campaign.id} className="p-4 border-l-4 border-l-purple-500">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{campaign.topic_niche}</p>
                      <Badge variant="secondary" className="mt-2">
                        {campaign.frequency}
                      </Badge>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedDateArticles.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {language === 'fr' ? 'Articles' : 'Articles'}
                </h3>
                <div className="space-y-2">
                  {selectedDateArticles.map(article => (
                    <Card key={article.id} className="p-4 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{article.title}</p>
                          <Badge variant="outline" className="mt-2">
                            {article.status}
                          </Badge>
                        </div>
                        {article.shopify_article_id && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/blog/article/${article.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedDateArticles.length === 0 && selectedDateCampaigns.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {language === 'fr' 
                  ? 'Aucun événement pour cette date' 
                  : 'No events for this date'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
