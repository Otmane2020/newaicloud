import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement';
import { ShopifyConnection } from '@/components/dashboard/ShopifyConnection';
import { User, CreditCard, ShoppingBag } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez votre compte, abonnement et connexion Shopify
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Compte
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Abonnement
            </TabsTrigger>
            <TabsTrigger value="shopify" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Shopify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="shopify">
            <ShopifyConnection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}