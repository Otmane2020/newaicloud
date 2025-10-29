import { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus } from "lucide-react";
import { ShopifyConnectionDialog } from "./ShopifyConnectionDialog";
import { SkeletonLoader } from "./SkeletonLoader";
import { useTranslation } from '@/hooks/useTranslation';

const ShopifyConnectionsList = lazy(() =>
  import("@/components/dashboard/ShopifyConnectionsList").then(module => ({
    default: module.ShopifyConnectionsList
  }))
);

export function ShopifyIntegrationTabs() {
  const [showDialog, setShowDialog] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <ShoppingBag className="w-5 h-5" />
                {t('shopify.connection_title')}
              </CardTitle>
              <CardDescription className="text-sm">
                {t('shopify.connection_description')}
              </CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              {t('shopify.add_store')}
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
