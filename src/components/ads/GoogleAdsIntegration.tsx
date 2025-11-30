import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { Megaphone, LogOut, AlertCircle } from 'lucide-react';

export function GoogleAdsIntegration() {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [googleAdsEmail, setGoogleAdsEmail] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    checkGoogleAdsConnection();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state === 'google_ads') {
        // CAS 1: Popup avec window.opener fonctionnel
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_ADS_OAUTH_CODE',
            code: code,
          }, window.location.origin);
          setTimeout(() => window.close(), 1000);
          return;
        }
        
        // CAS 2: FALLBACK - Traiter directement le code OAuth ici
        console.log('🔑 [GOOGLE-ADS] window.opener is null, processing OAuth directly');
        const redirectUri = `${window.location.origin}/google-ads?tab=integration`;
        
        const { data, error } = await supabase.functions.invoke('google-ads-oauth-token', {
          body: { code, redirectUri },
        });
        
        if (error || !data?.success) {
          console.error('❌ [GOOGLE-ADS] Error exchanging code:', error, data);
          toast.error('Échec de connexion Google Ads');
          // Nettoyer l'URL
          window.history.replaceState({}, '', '/google-ads?tab=integration');
          return;
        }
        
        console.log('✅ [GOOGLE-ADS] Successfully connected via fallback');
        // Nettoyer l'URL et rafraîchir l'état
        window.history.replaceState({}, '', '/google-ads?tab=integration');
        toast.success(t.googleAds.integration.success.connected);
        checkGoogleAdsConnection();
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  const checkGoogleAdsConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_ads_oauth_token, google_ads_email, google_ads_customer_id')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_ads_oauth_token);
      setGoogleAdsEmail(profile?.google_ads_email || null);
      setCustomerId(profile?.google_ads_customer_id || '');
    } catch (error) {
      console.error('Error checking Google Ads connection:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      console.log('🔗 [GOOGLE-ADS] Starting OAuth connection');
      const redirectUri = `${window.location.origin}/google-ads?tab=integration`;
      
      const scopes = [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: scopes.join(' '),
          state: 'google_ads'
        },
      });
      
      if (urlError || !urlData?.url) {
        console.error('❌ [GOOGLE-ADS] Failed to generate OAuth URL:', urlError);
        throw new Error('Failed to generate OAuth URL');
      }
      
      console.log('✅ [GOOGLE-ADS] OAuth URL generated');
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Ads Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // ✅ Détection robuste de popup bloquée
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('⚠️ [GOOGLE-ADS] Popup blocked, offering fallback');
        toast.error(
          "Popup bloquée ! Autorisez les popups pour ce site, puis réessayez.",
          { 
            duration: 7000,
            action: {
              label: "Ouvrir dans cet onglet",
              onClick: () => {
                window.location.href = urlData.url;
              }
            }
          }
        );
        return;
      }
      
      console.log('✅ [GOOGLE-ADS] Popup opened, waiting for OAuth callback');
      
      // ✅ Vérifier toutes les 500ms si la popup est fermée
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          console.log('ℹ️ [GOOGLE-ADS] Popup closed by user');
          toast.info("Connexion annulée");
        }
      }, 500);
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_ADS_OAUTH_CODE' && event.data.code) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          console.log('🔑 [GOOGLE-ADS] Received OAuth code, exchanging for token');
          
          const { data, error } = await supabase.functions.invoke('google-ads-oauth-token', {
            body: {
              code: event.data.code,
              redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('❌ [GOOGLE-ADS] Error exchanging code:', error, data);
            
            // Phase 2B: Messages d'erreur détaillés
            const errorMessage = error?.message || data?.error || 'Unknown error';
            
            if (errorMessage.includes('redirect_uri_mismatch')) {
              toast.error(
                "❌ Configuration incorrecte : L'URL de redirection ne correspond pas. Contactez le support.",
                { duration: 10000 }
              );
            } else if (errorMessage.includes('access_denied')) {
              toast.error("Vous avez refusé l'accès à Google Ads.");
            } else if (errorMessage.includes('invalid_client')) {
              toast.error("Identifiants Google invalides. Veuillez contacter le support.");
            } else {
              toast.error(`Échec de connexion Google Ads: ${errorMessage}`);
            }
            
            // Log l'échec
            await supabase.from('integration_failures').insert({
              integration_type: 'google_ads',
              error_type: 'oauth_exchange_failed',
              error_message: errorMessage,
              context: { error, data }
            });
            
            return;
          }
          
          console.log('✅ [GOOGLE-ADS] Successfully connected');
          toast.success(t.googleAds.integration.success.connected);
          checkGoogleAdsConnection();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ [GOOGLE-ADS] Error connecting to Google Ads:', error);
      toast.error(t.googleAds.integration.errors.connect);
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_ads_oauth_token: null,
          google_ads_refresh_token: null,
          google_ads_token_expires_at: null,
          google_ads_email: null,
          google_ads_customer_id: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t.googleAds.integration.success.disconnected);
      setIsConnected(false);
      setGoogleAdsEmail(null);
      setCustomerId('');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error(t.googleAds.integration.errors.disconnect);
    }
  };

  const saveCustomerId = async () => {
    if (!customerId) {
      toast.error(t.errors.generic);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Normalize customer ID - remove hyphens and spaces before saving
      const normalizedId = customerId.replace(/[^0-9]/g, '');
      
      const { error } = await supabase
        .from('profiles')
        .update({ google_ads_customer_id: normalizedId })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t.common.save);
    } catch (error) {
      console.error('Error saving customer ID:', error);
      toast.error(t.errors.generic);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Megaphone className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t.googleAds.integration.title}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t.googleAds.integration.description}
            </p>
          </div>
          
          {/* Important notice for users */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Connexion de votre compte Google</p>
                <p className="text-muted-foreground">
                  Vous allez autoriser l'accès à votre compte Google Ads existant. 
                  Assurez-vous d'être connecté au bon compte Google avant de continuer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <Megaphone className="h-5 w-5" />
              Connecter mon compte Google Ads
            </Button>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ {t.googleAds.campaigns.createNew}</p>
              <p>✓ {t.googleAds.optimization.title}</p>
              <p>✓ {t.googleAds.tracking.title}</p>
              <p>✓ {t.googleAds.analytics.title}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection info card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{t.googleAds.integration.title}</h3>
            {googleAdsEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Megaphone className="h-3.5 w-3.5" />
                <span>{t.googleAds.integration.connected}: <span className="font-medium text-foreground">{googleAdsEmail}</span></span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnectGoogle}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t.common.disconnect}
          </Button>
        </div>
      </Card>

      {/* Customer ID configuration */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.googleAds.integration.selectAccount}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="123-456-7890"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
              <Button onClick={saveCustomerId}>
                {t.common.save}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format : XXX-XXX-XXXX
            </p>
          </div>
        </div>
      </Card>

      {/* Instructions Card */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          {t.googleAds.integration.title}
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads</a>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            {t.googleAds.integration.selectAccount} (XXX-XXX-XXXX)
          </li>
        </ol>
      </Card>
    </div>
  );
}
