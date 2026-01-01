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
  Brain,
  Zap,
  Search
} from "lucide-react";
import { AeoWizard } from "@/components/aeo/AeoWizard";
import { AeoOpportunitiesList } from "@/components/aeo/AeoOpportunitiesList";
import { AeoIntegrations } from "@/components/aeo/AeoIntegrations";
import { AeoSettings } from "@/components/aeo/AeoSettings";

const platformTabs = [
  { id: 'chatgpt', label: 'ChatGPT', icon: Bot, color: '#10b981' },
  { id: 'gemini', label: 'Gemini', icon: Brain, color: '#3b82f6' },
  { id: 'copilot', label: 'Copilot', icon: Zap, color: '#8b5cf6' },
  { id: 'perplexity', label: 'Perplexity', icon: Search, color: '#f59e0b' },
  { id: 'claude', label: 'Claude', icon: Brain, color: '#ec4899' },
];

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  
  const currentTab = searchParams.get("tab") || "opportunities";
  const currentPlatform = searchParams.get("platform") || "chatgpt";
  
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  const handlePlatformChange = (platform: string) => {
    setSearchParams(prev => {
      prev.set("platform", platform);
      return prev;
    });
  };

  const handleOpportunitiesGenerated = () => {
    setRefreshKey(prev => prev + 1);
    setSearchParams(prev => {
      prev.set("tab", "opportunities");
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'fr' ? 'Assistant' : 'Wizard'}</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'fr' ? 'Opportunités' : 'Opportunities'}</span>
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

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="mt-6">
          <div className="space-y-4">
            {/* Platform Sub-tabs */}
            <Tabs value={currentPlatform} onValueChange={handlePlatformChange}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
                {platformTabs.map((platform) => {
                  const Icon = platform.icon;
                  const isActive = currentPlatform === platform.id;
                  return (
                    <TabsTrigger 
                      key={platform.id} 
                      value={platform.id}
                      className="flex items-center gap-2 data-[state=active]:bg-muted"
                      style={{
                        borderBottom: isActive ? `2px solid ${platform.color}` : undefined
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: platform.color }} />
                      <span className="hidden md:inline">{platform.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {platformTabs.map((platform) => (
                <TabsContent key={platform.id} value={platform.id} className="mt-4">
                  <AeoOpportunitiesList 
                    key={`${platform.id}-${refreshKey}`}
                    platform={platform.id} 
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
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
