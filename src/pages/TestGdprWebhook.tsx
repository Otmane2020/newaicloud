import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  success: boolean;
  status_code: number;
  hmac_sent: string;
  payload_sent: any;
  webhook_response: any;
  interpretation: string;
  timestamp: string;
}

export default function TestGdprWebhook() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-gdpr-webhook', {
        body: { testMode: true }
      });

      if (error) throw error;
      setResult(data);
    } catch (error) {
      console.error('Test error:', error);
      setResult({
        success: false,
        status_code: 500,
        hmac_sent: '',
        payload_sent: {},
        webhook_response: { error: error instanceof Error ? error.message : 'Unknown error' },
        interpretation: '⚠️ Erreur lors du test',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    
    if (result.status_code === 200) {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    } else if (result.status_code === 401) {
      return <XCircle className="h-8 w-8 text-red-500" />;
    } else {
      return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return '';
    
    if (result.status_code === 200) {
      return 'border-green-500 bg-green-50';
    } else if (result.status_code === 401) {
      return 'border-red-500 bg-red-50';
    } else {
      return 'border-yellow-500 bg-yellow-50';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test GDPR Webhook HMAC</h1>
        <p className="text-muted-foreground">
          Testez la validation HMAC de vos webhooks GDPR obligatoires pour Shopify
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhooks GDPR Obligatoires</CardTitle>
          <CardDescription>
            Shopify requiert l'implémentation de 3 webhooks GDPR avec validation HMAC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">customers/data_request</span>
            <span className="text-sm text-muted-foreground">- Demande de données client</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">customers/redact</span>
            <span className="text-sm text-muted-foreground">- Suppression des données client</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">shop/redact</span>
            <span className="text-sm text-muted-foreground">- Suppression des données boutique</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center mb-8">
        <Button
          onClick={runTest}
          disabled={loading}
          size="lg"
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Test en cours...
            </>
          ) : (
            'Lancer le test HMAC'
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-6">
          <Card className={`border-2 ${getStatusColor()}`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div>
                  <CardTitle>Résultat du Test</CardTitle>
                  <CardDescription>Status: {result.status_code}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className={result.status_code === 200 ? 'bg-green-50 border-green-200' : result.status_code === 401 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}>
                <AlertDescription className="text-lg font-medium">
                  {result.interpretation}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails Techniques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">HMAC Envoyé</h3>
                <code className="block p-3 bg-muted rounded text-sm break-all">
                  {result.hmac_sent}
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Payload de Test</h3>
                <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                  {JSON.stringify(result.payload_sent, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Réponse du Webhook</h3>
                <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                  {JSON.stringify(result.webhook_response, null, 2)}
                </pre>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Timestamp: {new Date(result.timestamp).toLocaleString('fr-FR')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
