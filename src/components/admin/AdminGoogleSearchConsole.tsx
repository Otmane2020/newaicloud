import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, Search, Loader2, RefreshCw, CheckCircle, XCircle, Link, TrendingUp, MousePointer, Eye, Plus, Settings2 } from "lucide-react";
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
  const [connecting, setConnecting] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [autoIndexing, setAutoIndexing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadData();
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has Google domains configured (indicates connection)
      const { data: domains, error } = await supabase
        .from("google_search_console_domains")
        .select("id")
        .limit(1);

      setIsConnected(!error && domains && domains.length > 0);
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

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

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      // Use popup OAuth approach instead of signInWithOAuth
      const response = await supabase.functions.invoke("google-gsc-oauth", {
        body: { action: "connect", isAdmin: true },
      });

      if (response.error) throw response.error;
      
      if (response.data?.authUrl) {
        // Open popup for OAuth
        const popup = window.open(
          response.data.authUrl,
          "google_gsc_oauth",
          "width=600,height=700,scrollbars=yes"
        );

        // Poll for popup close and reload data
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setConnecting(false);
            loadData();
            checkGoogleConnection();
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error connecting Google:", error);
      toast.error(error.message || "Erreur de connexion Google");
      setConnecting(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Domaine requis");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("google_search_console_domains")
        .insert({
          user_id: user.id,
          domain: newDomain.trim(),
          verified: false,
        });

      if (error) throw error;

      toast.success("Domaine ajouté! Vérifiez-le dans Google Search Console.");
      setNewDomain("");
      loadData();
    } catch (error: any) {
      console.error("Error adding domain:", error);
      toast.error(error.message || "Erreur lors de l'ajout du domaine");
    }
  };

  const requestIndexing = async () => {
    if (!newUrl.trim()) {
      toast.error("URL requise");
      return;
    }

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
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={connectGoogle} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings2 className="h-4 w-4 mr-2" />
              )}
              Connecter Google
            </Button>
          ) : (
            <Badge variant="default" className="flex items-center gap-1 px-3 py-1">
              <CheckCircle className="h-4 w-4" />
              Google Connecté
            </Badge>
          )}
          <Button variant="outline" onClick={syncGscData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser
          </Button>
        </div>
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

      {/* Add Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un Domaine
          </CardTitle>
          <CardDescription>
            Ajoutez un domaine pour le suivi et l'indexation automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="newai.sale ou https://newai.sale"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={!newDomain.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={autoIndexing}
              onCheckedChange={setAutoIndexing}
            />
            <Label className="cursor-pointer">
              Indexation automatique des nouvelles pages
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domaines Configurés</CardTitle>
          <CardDescription>
            Domaines suivis pour l'indexation Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun domaine configuré. Ajoutez votre domaine ci-dessus.
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
                      <><XCircle className="h-3 w-3 mr-1" /> En attente</>
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
