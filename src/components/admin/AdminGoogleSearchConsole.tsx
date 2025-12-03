import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Search, Loader2, RefreshCw, CheckCircle, XCircle, Link, TrendingUp, MousePointer, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GscDomain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
}

interface GscData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface IndexingRequest {
  id: string;
  url: string;
  status: string;
  requested_at: string;
}

export function AdminGoogleSearchConsole() {
  const [domains, setDomains] = useState<GscDomain[]>([]);
  const [gscData, setGscData] = useState<GscData[]>([]);
  const [indexingRequests, setIndexingRequests] = useState<IndexingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load domains
      const { data: domainsData } = await supabase
        .from("google_search_console_domains")
        .select("*")
        .order("created_at", { ascending: false });

      // Load recent GSC data
      const { data: gscDataResult } = await supabase
        .from("google_search_console_data")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);

      // Load indexing requests
      const { data: indexingData } = await supabase
        .from("gsc_indexing_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(50);

      setDomains(domainsData || []);
      setGscData(gscDataResult || []);
      setIndexingRequests(indexingData || []);
    } catch (error) {
      console.error("Error loading GSC data:", error);
      toast.error("Erreur lors du chargement des données GSC");
    } finally {
      setLoading(false);
    }
  };

  const requestIndexing = async () => {
    if (!newUrl.trim()) {
      toast.error("URL requise");
      return;
    }

    // Validate URL
    try {
      new URL(newUrl);
    } catch {
      toast.error("URL invalide");
      return;
    }

    setIndexing(true);
    try {
      const response = await supabase.functions.invoke("gsc-request-indexing", {
        body: { url: newUrl },
      });

      if (response.error) throw response.error;

      toast.success("Demande d'indexation envoyée!");
      setNewUrl("");
      loadData();
    } catch (error: any) {
      console.error("Error requesting indexing:", error);
      toast.error(error.message || "Erreur lors de la demande d'indexation");
    } finally {
      setIndexing(false);
    }
  };

  const syncGscData = async () => {
    try {
      toast.info("Synchronisation GSC en cours...");
      
      const response = await supabase.functions.invoke("sync-gsc-data");
      
      if (response.error) throw response.error;
      
      toast.success("Données GSC synchronisées!");
      loadData();
    } catch (error: any) {
      console.error("Error syncing GSC:", error);
      toast.error(error.message || "Erreur lors de la synchronisation");
    }
  };

  // Calculate totals
  const totals = gscData.reduce(
    (acc, d) => ({
      clicks: acc.clicks + (d.clicks || 0),
      impressions: acc.impressions + (d.impressions || 0),
    }),
    { clicks: 0, impressions: 0 }
  );
  const avgPosition = gscData.length > 0
    ? (gscData.reduce((sum, d) => sum + (d.position || 0), 0) / gscData.length).toFixed(1)
    : "0";
  const avgCtr = totals.impressions > 0
    ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-green-600" />
            Google Search Console
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez l'indexation et surveillez les performances SEO
          </p>
        </div>
        <Button variant="outline" onClick={syncGscData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Synchroniser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-blue-500" />
              Clics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">30 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">30 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCtr}%</div>
            <p className="text-xs text-muted-foreground">Taux de clic moyen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-orange-500" />
              Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPosition}</div>
            <p className="text-xs text-muted-foreground">Position moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domaines Vérifiés</CardTitle>
          <CardDescription>
            Domaines connectés à Google Search Console
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun domaine vérifié. Connectez votre domaine via les paramètres Google.
            </p>
          ) : (
            <div className="space-y-2">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{domain.domain}</span>
                  </div>
                  <Badge variant={domain.verified ? "default" : "secondary"}>
                    {domain.verified ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Vérifié</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Non vérifié</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Indexing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            Demander l'Indexation
          </CardTitle>
          <CardDescription>
            Soumettez une URL pour indexation prioritaire sur Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="https://newai.sale/mon-article"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <Button onClick={requestIndexing} disabled={indexing || !newUrl.trim()}>
              {indexing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Indexer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indexing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique d'Indexation</CardTitle>
          <CardDescription>
            {indexingRequests.length} demande(s) d'indexation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {indexingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune demande d'indexation
            </p>
          ) : (
            <div className="space-y-2">
              {indexingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex-1 truncate mr-4">
                    <a 
                      href={req.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline text-primary"
                    >
                      {req.url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={req.status === "indexed" ? "default" : req.status === "pending" ? "secondary" : "destructive"}>
                      {req.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(req.requested_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminGoogleSearchConsole;
