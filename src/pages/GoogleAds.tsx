import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Megaphone, Globe, TrendingUp, BarChart3, Target } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { GoogleAdsIntegration } from "@/components/ads/GoogleAdsIntegration";
import { GoogleAdsCampaigns } from "@/components/ads/GoogleAdsCampaigns";
import { GoogleAdsOptimization } from "@/components/ads/GoogleAdsOptimization";
import { GoogleAdsAnalytics } from "@/components/ads/GoogleAdsAnalytics";
import { GoogleAdsTracking } from "@/components/ads/GoogleAdsTracking";

export default function GoogleAds() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "integration");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["integration", "campaigns", "optimization", "analytics", "tracking"].includes(tab)) {
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
      description: "Connectez votre compte Google Ads",
      component: <GoogleAdsIntegration />,
    },
    {
      id: "campaigns",
      label: "Campagnes",
      icon: Megaphone,
      description: "Créez et gérez vos campagnes Google Ads",
      component: <GoogleAdsCampaigns />,
    },
    {
      id: "optimization",
      label: "Optimisation ROAS",
      icon: TrendingUp,
      description: "Optimisez le retour sur investissement publicitaire",
      component: <GoogleAdsOptimization />,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      description: "Analysez les performances de vos campagnes",
      component: <GoogleAdsAnalytics />,
    },
    {
      id: "tracking",
      label: "Tracking & Conversion",
      icon: Target,
      description: "Configurez le suivi des conversions",
      component: <GoogleAdsTracking />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Google Ads</h1>
              <p className="text-muted-foreground">
                Gérez vos campagnes publicitaires avec l'IA
              </p>
            </div>
          </div>
        </div>
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
