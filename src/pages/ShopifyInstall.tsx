import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";

const ShopifyInstall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleInstall = async () => {
      // Get parameters from Shopify install request
      const hmac = searchParams.get('hmac');
      const host = searchParams.get('host');
      const shop = searchParams.get('shop');
      const timestamp = searchParams.get('timestamp');

      console.log('[ShopifyInstall] Install request received', {
        hasHmac: !!hmac,
        hasHost: !!host,
        hasShop: !!shop,
        hasTimestamp: !!timestamp,
      });

      if (!shop || !hmac || !timestamp) {
        setStatus('error');
        setErrorMessage('Paramètres d\'installation manquants. Veuillez réessayer depuis Shopify.');
        return;
      }

      try {
        console.log('[ShopifyInstall] Calling edge function with params:', {
          hmac: hmac?.substring(0, 10) + '...',
          host,
          shop,
          timestamp
        });

        // Call edge function to validate and initiate OAuth
        const { data, error } = await supabase.functions.invoke('shopify-install', {
          body: {
            hmac,
            host,
            shop,
            timestamp,
            allParams: Object.fromEntries(searchParams.entries()),
          },
        });

        console.log('[ShopifyInstall] Response:', { data, error });

        if (error) {
          console.error('[ShopifyInstall] Error:', error);
          setStatus('error');
          setErrorMessage(error.message || 'Erreur lors de l\'installation');
          return;
        }

        if (data?.authUrl) {
          console.log('[ShopifyInstall] Redirecting to OAuth:', data.authUrl);
          // Redirect to Shopify OAuth page
          window.location.href = data.authUrl;
        } else {
          console.error('[ShopifyInstall] No authUrl in response:', data);
          setStatus('error');
          setErrorMessage('URL d\'autorisation manquante');
        }
      } catch (err) {
        console.error('[ShopifyInstall] Exception:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    };

    handleInstall();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Installation Shopify</CardTitle>
              <CardDescription className="text-center">
                {status === 'loading' && 'Préparation de l\'installation...'}
                {status === 'error' && 'Erreur d\'installation'}
                {status === 'success' && 'Redirection en cours...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status === 'loading' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground text-center">
                    Vérification des paramètres d'installation...
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="py-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm text-destructive font-medium mb-2">
                      Erreur
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {errorMessage}
                    </p>
                  </div>
                  <div className="mt-4 text-center">
                    <a 
                      href="/integration" 
                      className="text-sm text-primary hover:underline"
                    >
                      Retour à l'intégration
                    </a>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-success mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Redirection vers Shopify pour autorisation...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstall;
