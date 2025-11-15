import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Loader2,
} from 'lucide-react';

interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

interface GoogleSearchConsoleIntegrationProps {
  onConnectionChange?: () => void;
}

export function GoogleSearchConsoleIntegration({ onConnectionChange }: GoogleSearchConsoleIntegrationProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [googleConsoleEmail, setGoogleConsoleEmail] = useState<string | null>(null);
  const [sites, setSites] = useState<SearchConsoleSite[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state === 'google_search_console' && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_SEARCH_CONSOLE_OAUTH_CODE',
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
        .select('google_oauth_token, google_console_email')
        .eq('id', user.id)
        .single();

      const connected = !!profile?.google_oauth_token;
      setIsConnected(connected);
      setGoogleConsoleEmail(profile?.google_console_email || null);

      if (connected) {
        await fetchSites();
      }
      
      // Notify parent of connection change
      if (onConnectionChange) {
        onConnectionChange();
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const fetchSites = async () => {
    try {
      console.log('[SearchConsole] 🔵 Fetching sites...');
      setIsLoadingSites(true);
      
      const { data, error } = await supabase.functions.invoke('list-search-console-sites');
      
      console.log('[SearchConsole] 🔵 Response:', { data, error });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSites(data.sites || []);
      console.log('[SearchConsole] ✅ Sites fetched successfully:', data.sites?.length || 0);
    } catch (error) {
      console.error('[SearchConsole] ❌ Error fetching sites:', error);
      toast.error('Erreur lors du chargement des sites Search Console');
    } finally {
      setIsLoadingSites(false);
    }
  };

  const connectWithGoogle = async () => {
    try {
      setIsConnecting(true);
      console.log('[SearchConsole] 🔵 Starting OAuth flow...');
      
      const redirectUri = `${window.location.origin}/seo?tab=google-console&subtab=integration`;
      console.log('[SearchConsole] 🔵 Redirect URI:', redirectUri);
      
      const scopes = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters'
      ];
      console.log('[SearchConsole] 🔵 Scopes:', scopes);
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: scopes.join(' '),
          state: 'google_search_console'
        },
      });
      
      if (urlError || !urlData?.url) {
        console.error('[SearchConsole] ❌ Failed to generate OAuth URL:', urlError);
        throw new Error('Failed to generate OAuth URL');
      }
      
      console.log('[SearchConsole] ✅ OAuth URL generated successfully');
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Search Console Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_SEARCH_CONSOLE_OAUTH_CODE') {
          window.removeEventListener('message', messageHandler);
          console.log('[SearchConsole] 🔵 OAuth code received');
          
          try {
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-oauth-token', {
              body: {
                code: event.data.code,
                state: redirectUri
              }
            });

            if (tokenError || tokenData?.error) {
              throw new Error(tokenError?.message || tokenData?.error || 'Failed to exchange token');
            }

            console.log('[SearchConsole] ✅ Token exchange successful');
            toast.success('Connexion à Google Search Console réussie !');
            await checkGoogleConnection();
          } catch (error) {
            console.error('[SearchConsole] ❌ Token exchange error:', error);
            toast.error('Erreur lors de la connexion à Google Search Console');
          } finally {
            setIsConnecting(false);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('[SearchConsole] ❌ Error connecting to Google:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la connexion à Google');
      setIsConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setGoogleConsoleEmail(null);
      setSites([]);
      toast.success('Déconnecté de Google Search Console');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setShowDisconnectDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Google Search Console</CardTitle>
                <CardDescription>
                  Connectez votre compte Google Search Console pour analyser vos performances SEO
                </CardDescription>
              </div>
            </div>
            {isConnected && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connecté
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun compte connecté</h3>
              <p className="text-muted-foreground mb-6">
                Connectez votre compte Google pour accéder aux données Search Console
              </p>
              <Button
                onClick={connectWithGoogle}
                disabled={isConnecting}
                size="lg"
                className="gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Connecter Google Search Console
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Compte connecté</p>
                    {googleConsoleEmail && (
                      <p className="text-sm text-muted-foreground">{googleConsoleEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSites}
                    disabled={isLoadingSites}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingSites ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectDialog(true)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnecter
                  </Button>
                </div>
              </div>

              {isLoadingSites ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement des sites...</p>
                </div>
              ) : sites.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Sites disponibles ({sites.length})</h4>
                  <div className="space-y-2">
                    {sites.map((site, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{site.siteUrl}</p>
                            <p className="text-xs text-muted-foreground">
                              Niveau: {site.permissionLevel}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{site.permissionLevel}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucun site trouvé dans votre compte Search Console
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnecter Google Search Console</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir déconnecter votre compte Google Search Console ? 
              Vous perdrez l'accès aux données de performance SEO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={disconnectGoogle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
