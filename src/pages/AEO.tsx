import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { 
  Lightbulb, 
  Sparkles, 
  Settings, 
  Link as LinkIcon,
  Bot,
  Building2
} from "lucide-react";
import { AeoWizard } from "@/components/aeo/AeoWizard";
import { AeoOpportunitiesList } from "@/components/aeo/AeoOpportunitiesList";
import { AeoIntegrations } from "@/components/aeo/AeoIntegrations";
import { AeoSettings } from "@/components/aeo/AeoSettings";

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  
  const currentTab = searchParams.get("tab") || "chatgpt-product";
  
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  const handleOpportunitiesGenerated = () => {
    setRefreshKey(prev => prev + 1);
    setSearchParams(prev => {
      prev.set("tab", "chatgpt-product");
      return prev;
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Aeoreply
            </h1>
            <p className="text-muted-foreground">
              {language === 'fr' 
                ? 'Optimisez votre contenu pour être cité par ChatGPT, Gemini, Claude & Copilot'
                : 'Optimize your content to be cited by ChatGPT, Gemini, Claude & Copilot'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'fr' ? 'Assistant' : 'Wizard'}</span>
          </TabsTrigger>
          <TabsTrigger value="chatgpt-product" className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">ChatGPT - Product</span>
          </TabsTrigger>
          <TabsTrigger value="chatgpt-brand" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">ChatGPT - Brand</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'fr' ? 'Intégrations' : 'Integrations'}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'fr' ? 'Paramètres' : 'Settings'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Wizard Tab */}
        <TabsContent value="wizard" className="mt-6">
          <AeoWizard onOpportunitiesGenerated={handleOpportunitiesGenerated} />
        </TabsContent>

        {/* ChatGPT Product Tab */}
        <TabsContent value="chatgpt-product" className="mt-6">
          <AeoOpportunitiesList 
            key={`chatgpt-product-${refreshKey}`}
            platform="chatgpt" 
            category="product"
          />
        </TabsContent>

        {/* ChatGPT Brand Tab */}
        <TabsContent value="chatgpt-brand" className="mt-6">
          <AeoOpportunitiesList 
            key={`chatgpt-brand-${refreshKey}`}
            platform="chatgpt" 
            category="brand"
          />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6">
          <AeoIntegrations />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <AeoSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}