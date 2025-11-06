import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Megaphone, LogOut, AlertCircle } from 'lucide-react';

export function GoogleAdsIntegration() {
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
      
      if (code && state === 'google_ads' && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_ADS_OAUTH_CODE',
          code: code,
        }, window.location.origin);
        
        setTimeout(() => window.close(), 1000);
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
      const redirectUri = `${window.location.origin}/google-ads?tab=integration`;
      
      const scopes = [
        'https://www.googleapis.com/auth/adwords'
      ];
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: scopes.join(' '),
          state: 'google_ads'
        },
      });
      
      if (urlError || !urlData?.url) {
        throw new Error('Failed to generate OAuth URL');
      }
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Ads Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        toast.error('Veuillez autoriser les popups pour ce site');
        return;
      }
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_ADS_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          
          const { data, error } = await supabase.functions.invoke('google-ads-oauth-token', {
            body: {
              code: event.data.code,
              redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('Error exchanging code:', error);
            toast.error('Erreur lors de la connexion à Google Ads');
            return;
          }
          
          toast.success('Connexion à Google Ads réussie !');
          checkGoogleAdsConnection();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erreur lors de la connexion à Google');
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

      toast.success('Google Ads déconnecté avec succès');
      setIsConnected(false);
      setGoogleAdsEmail(null);
      setCustomerId('');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Impossible de déconnecter Google Ads');
    }
  };

  const saveCustomerId = async () => {
    if (!customerId) {
      toast.error('Veuillez entrer un ID client Google Ads');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ google_ads_customer_id: customerId })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('ID client enregistré avec succès');
    } catch (error) {
      console.error('Error saving customer ID:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'ID client');
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
            <h2 className="text-2xl font-bold">Connecter Google Ads</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connectez votre compte Google Ads pour gérer vos campagnes publicitaires avec l'IA
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <Megaphone className="h-5 w-5" />
              Se connecter avec Google
            </Button>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Création automatique de campagnes</p>
              <p>✓ Optimisation ROAS par IA</p>
              <p>✓ Suivi des conversions</p>
              <p>✓ Analytics avancés</p>
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
            <h3 className="text-lg font-semibold">Connexion Google Ads</h3>
            {googleAdsEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Megaphone className="h-3.5 w-3.5" />
                <span>Connecté avec : <span className="font-medium text-foreground">{googleAdsEmail}</span></span>
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
            Déconnecter
          </Button>
        </div>
      </Card>

      {/* Customer ID configuration */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ID Client Google Ads</Label>
            <div className="flex gap-2">
              <Input
                placeholder="123-456-7890"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
              <Button onClick={saveCustomerId}>
                Enregistrer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format : XXX-XXX-XXXX (trouvé dans votre compte Google Ads)
            </p>
          </div>
        </div>
      </Card>

      {/* Instructions Card */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Comment trouver votre ID client Google Ads
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            Connectez-vous à votre <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">compte Google Ads</a>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            L'ID client apparaît en haut à droite (format XXX-XXX-XXXX)
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            Copiez cet ID et collez-le dans le champ ci-dessus
          </li>
        </ol>
      </Card>
    </div>
  );
}
