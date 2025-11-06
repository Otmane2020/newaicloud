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
  name: string;
  created_at: string;
}

export function GoogleMerchantIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [googleMerchantEmail, setGoogleMerchantEmail] = useState<string | null>(null);
  const [merchantAccounts, setMerchantAccounts] = useState<GoogleMerchantAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [newAccountId, setNewAccountId] = useState('');

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
        .select('google_merchant_oauth_token, google_merchant_email')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_merchant_oauth_token);
      setGoogleMerchantEmail(profile?.google_merchant_email || null);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/merchant?tab=integration`;
      
      // Using the same Google OAuth endpoint but with different scopes
      const scopes = [
        'https://www.googleapis.com/auth/content',
        'https://www.googleapis.com/auth/siteverification'
      ];
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: scopes.join(' '),
          state: 'google_merchant'
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
        'Google Merchant Center Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        toast.error('Veuillez autoriser les popups pour ce site');
        return;
      }
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_MERCHANT_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          
          const { data, error } = await supabase.functions.invoke('google-merchant-oauth-token', {
            body: {
              code: event.data.code,
              redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('Error exchanging code:', error);
            toast.error('Erreur lors de la connexion à Google Merchant Center');
            return;
          }
          
          toast.success('Connexion à Google Merchant Center réussie !');
          checkGoogleConnection();
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
          google_merchant_oauth_token: null,
          google_merchant_refresh_token: null,
          google_merchant_token_expires_at: null,
          google_merchant_email: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Google Merchant Center déconnecté avec succès');
      setIsConnected(false);
      setGoogleMerchantEmail(null);
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Impossible de déconnecter Google Merchant Center');
    }
  };

  const createFeedInMerchant = async () => {
    if (!selectedAccount) {
      toast.error('Veuillez sélectionner un compte Merchant Center');
      return;
    }

    const toastId = toast.loading('Création du flux dans Google Merchant Center...');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-google-merchant-feed', {
        body: {
          merchantAccountId: selectedAccount,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Flux créé avec succès dans Google Merchant Center', { id: toastId });
      } else {
        throw new Error(data?.error || 'Échec de la création du flux');
      }
    } catch (error: any) {
      console.error('Error creating feed:', error);
      toast.error(error.message || 'Erreur lors de la création du flux', { id: toastId });
    }
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
            <h2 className="text-2xl font-bold">Connecter Google Merchant Center</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connectez votre compte Google pour créer et gérer vos flux produits
              directement dans Google Merchant Center.
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              Se connecter avec Google
            </Button>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Création automatique de flux</p>
              <p>✓ Synchronisation produits</p>
              <p>✓ Gestion des comptes Merchant</p>
              <p>✓ Suivi des performances</p>
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
            <h3 className="text-lg font-semibold">Connexion Google Merchant</h3>
            {googleMerchantEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Connecté avec : <span className="font-medium text-foreground">{googleMerchantEmail}</span></span>
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

      {/* Account selection and feed creation */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Compte Merchant Center</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ID du compte (ex: 123456789)"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAddAccountDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Entrez l'ID de votre compte Google Merchant Center
            </p>
          </div>

          <Button
            onClick={createFeedInMerchant}
            disabled={!selectedAccount}
            className="w-full gap-2"
          >
            <Upload className="h-4 w-4" />
            Créer le flux dans Google Merchant Center
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
