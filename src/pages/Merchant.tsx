import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GoogleMerchant } from "@/components/seo/GoogleMerchant";
import { GoogleMerchantSettings } from "@/components/seo/GoogleMerchantSettings";
import { GoogleShoppingSyncSettings } from "@/components/seo/GoogleShoppingSyncSettings";
import { GoogleMerchantIntegration } from "@/components/seo/GoogleMerchantIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText, Settings, ShoppingCart, ArrowRight, Package, RefreshCw, Globe } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function Merchant() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "feed");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["integration", "feed", "settings", "sync"].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab("integration");
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const tabs = [
    {
      id: "integration",
      label: "Intégration",
      icon: Globe,
      description: "Connectez votre compte Google Merchant Center",
      component: <GoogleMerchantIntegration />,
    },
    {
      id: "feed",
      label: t.navigation.merchantSubmenu.feed,
      icon: FileText,
      description: t.merchant.tabs.feed.description,
      component: <GoogleMerchant />,
    },
    {
      id: "settings",
      label: t.navigation.merchantSubmenu.settings,
      icon: Settings,
      description: t.merchant.tabs.settings.description,
      component: <GoogleMerchantSettings />,
    },
    {
      id: "sync",
      label: t.navigation.merchantSubmenu.synchronization,
      icon: RefreshCw,
      description: t.merchant.tabs.sync.description,
      component: <GoogleShoppingSyncSettings />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{t.merchant.title}</h1>
              <p className="text-muted-foreground">
                {t.merchant.description}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Link */}
        <a
          href="https://business.google.com/fr/merchant-center/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {t.merchant.openMerchantCenter}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Content */}
        <div>
          {activeTabData && (
            <div className="space-y-4">
              {/* Tab Header */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <activeTabData.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{activeTabData.label}</h2>
                  <p className="text-sm text-muted-foreground">{activeTabData.description}</p>
                </div>
              </div>

              {/* Tab Component */}
              <div className="pt-2">
                {activeTabData.component}
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
