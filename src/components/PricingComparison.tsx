import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState } from 'react';
import { useTranslation } from '@/lib/language';
import { getCurrencySymbol } from '@/lib/formatUtils';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const PricingComparison = () => {
  const isMobile = useIsMobile();
  const { t, language } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  const allPlans = [
    { 
      id: 'starter', 
      name: 'Starter', 
      priceMonthly: 9.99, 
      priceYearly: 99.90, 
      products: 100, 
      optimizations: 100, 
      articles: 10, 
      chat: 100, 
      stores: 1, 
      campaigns: 0, 
      support: 'email', 
      api: false 
    },
    { 
      id: 'pro', 
      name: 'Pro', 
      priceMonthly: 49, 
      priceYearly: 490, 
      products: 500, 
      optimizations: 500, 
      articles: 50, 
      chat: 500, 
      stores: 3, 
      campaigns: 10, 
      support: 'priority', 
      api: false 
    },
    { 
      id: 'enterprise', 
      name: 'Enterprise', 
      priceMonthly: 199, 
      priceYearly: 1990, 
      products: 2000, 
      optimizations: 2000, 
      articles: 200, 
      chat: 2000, 
      stores: 10, 
      campaigns: 50, 
      support: 'dedicated', 
      api: true 
    },
  ];

  const features = [
    { name: "Produits max", key: 'products', format: (v: number) => v.toLocaleString() },
    { name: "Optimisations/mois", key: 'optimizations', format: (v: number) => v.toLocaleString() },
    { name: "Articles AI/mois", key: 'articles', format: (v: number) => v.toLocaleString() },
    { name: "Réponses chat/mois", key: 'chat', format: (v: number) => v.toLocaleString() },
    { name: "Boutiques Shopify", key: 'stores', format: (v: number) => v.toLocaleString() },
    { name: "Campagnes éditoriales", key: 'campaigns', format: (v: number) => v.toLocaleString() },
    { name: "Support", key: 'support', format: (v: string) => v === 'email' ? 'Email' : v === 'priority' ? 'Prioritaire' : 'Dédié' },
    { name: "Accès API", key: 'api', format: (v: boolean) => v ? 'Oui' : 'Non' },
  ];

  const getPrice = (plan: typeof allPlans[0]) => {
    return isYearly ? plan.priceYearly : plan.priceMonthly;
  };

  const getPeriodLabel = () => {
    return isYearly ? '/an' : '/mois';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  // Mobile: Cards empilées
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Mensuel
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Annuel
          </Label>
        </div>
        
        {allPlans.map((plan) => {
          const isEnterprise = plan.id === 'enterprise';
          const isPro = plan.id === 'pro';
          
          return (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isEnterprise ? 'default' : isPro ? 'secondary' : 'outline'}>
                    {plan.name}
                  </Badge>
                  <span className="text-sm font-bold">
                    {getPrice(plan).toFixed(2)}€{getPeriodLabel()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produits:</span>
                  <span className="font-medium">{formatNumber(plan.products)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimisations/mois:</span>
                  <span className="font-medium">{formatNumber(plan.optimizations)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Articles/mois:</span>
                  <span className="font-medium">{formatNumber(plan.articles)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chat/mois:</span>
                  <span className="font-medium">{formatNumber(plan.chat)}</span>
                </div>
                {plan.api && (
                  <div className="pt-2 border-t">
                    <CheckCircle2 className="w-4 h-4 text-success inline mr-1" />
                    <span className="text-success">Accès API inclus</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: Table horizontale
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle-desktop" className={!isYearly ? 'font-semibold' : 'text-muted-foreground'}>
          Mensuel
        </Label>
        <Switch
          id="billing-toggle-desktop"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label htmlFor="billing-toggle-desktop" className={isYearly ? 'font-semibold' : 'text-muted-foreground'}>
          Annuel
        </Label>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[200px]">Fonctionnalités</th>
                {allPlans.map((plan) => {
                  const isEnterprise = plan.id === 'enterprise';
                  const isPro = plan.id === 'pro';
                  
                  return (
                    <th key={plan.id} className="p-4 text-center min-w-[180px]">
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant={isEnterprise ? 'default' : isPro ? 'secondary' : 'outline'} className="mb-1">
                          {plan.name}
                        </Badge>
                        <span className="text-2xl font-bold">{getPrice(plan).toFixed(2)}€</span>
                        <span className="text-sm text-muted-foreground">{getPeriodLabel()}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="p-4 text-sm font-medium sticky left-0 bg-background z-10">
                    {feature.name}
                  </td>
                  {allPlans.map((plan) => {
                    const value = (plan as Record<string, any>)[feature.key];
                    const displayValue = (feature.format as (v: any) => string)(value);
                    
                    return (
                      <td key={`${plan.id}-${feature.key}`} className="p-4 text-center text-sm">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">
                            {displayValue}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PricingComparison;