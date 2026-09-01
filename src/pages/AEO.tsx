import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format, startOfDay } from "date-fns";
import { fr as frLocale, enUS } from "date-fns/locale";
import { CalendarDays, CheckCircle2, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
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

type PillarArticle = {
  id: string;
  title: string;
  topic: string;
  keywords: string[] | null;
  scheduled_for: string | null;
  status: string | null;
  article_id: string | null;
  published_at: string | null;
};

type PublicationCalendar = {
  id: string;
  is_active: boolean | null;
  pillar_frequency: string | null;
  publication_hour: number | null;
};

type PublishedArticle = {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  shopify_article_id: number | null;
  source: string | null;
};

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const fr = language === "fr";
  const locale = fr ? frLocale : enUS;
  const currentTab = searchParams.get("tab") === "history" ? "history" : "planning";

  const [plan, setPlan] = useState<PillarArticle[]>([]);
  const [calendar, setCalendar] = useState<PublicationCalendar | null>(null);
  const [publishedArticles, setPublishedArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const loadPlanRows = async (userId: string, storeId: string) => {
    const today = startOfDay(new Date());
    const end = addDays(today, 29);
    end.setHours(23, 59, 59, 999);

    return supabase
      .from("aeo_pillar_articles")
      .select("id,title,topic,keywords,scheduled_for,status,article_id,published_at")
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .gte("scheduled_for", today.toISOString())
      .lte("scheduled_for", end.toISOString())
      .order("scheduled_for", { ascending: true });
  };

  const loadCalendar = async (userId: string, storeId: string) =>
    supabase
      .from("aeo_publication_calendar")
      .select("id,is_active,pillar_frequency,publication_hour")
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const load = async (ensureAutomaticPlan = true) => {
    const userId = user?.id;
    const storeId = selectedStore?.id;
    if (!userId || !storeId) {
      setPlan([]);
      setCalendar(null);
      setPublishedArticles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setGenerationError(null);

      const [planResult, historyResult, calendarResult] = await Promise.all([
        loadPlanRows(userId, storeId),
        supabase
          .from("blog_articles")
          .select("id,title,published_at,created_at,shopify_article_id,source")
          .eq("user_id", userId)
          .eq("store_id", storeId)
          .eq("source", "aeo")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(100),
        loadCalendar(userId, storeId),
      ]);

      if (planResult.error) throw planResult.error;
      if (historyResult.error) throw historyResult.error;
      if (calendarResult.error) throw calendarResult.error;

      setPlan((planResult.data || []) as PillarArticle[]);
      setPublishedArticles((historyResult.data || []) as PublishedArticle[]);
      setCalendar((calendarResult.data || null) as PublicationCalendar | null);

      if (ensureAutomaticPlan) {
        setGeneratingPlan(true);
        const { data, error } = await supabase.functions.invoke("generate-aeo-plan", {
          body: {
            user_id: userId,
            store_id: storeId,
            language,
          },
        });

        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || (fr ? "Plan GEO automatique impossible" : "Automatic GEO plan failed"));

        const [refreshedPlanResult, refreshedCalendarResult] = await Promise.all([
          loadPlanRows(userId, storeId),
          loadCalendar(userId, storeId),
        ]);
        if (refreshedPlanResult.error) throw refreshedPlanResult.error;
        if (refreshedCalendarResult.error) throw refreshedCalendarResult.error;

        setPlan((refreshedPlanResult.data || []) as PillarArticle[]);
        setCalendar((refreshedCalendarResult.data || null) as PublicationCalendar | null);
      }
    } catch (error: any) {
      const message = error?.message || (fr ? "Chargement du planning GEO impossible" : "Could not load GEO content plan");
      setGenerationError(message);
      toast.error(message);
    } finally {
      setGeneratingPlan(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedStore?.id]);

  const autoPostCount = calendar?.is_active ? plan.length : 0;
  const frequencyLabel = calendar?.pillar_frequency === "adaptive_ai"
    ? (fr ? "Cadence IA" : "AI cadence")
    : (calendar?.pillar_frequency || (fr ? "Cadence IA" : "AI cadence"));

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
              ? "Plan GEO 30 jours généré automatiquement depuis vos produits, collections et signaux locaux."
              : "30-day GEO plan generated automatically from your products, collections and local signals."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading || generatingPlan}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || generatingPlan ? "animate-spin" : ""}`} />
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
            {(loading || generatingPlan) && plan.length === 0 ? (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
                    <Sparkles className="h-6 w-6 animate-pulse text-violet-600" />
                  </div>
                  <h2 className="mt-4 font-semibold">
                    {fr ? "Création automatique de votre plan GEO" : "Building your automatic GEO plan"}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    {fr
                      ? "Analyse du catalogue local, des collections, des produits et des opportunités AI Search pour répartir les prochains sujets sur 30 jours."
                      : "Scanning the local catalog, collections, products and AI Search opportunities to distribute the next topics across 30 days."}
                  </p>
                  <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : plan.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">
                  {fr ? "Le plan GEO automatique n’a pas encore pu être créé" : "The automatic GEO plan could not be created yet"}
                </h2>
                <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                  {generationError
                    ? generationError
                    : fr
                      ? "Le moteur se remplit automatiquement dès que le catalogue local de la boutique est disponible."
                      : "The engine fills itself automatically as soon as the store's local catalog is available."}
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
                        {entry.scheduled_for ? format(new Date(entry.scheduled_for), "EEE dd MMM", { locale }) : "—"}
                        {entry.scheduled_for && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {format(new Date(entry.scheduled_for), "HH:mm")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{entry.topic}</p>
                        {entry.keywords && entry.keywords.length > 0 && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground/80">
                            {entry.keywords.slice(0, 5).join(" · ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{frequencyLabel}</Badge></TableCell>
                      <TableCell>
                        {calendar?.is_active ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Shopify · Auto</Badge>
                        ) : (
                          <Badge variant="secondary">{entry.status || (fr ? "Planifié" : "Planned")}</Badge>
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
                <h2 className="mt-3 font-semibold">{fr ? "Aucune publication GEO pour le moment" : "No GEO publications yet"}</h2>
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
                          <Badge variant="outline">{article.source || "GEO"}</Badge>
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
