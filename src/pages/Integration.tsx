import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShopifyConnectionsList } from '@/components/dashboard/ShopifyConnectionsList';
import { OAuthConnectionForm } from '@/components/integration/OAuthConnectionForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Integration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectionMode, setConnectionMode] = useState<string>("oauth");

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const isCallback = searchParams.get('oauth') === 'callback';
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const shop = searchParams.get('shop');

      if (isCallback && code && state && shop) {
        try {
          const { error } = await supabase.functions.invoke('shopify-oauth-callback', {
            body: { code, state, shop }
          });

          if (error) throw error;

          toast.success('Boutique Shopify connectée avec succès !');
          // Clear URL params
          setSearchParams({});
          // Reload connections
          window.location.reload();
        } catch (error: any) {
          console.error('OAuth callback error:', error);
          toast.error(error.message || 'Erreur lors de la connexion OAuth');
          setSearchParams({});
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Intégrations Shopify
          </h1>
          <p className="text-muted-foreground text-lg">
            Connectez et gérez vos boutiques Shopify
          </p>
        </div>

        <div className="space-y-6">
          <Tabs value={connectionMode} onValueChange={setConnectionMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="oauth">
                <Shield className="w-4 h-4 mr-2" />
                OAuth (Recommandé)
              </TabsTrigger>
              <TabsTrigger value="token">
                <Key className="w-4 h-4 mr-2" />
                Token API
              </TabsTrigger>
            </TabsList>

            <TabsContent value="oauth" className="mt-6">
              <OAuthConnectionForm />
            </TabsContent>

            <TabsContent value="token" className="mt-6">
              <ShopifyConnectionsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
