import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Trash2,
  RefreshCw,
  Activity,
  Database,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UsageHistory {
  id: string;
  field_name: string;
  old_value: number;
  new_value: number;
  delta: number;
  operation: string;
  trigger_source: string;
  created_at: string;
}

interface Anomaly {
  field_name: string;
  anomaly_type: string;
  description: string;
  current_value: number;
  expected_value: number;
  severity: string;
}

interface CleanupResult {
  cleanup_type: string;
  items_cleaned: number;
  details: any;
}

export default function UsageAudit() {
  const [history, setHistory] = useState<UsageHistory[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [cleanupResults, setCleanupResults] = useState<CleanupResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('all');

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load usage history
      const { data: historyData, error: historyError } = await supabase
        .from('usage_tracking_history')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;
      setHistory(historyData || []);

      // Detect anomalies
      const { data: anomalyData, error: anomalyError } = await supabase
        .rpc('detect_usage_anomalies', { p_user_id: user.id, p_threshold: 10 });

      if (anomalyError) throw anomalyError;
      setAnomalies(anomalyData || []);

    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Erreur lors du chargement des données d\'audit');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-data');

      if (error) throw error;

      setCleanupResults(data.details || []);
      toast.success(data.message || 'Nettoyage effectué avec succès');
      
      // Reload audit data to see updated counts
      await loadAuditData();
    } catch (error) {
      console.error('Error cleaning orphaned data:', error);
      toast.error('Erreur lors du nettoyage des données orphelines');
    } finally {
      setCleaning(false);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      products_count: 'Produits',
      shopify_stores_count: 'Boutiques',
      optimizations_count: 'Optimisations',
      articles_count: 'Articles',
      chat_responses_count: 'Réponses Chat'
    };
    return labels[field] || field;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive' as const;
      case 'medium': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  const filteredHistory = selectedField === 'all' 
    ? history 
    : history.filter(h => h.field_name === selectedField);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Audit des Quotas</h1>
          <p className="text-muted-foreground">
            Surveillez les variations de vos compteurs et détectez les anomalies
          </p>
        </div>
        <Button onClick={loadAuditData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Anomalies Section */}
      {anomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Anomalies détectées</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{getFieldLabel(anomaly.field_name)}</div>
                    <div className="text-sm text-muted-foreground">{anomaly.description}</div>
                  </div>
                  <Badge variant={getSeverityColor(anomaly.severity)}>
                    {anomaly.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Nettoyage des données orphelines
          </CardTitle>
          <CardDescription>
            Supprimez automatiquement les produits, images et variantes sans parent valide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCleanup} 
            disabled={cleaning}
            variant="outline"
            className="w-full"
          >
            {cleaning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Lancer le nettoyage
              </>
            )}
          </Button>

          {cleanupResults.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="font-medium text-sm">Résultats du dernier nettoyage :</div>
              {cleanupResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{result.details.description}</span>
                  <Badge variant={result.items_cleaned > 0 ? "default" : "secondary"}>
                    {result.items_cleaned} supprimés
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historique des variations
          </CardTitle>
          <CardDescription>
            Suivez toutes les modifications de vos compteurs d'usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setSelectedField}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="products_count">Produits</TabsTrigger>
              <TabsTrigger value="shopify_stores_count">Boutiques</TabsTrigger>
              <TabsTrigger value="optimizations_count">Optimisations</TabsTrigger>
              <TabsTrigger value="articles_count">Articles</TabsTrigger>
              <TabsTrigger value="chat_responses_count">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedField} className="mt-4 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {entry.operation === 'increment' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium text-sm">
                          {getFieldLabel(entry.field_name)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'PPpp', { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-mono">
                          {entry.old_value} → {entry.new_value}
                        </div>
                        <Badge 
                          variant={entry.delta > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {entry.delta > 0 ? '+' : ''}{entry.delta}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground w-32 text-right">
                        {entry.trigger_source}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}