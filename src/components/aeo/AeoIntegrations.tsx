import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  ShoppingBag, 
  FileCode, 
  ShoppingCart,
  Facebook,
  Instagram,
  Linkedin,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: { fr: string; en: string };
  icon: React.ComponentType<{ className?: string }>;
  status: 'active' | 'coming_soon' | 'available';
  color: string;
}

export function AeoIntegrations() {
  const { language } = useTranslation();
  const { selectedStore } = useStore();
  const [autoPublish, setAutoPublish] = useState(false);
  
  const integrations: Integration[] = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: {
        fr: 'Publiez vos articles AEO directement sur votre blog Shopify',
        en: 'Publish your AEO articles directly to your Shopify blog'
      },
      icon: ShoppingBag,
      status: selectedStore?.id ? 'active' : 'available',
      color: '#95BF47'
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      description: {
        fr: 'Connectez votre site WordPress pour publier automatiquement',
        en: 'Connect your WordPress site to publish automatically'
      },
      icon: FileCode,
      status: 'coming_soon',
      color: '#21759B'
    },
    {
      id: 'prestashop',
      name: 'PrestaShop',
      description: {
        fr: 'Intégration avec votre boutique PrestaShop',
        en: 'Integration with your PrestaShop store'
      },
      icon: ShoppingCart,
      status: 'coming_soon',
      color: '#DF0067'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      description: {
        fr: 'Partagez automatiquement vos articles sur Facebook',
        en: 'Automatically share your articles on Facebook'
      },
      icon: Facebook,
      status: 'coming_soon',
      color: '#1877F2'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: {
        fr: 'Créez des posts Instagram à partir de vos articles',
        en: 'Create Instagram posts from your articles'
      },
      icon: Instagram,
      status: 'coming_soon',
      color: '#E4405F'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: {
        fr: 'Partagez sur LinkedIn pour le B2B',
        en: 'Share on LinkedIn for B2B reach'
      },
      icon: Linkedin,
      status: 'coming_soon',
      color: '#0A66C2'
    }
  ];

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {language === 'fr' ? 'Connecté' : 'Connected'}
          </Badge>
        );
      case 'available':
        return (
          <Badge variant="outline">
            {language === 'fr' ? 'Disponible' : 'Available'}
          </Badge>
        );
      case 'coming_soon':
        return (
          <Badge variant="secondary" className="bg-muted">
            <Clock className="h-3 w-3 mr-1" />
            {language === 'fr' ? 'Bientôt' : 'Coming soon'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          {language === 'fr' ? 'Intégrations' : 'Integrations'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {language === 'fr' 
            ? 'Connectez vos plateformes pour publier automatiquement vos articles AEO'
            : 'Connect your platforms to automatically publish your AEO articles'}
        </p>
      </div>

      {/* Shopify Auto-Publish Setting */}
      {selectedStore?.id && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#95BF47' }}>
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">
                    {language === 'fr' ? 'Publication automatique Shopify' : 'Shopify Auto-Publish'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' 
                      ? 'Les articles AEO seront publiés automatiquement sur votre blog'
                      : 'AEO articles will be automatically published to your blog'}
                  </p>
                </div>
              </div>
              <Switch
                checked={autoPublish}
                onCheckedChange={setAutoPublish}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isActive = integration.status === 'active';
          const isComingSoon = integration.status === 'coming_soon';
          
          return (
            <Card 
              key={integration.id}
              className={`${isComingSoon ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: integration.color }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                <CardTitle className="text-lg mt-3">{integration.name}</CardTitle>
                <CardDescription>
                  {integration.description[language as 'fr' | 'en']}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isActive ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    {language === 'fr' ? 'Connecté' : 'Connected'}
                  </Button>
                ) : isComingSoon ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Clock className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Bientôt disponible' : 'Coming soon'}
                  </Button>
                ) : (
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Connecter' : 'Connect'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
