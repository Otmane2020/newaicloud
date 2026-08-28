import { useEffect, useState } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useSearchParams } from "react-router-dom";
import { GoogleMerchant } from "@/components/seo/GoogleMerchant";
import { GoogleMerchantSettings } from "@/components/seo/GoogleMerchantSettings";
import { GoogleMerchantIntegration } from "@/components/seo/GoogleMerchantIntegration";
import { GoogleMerchantSyncSettings } from "@/components/seo/GoogleMerchantSyncSettings";
import { GoogleMerchantMonitoring } from "@/components/seo/GoogleMerchantMonitoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, ArrowRight, RefreshCw, Globe, BarChart3 } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function Merchant() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "feed");

  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = ["integration", "feed", "settings", "sync", "monitoring"];
    setActiveTab(tab && validTabs.includes(tab) ? tab : "integration");
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const tabs = [
    {
      id: "integration",
      label: t.googleConsole.integration,
      icon: Globe,
      description: t.merchant.tabs.integration.description,
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
      label: t.merchant.tabs.sync.label,
      icon: RefreshCw,
      description: t.merchant.tabs.sync.description,
      component: <GoogleMerchantSyncSettings />,
    },
    {
      id: "monitoring",
      label: t.merchant.tabs.monitoring.label,
      icon: BarChart3,
      description: t.merchant.tabs.monitoring.description,
      component: <GoogleMerchantMonitoring />,
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        section="Channels"
        page={activeTabData?.label || "Merchant Center"}
        title={t.merchant.title}
        description={activeTabData?.description || t.merchant.description}
        actions={
          <a
            href="https://business.google.com/fr/merchant-center/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {t.merchant.openMerchantCenter}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="overflow-x-auto border-b">
          <TabsList className="h-10 w-max min-w-full justify-start rounded-none bg-transparent p-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="h-10 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="m-0">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
