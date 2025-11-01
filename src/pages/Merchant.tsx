import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GoogleMerchant } from "@/components/seo/GoogleMerchant";
import { GoogleMerchantSettings } from "@/components/seo/GoogleMerchantSettings";
import { GoogleShopping } from "@/components/seo/GoogleShopping";
import { GoogleShoppingSyncSettings } from "@/components/seo/GoogleShoppingSyncSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText, Settings, ShoppingCart, ArrowRight, Package, RefreshCw } from "lucide-react";

export default function Merchant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "feed");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["feed", "settings", "products", "sync"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const tabs = [
    {
      id: "feed",
      label: "Flux XML",
      icon: FileText,
      description: "Gérez et testez votre flux Google Shopping",
      component: <GoogleMerchant />,
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: Settings,
      description: "Configurez les paramètres de votre flux",
      component: <GoogleMerchantSettings />,
    },
    {
      id: "products",
      label: "Produits",
      icon: Package,
      description: "Gérez les attributs Google Shopping de vos produits",
      component: <GoogleShopping />,
    },
    {
      id: "sync",
      label: "Synchronisation",
      icon: RefreshCw,
      description: "Synchronisez vos produits depuis Shopify",
      component: <GoogleShoppingSyncSettings />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            Google Merchant Center
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            Gérez votre flux Google Shopping et synchronisez vos produits avec Google Merchant Center
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <a
            href="https://business.google.com/fr/merchant-center/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Accéder à Merchant Center
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Tabs Navigation */}
        <Card className="p-1">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Card>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6 m-0">
              {/* Tab Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <tab.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{tab.label}</h2>
                  <p className="text-muted-foreground">{tab.description}</p>
                </div>
              </div>

              {/* Tab Component */}
              {tab.component}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Help Section */}
      <Card className="p-6 bg-muted/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Besoin d'aide ?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Vérifiez que vos produits ont des images de qualité</li>
              <li>• Assurez-vous que les prix sont correctement configurés</li>
              <li>• Vérifiez la disponibilité des produits (en stock/hors stock)</li>
              <li>• Utilisez des titres et descriptions optimisés</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Ressources utiles</h3>
            <div className="space-y-2">
              <a
                href="https://support.google.com/merchants"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                Centre d'aide Google Merchant
              </a>
              <a
                href="https://support.google.com/merchants/answer/160567"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                Spécifications des flux de produits
              </a>
              <a
                href="https://support.google.com/merchants/answer/188494"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                Conditions d'utilisation Google Shopping
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
