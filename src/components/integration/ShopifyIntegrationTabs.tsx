import { useState, Suspense, lazy, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, RefreshCw, Lock } from "lucide-react";
import { ShopifyConnectionWizard } from "./ShopifyConnectionWizard";
import { SkeletonLoader } from "./SkeletonLoader";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useTranslation } from "@/lib/language";

const ShopifyConnectionsList = lazy(() => import("@/components/dashboard/ShopifyConnectionsList"));

export function ShopifyIntegrationTabs() {
  const { isDemoMode } = useDemoMode();
  const { t, tf } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const shop = searchParams.get('shop');

    if (success === 'true') {
      toast.success(t.toasts.shopify.storeConnected, {
        description: shop ? tf('toasts.shopify.connectedTo', { shop }) : undefined
      });
      // Refresh the list
      setRefreshKey(prev => prev + 1);
      // Clear URL params
      searchParams.delete('success');
      searchParams.delete('shop');
      setSearchParams(searchParams, { replace: true });
    } else if (error) {
      let errorMessage = t.toasts.shopify.connectionFailed;
      let errorDescription = '';

      switch (error) {
        case 'store_already_connected':
          errorMessage = t.toasts.shopify.alreadyConnected;
          errorDescription = t.toasts.shopify.storeAlreadyConnectedDesc;
          break;
        case 'store_limit_reached':
          errorMessage = t.toasts.shopify.storeLimitReached;
          errorDescription = t.toasts.shopify.storeLimitReachedDesc;
          break;
        case 'auth_failed':
          errorMessage = t.toasts.shopify.authFailed;
          errorDescription = t.toasts.shopify.authFailedDesc;
          break;
        case 'connection_failed':
          errorMessage = t.toasts.shopify.connectionFailed;
          errorDescription = t.toasts.shopify.connectionFailedDesc;
          break;
        case 'missing_state':
        case 'invalid_state':
        case 'expired_session':
          errorMessage = t.toasts.shopify.sessionError;
          errorDescription = t.toasts.shopify.sessionExpiredDesc;
          break;
        default:
          errorDescription = error;
      }

      toast.error(errorMessage, {
        description: errorDescription
      });
      
      // Clear URL params
      searchParams.delete('error');
      searchParams.delete('shop');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t, tf]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <ShoppingBag className="w-5 h-5" />
                {t.integration?.shopify?.title || 'Shopify Connections'}
              </CardTitle>
              <CardDescription className="text-sm">
                {t.integration?.shopify?.description || 'Connect and manage your Shopify stores'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setRefreshKey(prev => prev + 1)} variant="outline" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.integration.sync.refresh || 'Refresh'}
              </Button>
              <Button 
                onClick={() => {
                  if (isDemoMode) {
                    toast.error(t.demo.restrictions.cannotAddStore);
                    return;
                  }
                  setShowDialog(true);
                }} 
                size="lg" 
                className="w-full sm:w-auto"
                variant={isDemoMode ? "outline" : "default"}
              >
                {isDemoMode ? <Lock className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {t.integration?.shopify?.addStore || 'Add Store'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        </CardContent>
      </Card>

      <Suspense fallback={<SkeletonLoader />}>
        <ShopifyConnectionsList key={refreshKey} />
      </Suspense>

      <ShopifyConnectionWizard 
        open={showDialog} 
        onOpenChange={setShowDialog}
        onSuccess={() => {
          setShowDialog(false);
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
}
