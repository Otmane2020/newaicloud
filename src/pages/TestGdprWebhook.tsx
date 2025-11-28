import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

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
  const { t } = useTranslation();
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [internalResult, setInternalResult] = useState<TestResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<TestResult | null>(null);

  const runInternalTest = async () => {
    setLoadingInternal(true);
    setInternalResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-gdpr-webhook', {
        body: { testMode: true }
      });

      if (error) throw error;
      setInternalResult(data);
    } catch (error) {
      console.error('Test error:', error);
      setInternalResult({
        success: false,
        status_code: 500,
        hmac_sent: '',
        payload_sent: {},
        webhook_response: { error: error instanceof Error ? error.message : 'Unknown error' },
        interpretation: `⚠️ ${t.adminGdprWebhookTest.results.testError}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoadingInternal(false);
    }
  };

  const runVerificationTest = async () => {
    setLoadingVerification(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-gdpr-webhook', {
        body: { testMode: true, simulateShopifyVerification: true }
      });

      if (error) throw error;
      setVerificationResult(data);
    } catch (error) {
      console.error('Test error:', error);
      setVerificationResult({
        success: false,
        status_code: 500,
        hmac_sent: '',
        payload_sent: {},
        webhook_response: { error: error instanceof Error ? error.message : 'Unknown error' },
        interpretation: `⚠️ ${t.adminGdprWebhookTest.results.testError}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoadingVerification(false);
    }
  };

  const getStatusIcon = (result: TestResult | null) => {
    if (!result) return null;
    
    if (result.status_code === 200) {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    } else if (result.status_code === 401) {
      return <XCircle className="h-8 w-8 text-red-500" />;
    } else {
      return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusColor = (result: TestResult | null) => {
    if (!result) return '';
    
    if (result.status_code === 200) {
      return 'border-green-500 bg-green-50 dark:bg-green-950/20';
    } else if (result.status_code === 401) {
      return 'border-red-500 bg-red-50 dark:bg-red-950/20';
    } else {
      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    }
  };

  const renderTestResult = (result: TestResult | null, title: string) => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        <Card className={`border-2 ${getStatusColor(result)}`}>
          <CardHeader>
            <div className="flex items-center gap-4">
              {getStatusIcon(result)}
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t.adminGdprWebhookTest.results.status}: {result.status_code}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className={result.status_code === 200 ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : result.status_code === 401 ? 'bg-red-50 border-red-200 dark:bg-red-950/20' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20'}>
              <AlertDescription className="text-lg font-medium">
                {result.interpretation}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.adminGdprWebhookTest.results.technicalDetails}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.hmac_sent && (
              <div>
                <h3 className="font-semibold mb-2">{t.adminGdprWebhookTest.results.hmacSent}</h3>
                <code className="block p-3 bg-muted rounded text-sm break-all">
                  {result.hmac_sent}
                </code>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">{t.adminGdprWebhookTest.results.testPayload}</h3>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                {JSON.stringify(result.payload_sent, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{t.adminGdprWebhookTest.results.webhookResponse}</h3>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                {JSON.stringify(result.webhook_response, null, 2)}
              </pre>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>{t.adminGdprWebhookTest.results.timestamp}: {new Date(result.timestamp).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t.adminGdprWebhookTest.title}</h1>
        <p className="text-muted-foreground">
          {t.adminGdprWebhookTest.description}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.adminGdprWebhookTest.mandatoryWebhooks}</CardTitle>
          <CardDescription>
            {t.adminGdprWebhookTest.shopifyRequires}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">customers/data_request</span>
            <span className="text-sm text-muted-foreground">- {t.adminGdprWebhookTest.webhookTopics.customersDataRequest}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">customers/redact</span>
            <span className="text-sm text-muted-foreground">- {t.adminGdprWebhookTest.webhookTopics.customersRedact}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium">shop/redact</span>
            <span className="text-sm text-muted-foreground">- {t.adminGdprWebhookTest.webhookTopics.shopRedact}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.adminGdprWebhookTest.test1.title}</CardTitle>
            <CardDescription>
              {t.adminGdprWebhookTest.test1.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runInternalTest}
              disabled={loadingInternal}
              size="lg"
              className="w-full"
            >
              {loadingInternal ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.adminGdprWebhookTest.test1.running}
                </>
              ) : (
                t.adminGdprWebhookTest.test1.button
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.adminGdprWebhookTest.test2.title}</CardTitle>
            <CardDescription>
              {t.adminGdprWebhookTest.test2.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runVerificationTest}
              disabled={loadingVerification}
              size="lg"
              className="w-full"
              variant="outline"
            >
              {loadingVerification ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.adminGdprWebhookTest.test2.running}
                </>
              ) : (
                t.adminGdprWebhookTest.test2.button
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {internalResult && (
        <div className="mb-8">
          {renderTestResult(internalResult, t.adminGdprWebhookTest.results.hmacTitle)}
        </div>
      )}

      {verificationResult && (
        <div>
          {renderTestResult(verificationResult, t.adminGdprWebhookTest.results.verificationTitle)}
        </div>
      )}
    </div>
  );
}
