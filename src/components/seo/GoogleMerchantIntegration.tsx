import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import {
  ShoppingCart,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Upload,
} from 'lucide-react';

interface GoogleMerchantAccount {
  id: string;
  type: 'merchant' | 'aggregator';
}

export function GoogleMerchantIntegration() {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [googleMerchantEmail, setGoogleMerchantEmail] = useState<string | null>(null);
  const [merchantAccounts, setMerchantAccounts] = useState<GoogleMerchantAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isCreatingFeed, setIsCreatingFeed] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state === 'google_merchant' && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_MERCHANT_OAUTH_CODE',
          code: code,
        }, window.location.origin);
        
        setTimeout(() => window.close(), 1000);
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_merchant_oauth_token, google_merchant_email, google_merchant_account_id')
        .eq('id', user.id)
        .single();

      const connected = !!profile?.google_merchant_oauth_token;
      setIsConnected(connected);
      setGoogleMerchantEmail(profile?.google_merchant_email || null);
      
      if (connected) {
        // Auto-fetch merchant accounts
        await fetchMerchantAccounts();
        
        // Set selected account if saved
        if (profile?.google_merchant_account_id) {
          setSelectedAccount(profile.google_merchant_account_id);
        }
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const fetchMerchantAccounts = async () => {
    try {
      console.log('[GoogleMerchant] 🔵 Fetching merchant accounts...');
      setIsLoadingAccounts(true);
      
      const { data, error } = await supabase.functions.invoke('list-merchant-accounts');
      
      console.log('[GoogleMerchant] 🔵 Response:', { data, error });

      // Handle API not enabled error (403 from edge function)
      if (data?.error === 'API_NOT_ENABLED') {
        toast.error(
          <div className="space-y-2">
            <p className="font-semibold">Google Content API not enabled</p>
            <p className="text-sm text-muted-foreground">{data.message}</p>
            {data.activationUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(data.activationUrl, '_blank')}
                className="mt-2"
              >
                Enable API in Google Cloud Console
              </Button>
            )}
          </div>,
          { duration: 15000 }
        );
        return;
      }

      // Handle network/auth errors
      if (error) {
        console.error('[GoogleMerchant] ❌ Error fetching accounts:', error);
        toast.error(t.googleMerchant.integration.errors.loadAccounts + ': ' + (error.message || 'Unknown error'));
        return;
      }

      // Handle other API errors
      if (!data?.success) {
        console.error('[GoogleMerchant] ❌ API returned error:', data?.error);
        toast.error(data?.error || t.googleMerchant.integration.errors.loadAccounts);
        return;
      }

      if (data?.success && data.accounts) {
        setMerchantAccounts(data.accounts);
        
        // Auto-select first account if none selected
        if (data.accounts.length > 0 && !selectedAccount) {
          const firstAccount = data.accounts[0];
          setSelectedAccount(firstAccount.id);
          
          // Save to profile
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ google_merchant_account_id: firstAccount.id })
              .eq('id', user.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching merchant accounts:', error);
      toast.error(t.googleMerchant.integration.errors.loadAccounts);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const connectWithGoogle = async () => {
    try {
      console.log('[GoogleMerchant] 🔵 Starting OAuth flow');
      const redirectUri = `${window.location.origin}/merchant?tab=integration`;
      console.log('[GoogleMerchant] 🔵 Redirect URI:', redirectUri);
      
      // Using the same Google OAuth endpoint but with different scopes
      const scopes = [
        'https://www.googleapis.com/auth/content',
        'https://www.googleapis.com/auth/siteverification'
      ];
      console.log('[GoogleMerchant] 🔵 Scopes:', scopes);
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: scopes.join(' '),
          state: 'google_merchant'
        },
      });
      
      if (urlError || !urlData?.url) {
        console.error('[GoogleMerchant] ❌ Failed to generate OAuth URL:', urlError);
        throw new Error('Failed to generate OAuth URL');
      }
      
      console.log('[GoogleMerchant] ✅ OAuth URL generated successfully');
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Merchant Center Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // ✅ Détection robuste de popup bloquée
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('⚠️ [GOOGLE-MERCHANT] Popup blocked, offering fallback');
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
      
      console.log('✅ [GOOGLE-MERCHANT] Popup opened, waiting for OAuth callback');
      
      // ✅ Vérifier toutes les 500ms si la popup est fermée
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          console.log('ℹ️ [GOOGLE-MERCHANT] Popup closed by user');
          toast.info("Connexion annulée");
        }
      }, 500);
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_MERCHANT_OAUTH_CODE' && event.data.code) {
          clearInterval(checkClosed);
          console.log('[GoogleMerchant] 🔵 Received OAuth code');
          window.removeEventListener('message', handleMessage);
          
          toast.loading(t.googleMerchant.sync.syncing);
          
          console.log('[GoogleMerchant] 🔵 Exchanging code for token...');
          const { data, error } = await supabase.functions.invoke('google-merchant-oauth-token', {
            body: {
              code: event.data.code,
              redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('[GoogleMerchant] ❌ Error exchanging code:', error, data);
            
            // Phase 2B: Messages d'erreur détaillés
            const errorMessage = error?.message || data?.error || 'Unknown error';
            
            if (errorMessage.includes('redirect_uri_mismatch')) {
              toast.error(
                "❌ Configuration incorrecte : L'URL de redirection ne correspond pas. Contactez le support.",
                { duration: 10000 }
              );
            } else if (errorMessage.includes('access_denied')) {
              toast.error("Vous avez refusé l'accès à Google Merchant Center.");
            } else if (errorMessage.includes('invalid_client')) {
              toast.error("Identifiants Google invalides. Veuillez contacter le support.");
            } else if (errorMessage.includes('Content API')) {
              toast.error(
                "❌ L'API Google Content n'est pas activée. Activez-la dans Google Cloud Console.",
                { duration: 10000 }
              );
            } else {
              toast.error(`Échec de connexion Google Merchant: ${errorMessage}`);
            }
            
            // Log l'échec
            await supabase.from('integration_failures').insert({
              integration_type: 'google_merchant',
              error_type: 'oauth_exchange_failed',
              error_message: errorMessage,
              context: { error, data }
            });
            
            return;
          }
          
          console.log('[GoogleMerchant] ✅ Token exchange successful');
          toast.success(t.googleMerchant.integration.success.connected);
          
          // Refresh connection and fetch accounts
          console.log('[GoogleMerchant] 🔵 Fetching merchant accounts...');
          await checkGoogleConnection();
          
          // Auto-create feed after accounts are loaded
          setTimeout(async () => {
            if (merchantAccounts.length > 0 && selectedAccount) {
              await autoCreateAndSyncFeed();
            }
          }, 2000);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error(t.googleMerchant.integration.errors.connect);
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_merchant_oauth_token: null,
          google_merchant_refresh_token: null,
          google_merchant_token_expires_at: null,
          google_merchant_email: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t.googleMerchant.integration.success.disconnected);
      setIsConnected(false);
      setGoogleMerchantEmail(null);
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error(t.googleMerchant.integration.errors.disconnect);
    }
  };

  const autoCreateAndSyncFeed = async () => {
    if (!selectedAccount) {
      toast.error(t.googleMerchant.integration.errors.createFeed);
      return;
    }

    setIsCreatingFeed(true);
    const toastId = toast.loading(t.googleMerchant.sync.syncing);
    
    try {
      // Step 1: Create feed in Google Merchant Center
      const { data: feedData, error: feedError } = await supabase.functions.invoke('create-google-merchant-feed', {
        body: {
          merchantAccountId: selectedAccount,
        }
      });

      if (feedError) throw feedError;

      if (!feedData?.success) {
        throw new Error(feedData?.error || t.googleMerchant.integration.errors.createFeed);
      }

      toast.loading(t.googleMerchant.sync.syncing, { id: toastId });

      // Step 2: Trigger sync to push products to Google Merchant
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-shopify-to-feed', {
        body: {
          merchantAccountId: selectedAccount,
        }
      });

      if (syncError) {
        console.error('Sync error:', syncError);
        toast.warning(t.errors.generic, { id: toastId });
        return;
      }

      if (syncData?.success) {
        toast.success(t.googleMerchant.integration.success.feedCreated + ` (${syncData.syncedCount || 0})`, { id: toastId });
      } else {
        toast.success(t.googleMerchant.integration.success.feedCreated, { id: toastId });
      }
    } catch (error: any) {
      console.error('Error in auto create and sync:', error);
      toast.error(error.message || t.googleMerchant.integration.errors.createFeed, { id: toastId });
    } finally {
      setIsCreatingFeed(false);
    }
  };

  const createFeedInMerchant = async () => {
    if (!selectedAccount) {
      toast.error(t.googleMerchant.integration.selectAccount);
      return;
    }

    await autoCreateAndSyncFeed();
  };

  if (!isConnected) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t.googleMerchant.integration.title}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t.googleMerchant.integration.description}
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              {t.googleMerchant.integration.connect}
            </Button>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ {t.googleMerchant.integration.autoCreate}</p>
              <p>✓ {t.googleMerchant.sync.subtitle}</p>
              <p>✓ {t.googleMerchant.integration.accounts}</p>
              <p>✓ {t.googleMerchant.monitoring.subtitle}</p>
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
            <h3 className="text-lg font-semibold">{t.googleMerchant.integration.title}</h3>
            {googleMerchantEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{t.googleMerchant.integration.connected}: <span className="font-medium text-foreground">{googleMerchantEmail}</span></span>
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

      {/* Account selection and feed creation */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t.googleMerchant.integration.accounts}</Label>
              {isLoadingAccounts && (
                <span className="text-xs text-muted-foreground">{t.common.loading}</span>
              )}
            </div>
            
            {merchantAccounts.length > 0 ? (
              <div className="space-y-2">
                {merchantAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAccount === account.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAccount(account.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.id}</p>
                        <p className="text-xs text-muted-foreground">
                          Type: {account.type === 'merchant' ? 'Merchant' : 'Aggregator'}
                        </p>
                      </div>
                      {selectedAccount === account.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed rounded-lg text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {isLoadingAccounts ? t.common.loading : 'Aucun compte trouvé'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Créez un compte Google Merchant Center pour continuer
                  </p>
                </div>
                {!isLoadingAccounts && (
                  <div className="pt-2 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchMerchantAccounts}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Réessayer
                    </Button>
                    <div>
                      <a 
                        href="https://merchants.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Créer un compte Merchant Center →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={createFeedInMerchant}
            disabled={!selectedAccount || isCreatingFeed}
            className="w-full gap-2"
          >
            {isCreatingFeed ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t.googleMerchant.sync.syncing}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t.googleMerchant.integration.createFeed}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Instructions Card */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Comment trouver votre ID de compte Merchant Center
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            Accédez à votre <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Merchant Center</a>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            L'ID de compte apparaît dans l'URL ou dans les paramètres du compte
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            C'est un nombre à 10 chiffres (ex: 1234567890)
          </li>
        </ol>
      </Card>
    </div>
  );
}
