import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { OAuthConnectionForm } from './OAuthConnectionForm';
import { TokenApiGuide } from './TokenApiGuide';
import { SkeletonLoader } from './SkeletonLoader';

// Lazy load the connections list for better performance
const ShopifyConnectionsList = lazy(() => 
  import('@/components/dashboard/ShopifyConnectionsList').then(module => ({
    default: module.ShopifyConnectionsList
  }))
);

export function ShopifyIntegrationTabs() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (success === 'true') {
        toast.success('Boutique Shopify connectée avec succès !');
        // Clear URL params
        setSearchParams({});
        // Reload connections
        window.location.reload();
      } else if (error) {
        toast.error(`Erreur: ${error}`);
        setSearchParams({});
      }
    };

    handleOAuthCallback();
  }, [searchParams, setSearchParams]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: OAuth Quick Connection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Connexion Rapide</h3>
          <Badge variant="default">Recommandé</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connexion sécurisée en un clic sans configuration manuelle
        </p>
        
        <OAuthConnectionForm />
      </div>
      
      {/* Right Column: Token API Advanced Connection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-xl font-bold">Connexion Avancée</h3>
          <Badge variant="outline">Token API</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Utilisez votre propre token API Shopify pour une configuration personnalisée
        </p>
        
        <TokenApiGuide />
        
        <div className="mt-6">
          <Suspense fallback={<SkeletonLoader />}>
            <ShopifyConnectionsList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
