import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GoogleMerchant } from "@/components/seo/GoogleMerchant";
import { GoogleMerchantSettings } from "@/components/seo/GoogleMerchantSettings";
import { GoogleShoppingSyncSettings } from "@/components/seo/GoogleShoppingSyncSettings";
import { GoogleMerchantIntegration } from "@/components/seo/GoogleMerchantIntegration";
import { GoogleMerchantSyncSettings } from "@/components/seo/GoogleMerchantSyncSettings";
import { GoogleMerchantMonitoring } from "@/components/seo/GoogleMerchantMonitoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, ShoppingCart, ArrowRight, RefreshCw, Globe, BarChart3 } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function Merchant() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "feed");
  
  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = ["integration", "feed", "settings", "sync", "monitoring"];
    if (tab && validTabs.includes(tab)) {
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
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="workspace-hero overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 text-white">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">
              <ShoppingCart className="h-3.5 w-3.5" /> Google channel
            </div>
            <h1>{t.merchant.title}</h1>
            <p className="max-w-2xl">{t.merchant.description}</p>
          </div>
          <a href="https://business.google.com/fr/merchant-center/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15">
            {t.merchant.openMerchantCenter}<ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon className="h-4 w-4" /><span className="truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTabData && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <activeTabData.icon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{activeTabData.label}</h2>
                <p className="text-sm text-muted-foreground">{activeTabData.description}</p>
              </div>
            </div>
            {activeTabData.component}
          </section>
        )}
      </Tabs>
    </div>
  );}
