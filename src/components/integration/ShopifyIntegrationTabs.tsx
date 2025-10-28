import { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus } from "lucide-react";
import { ShopifyConnectionDialog } from "./ShopifyConnectionDialog";
import { SkeletonLoader } from "./SkeletonLoader";

const ShopifyConnectionsList = lazy(() =>
  import("@/components/dashboard/ShopifyConnectionsList").then(module => ({
    default: module.ShopifyConnectionsList
  }))
);

export function ShopifyIntegrationTabs() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Connexion Shopify
              </CardTitle>
              <CardDescription>
                Connectez votre boutique en quelques secondes
              </CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une boutique
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
