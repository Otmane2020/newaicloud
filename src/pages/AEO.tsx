import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, addMonths, format, startOfDay } from "date-fns";
import { fr as frLocale, enUS } from "date-fns/locale";
import { CalendarDays, CheckCircle2, FileText, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Campaign = {
  id: string;
  name: string;
  topic_niche: string | null;
  frequency: string;
  is_active: boolean;
  next_execution_at: string | null;
  auto_post: boolean;
  execution_hour: number | null;
};

type PublishedArticle = {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  shopify_article_id: number | null;
  source: string | null;
};

type PlanEntry = {
  id: string;
  campaignId: string;
  date: Date;
  name: string;
  topic: string | null;
  frequency: string;
  autoPost: boolean;
  hour: number | null;
};

function nextOccurrence(date: Date, frequency: string) {
  switch ((frequency || "").toLowerCase()) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "bi-weekly":
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    default:
      return addDays(date, 7);
  }
}

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const fr = language === "fr";
  const locale = fr ? frLocale : enUS;
  const currentTab = searchParams.get("tab") === "history" ? "history" : "planning";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id || !selectedStore?.id) {
      setCampaigns([]);
      setPublishedArticles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [campaignResult, historyResult] = await Promise.all([
        supabase
          .from("blog_campaigns")
          .select("id,name,topic_niche,frequency,is_active,next_execution_at,auto_post,execution_hour")
          .eq("user_id", user.id)
          .eq("store_id", selectedStore.id)
          .order("next_execution_at", { ascending: true }),
        supabase
          .from("blog_articles")
          .select("id,title,published_at,created_at,shopify_article_id,source")
          .eq("user_id", user.id)
          .eq("store_id", selectedStore.id)
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(100),
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (historyResult.error) throw historyResult.error;

      setCampaigns((campaignResult.data || []) as Campaign[]);
      setPublishedArticles((historyResult.data || []) as PublishedArticle[]);
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Chargement impossible" : "Could not load content plan"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id, selectedStore?.id]);

  const plan = useMemo(() => {
    const today = startOfDay(new Date());
    const end = addDays(today, 29);
    const rows: PlanEntry[] = [];

    campaigns.filter((campaign) => campaign.is_active && campaign.next_execution_at).forEach((campaign) => {
      let cursor = new Date(campaign.next_execution_at as string);
      let guard = 0;

      while (cursor < today && guard < 400) {
        cursor = nextOccurrence(cursor, campaign.frequency);
        guard += 1;
      }

      while (cursor <= end && guard < 450) {
        rows.push({
          id: `${campaign.id}-${cursor.toISOString()}`,
          campaignId: campaign.id,
          date: cursor,
          name: campaign.name,
          topic: campaign.topic_niche,
          frequency: campaign.frequency,
          autoPost: campaign.auto_post,
          hour: campaign.execution_hour,
        });
        cursor = nextOccurrence(cursor, campaign.frequency);
        guard += 1;
      }
    });

    return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [campaigns]);

  const autoPostCount = plan.filter((entry) => entry.autoPost).length;

  const changeTab = (value: string) => {
    const next = new URLSearchParams();
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  if (!selectedStore) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        {fr ? "Sélectionnez une boutique pour afficher le planning." : "Select a store to view the plan."}
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">GEO & AI Search</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {fr ? "Planning des articles" : "Article planning"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr
              ? "30 jours de contenu à venir et l’historique des articles publiés sur Shopify."
              : "Your next 30 days of content and Shopify publication history."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {fr ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={changeTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[460px]">
          <TabsTrigger value="planning" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            {fr ? "Plan 30 jours" : "30-day plan"}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {fr ? "Historique publications" : "Publication history"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{fr ? "Période" : "Period"}</p>
              <p className="mt-1 text-2xl font-bold">30 {fr ? "jours" : "days"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{fr ? "Articles prévus" : "Planned articles"}</p>
              <p className="mt-1 text-2xl font-bold">{plan.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{fr ? "Publication auto Shopify" : "Shopify auto-publish"}</p>
              <p className="mt-1 text-2xl font-bold">{autoPostCount}</p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="grid min-h-56 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : plan.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">{fr ? "Aucun article planifié sur les 30 prochains jours" : "No articles planned for the next 30 days"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fr ? "Le planning reprend vos campagnes blog actives existantes." : "The plan uses your existing active blog campaigns."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fr ? "Date" : "Date"}</TableHead>
                    <TableHead>{fr ? "Article / thème" : "Article / topic"}</TableHead>
                    <TableHead>{fr ? "Cadence" : "Frequency"}</TableHead>
                    <TableHead>{fr ? "Publication" : "Publishing"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {format(entry.date, "EEE dd MMM", { locale })}
                        {entry.hour !== null && <span className="ml-2 text-xs text-muted-foreground">{String(entry.hour).padStart(2, "0")}:00</span>}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{entry.name}</p>
                        {entry.topic && <p className="mt-0.5 text-xs text-muted-foreground">{entry.topic}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{entry.frequency}</Badge></TableCell>
                      <TableCell>
                        {entry.autoPost ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Shopify · Auto</Badge>
                        ) : (
                          <Badge variant="secondary">{fr ? "À valider" : "Review"}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="grid min-h-56 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : publishedArticles.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto h-9 w-9 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">{fr ? "Aucune publication pour le moment" : "No publications yet"}</h2>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fr ? "Publié le" : "Published"}</TableHead>
                    <TableHead>{fr ? "Article" : "Article"}</TableHead>
                    <TableHead>{fr ? "Destination" : "Destination"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishedArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(article.published_at || article.created_at), "dd MMM yyyy · HH:mm", { locale })}
                      </TableCell>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell>
                        {article.shopify_article_id ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Shopify</Badge>
                        ) : (
                          <Badge variant="outline">{article.source || (fr ? "Publié" : "Published")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
