import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function OrdersManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gestion des Commandes
        </CardTitle>
        <CardDescription>
          Suivez et gérez vos commandes Shopify
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Fonctionnalité à venir</p>
          <p className="text-sm mt-2">
            La gestion des commandes sera bientôt disponible
          </p>
        </div>
      </CardContent>
    </Card>
  );
}