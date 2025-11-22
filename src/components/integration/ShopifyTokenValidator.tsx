import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
        toast.success('✅ Token Shopify valide');
      } else {
        toast.error('❌ Token Shopify invalide', {
          description: data.suggestion || 'Veuillez reconnecter votre boutique'
        });
      }
    } catch (error) {
      console.error('Error validating token:', error);
      toast.error('Erreur lors de la validation');
      setResult({
        valid: false,
        message: 'Erreur de validation',
        suggestion: 'Veuillez réessayer'
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
          Test de connexion Shopify
        </CardTitle>
        <CardDescription>
          Vérifiez si votre token d'accès Shopify est toujours valide
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
              Validation en cours...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tester la connexion
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
                  <p className="font-semibold">✅ Connexion réussie</p>
                  {result.shopName && <p>Boutique: {result.shopName}</p>}
                  {result.domain && <p>Domaine: {result.domain}</p>}
                  {result.currency && <p>Devise: {result.currency}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold">❌ Échec de la connexion</p>
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
