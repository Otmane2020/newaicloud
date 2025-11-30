import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface TokenValidationResult {
  valid: boolean;
  shopName?: string;
  domain?: string;
  email?: string;
  currency?: string;
  status?: number;
  message?: string;
  suggestion?: string;
}

export const ShopifyTokenValidator = ({ storeId }: { storeId: string }) => {
  const { t } = useTranslation();
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<TokenValidationResult | null>(null);

  const validateToken = async () => {
    setValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-shopify-token', {
        body: { storeId }
      });

      if (error) throw error;

      setResult(data);

      if (data.valid) {
        toast.success(t.toasts.shopify.tokenValid);
      } else {
        toast.error(t.toasts.shopify.tokenInvalid, {
          description: data.suggestion || t.toasts.shopify.tokenReconnect
        });
      }
    } catch (error) {
      console.error('Error validating token:', error);
      toast.error(t.toasts.shopify.tokenValidationError);
      setResult({
        valid: false,
        message: t.toasts.shopify.validationError,
        suggestion: t.toasts.shopify.pleaseRetry
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          {t.integration?.tokenValidator?.title || 'Shopify Connection Test'}
        </CardTitle>
        <CardDescription>
          {t.integration?.tokenValidator?.description || 'Verify if your Shopify access token is still valid'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={validateToken} 
          disabled={validating}
          className="w-full"
        >
          {validating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.integration?.tokenValidator?.validating || 'Validating...'}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t.integration?.tokenValidator?.testConnection || 'Test Connection'}
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.valid ? 'default' : 'destructive'}>
            {result.valid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.valid ? (
                <div className="space-y-2">
                  <p className="font-semibold">{t.toasts.shopify.connectionSuccess}</p>
                  {result.shopName && <p>{t.toasts.shopify.store}: {result.shopName}</p>}
                  {result.domain && <p>{t.toasts.shopify.domain}: {result.domain}</p>}
                  {result.currency && <p>{t.toasts.shopify.currency}: {result.currency}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold">{t.toasts.shopify.connectionFailedTitle}</p>
                  {result.message && <p className="text-sm">{result.message}</p>}
                  {result.suggestion && (
                    <div className="mt-2 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{result.suggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
