import { useState, Suspense, lazy, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus } from "lucide-react";
import { ShopifyConnectionDialog } from "./ShopifyConnectionDialog";
import { SkeletonLoader } from "./SkeletonLoader";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const ShopifyConnectionsList = lazy(() =>
  import("@/components/dashboard/ShopifyConnectionsList").then(module => ({
    default: module.ShopifyConnectionsList
  }))
);

export function ShopifyIntegrationTabs() {
  const [showDialog, setShowDialog] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const shop = searchParams.get('shop');

    if (success === 'true') {
      toast.success(`Store connected successfully! 🎉`, {
        description: shop ? `Connected to ${shop}` : undefined
      });
      // Clear URL params
      searchParams.delete('success');
      searchParams.delete('shop');
      setSearchParams(searchParams, { replace: true });
    } else if (error) {
      let errorMessage = 'Failed to connect store';
      let errorDescription = '';

      switch (error) {
        case 'store_already_connected':
          errorMessage = 'Store already connected';
          errorDescription = 'This store is already connected to your account';
          break;
        case 'store_limit_reached':
          errorMessage = 'Store limit reached';
          errorDescription = 'You have reached the maximum number of stores for your plan. Upgrade to add more stores.';
          break;
        case 'auth_failed':
          errorMessage = 'Authentication failed';
          errorDescription = 'Failed to authenticate with Shopify';
          break;
        case 'connection_failed':
          errorMessage = 'Connection failed';
          errorDescription = 'Failed to save store connection';
          break;
        case 'missing_state':
        case 'invalid_state':
        case 'expired_session':
          errorMessage = 'Session error';
          errorDescription = 'Your session has expired. Please try again.';
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
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <ShoppingBag className="w-5 h-5" />
                Shopify Connections
              </CardTitle>
              <CardDescription className="text-sm">
                Connect and manage your Shopify stores
              </CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Store
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Suspense fallback={<SkeletonLoader />}>
        <ShopifyConnectionsList />
      </Suspense>

      <ShopifyConnectionDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}
