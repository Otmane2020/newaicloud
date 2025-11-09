import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react';
import { useTranslation } from '@/lib/language';
import { getCurrencySymbol } from '@/lib/formatUtils';

const PricingComparison = () => {
  const isMobile = useIsMobile();
  const { t, language } = useTranslation();

  const allPlans = [
    { id: 'starter', name: 'Starter', priceMonthly: 9.99, priceYearly: 95.9, products: 100, optimizations: 100, articles: 10, chat: 100, stores: 1, campaigns: 0, support: 'email', api: false },
    { id: 'pro-500', name: 'Pro 500', priceMonthly: 49, priceYearly: 470.4, products: 500, optimizations: 500, articles: 10, chat: 500, stores: 3, campaigns: 3, support: 'priority', api: false },
    { id: 'pro-1000', name: 'Pro 1K', priceMonthly: 98, priceYearly: 940.8, products: 1000, optimizations: 1000, articles: 20, chat: 1000, stores: 5, campaigns: 5, support: 'priority', api: false },
    { id: 'pro-2000', name: 'Pro 2K', priceMonthly: 196, priceYearly: 1881.6, products: 2000, optimizations: 2000, articles: 40, chat: 2000, stores: 10, campaigns: 10, support: 'priority', api: false },
    { id: 'pro-4000', name: 'Pro 4K', priceMonthly: 392, priceYearly: 3763.2, products: 4000, optimizations: 4000, articles: 80, chat: 4000, stores: 20, campaigns: 20, support: 'priority', api: false },
    { id: 'pro-8000', name: 'Pro 8K', priceMonthly: 784, priceYearly: 7526.4, products: 8000, optimizations: 8000, articles: 160, chat: 8000, stores: 40, campaigns: 40, support: 'priority', api: false },
    { id: 'pro-16000', name: 'Pro 16K', priceMonthly: 1592, priceYearly: 15283.2, products: 16000, optimizations: 16000, articles: 320, chat: 16000, stores: 80, campaigns: 80, support: 'priority', api: false },
    { id: 'pro-32000', name: 'Pro 32K', priceMonthly: 3184, priceYearly: 30566.4, products: 32000, optimizations: 32000, articles: 640, chat: 32000, stores: 160, campaigns: 160, support: 'priority', api: false },
    { id: 'pro-50000', name: 'Pro 50K', priceMonthly: 4900, priceYearly: 47040, products: 50000, optimizations: 50000, articles: 1000, chat: 50000, stores: 300, campaigns: 300, support: 'priority', api: false },
    { id: 'enterprise-2000', name: 'Enterprise 2K', priceMonthly: 199, priceYearly: 1910.4, products: 2000, optimizations: 2000, articles: 100, chat: 2000, stores: 5, campaigns: 10, support: 'dedicated', api: true },
    { id: 'enterprise-4000', name: 'Enterprise 4K', priceMonthly: 398, priceYearly: 3820.8, products: 4000, optimizations: 4000, articles: 200, chat: 4000, stores: 10, campaigns: 20, support: 'dedicated', api: true },
    { id: 'enterprise-8000', name: 'Enterprise 8K', priceMonthly: 796, priceYearly: 7641.6, products: 8000, optimizations: 8000, articles: 400, chat: 8000, stores: 20, campaigns: 40, support: 'dedicated', api: true },
    { id: 'enterprise-16000', name: 'Enterprise 16K', priceMonthly: 1592, priceYearly: 15283.2, products: 16000, optimizations: 16000, articles: 800, chat: 16000, stores: 40, campaigns: 80, support: 'dedicated', api: true },
    { id: 'enterprise-32000', name: 'Enterprise 32K', priceMonthly: 3184, priceYearly: 30566.4, products: 32000, optimizations: 32000, articles: 1600, chat: 32000, stores: 80, campaigns: 160, support: 'dedicated', api: true },
    { id: 'enterprise-64000', name: 'Enterprise 64K', priceMonthly: 6368, priceYearly: 61132.8, products: 64000, optimizations: 64000, articles: 3200, chat: 64000, stores: 160, campaigns: 320, support: 'dedicated', api: true },
    { id: 'enterprise-128000', name: 'Enterprise 128K', priceMonthly: 12736, priceYearly: 122265.6, products: 128000, optimizations: 128000, articles: 6400, chat: 128000, stores: 320, campaigns: 640, support: 'dedicated', api: true },
    { id: 'enterprise-200000', name: 'Enterprise 200K', priceMonthly: 19900, priceYearly: 191040, products: 200000, optimizations: 200000, articles: 10000, chat: 200000, stores: 512, campaigns: 1000, support: 'dedicated', api: true },
  ];

  const features = [
    { name: "Prix mensuel", key: 'priceMonthly', format: (v: number) => `${v.toFixed(2)}€` },
    { name: "Prix annuel", key: 'priceYearly', format: (v: number) => `${v.toFixed(2)}€` },
    { name: "Produits max", key: 'products', format: (v: number) => v.toLocaleString() },
    { name: "Optimisations/mois", key: 'optimizations', format: (v: number) => v.toLocaleString() },
    { name: "Articles AI/mois", key: 'articles', format: (v: number) => v.toLocaleString() },
    { name: "Réponses chat/mois", key: 'chat', format: (v: number) => v.toLocaleString() },
    { name: "Boutiques Shopify", key: 'stores', format: (v: number) => v.toLocaleString() },
    { name: "Campagnes éditoriales", key: 'campaigns', format: (v: number) => v.toLocaleString() },
    { name: "Support", key: 'support', format: (v: string) => v === 'email' ? 'Email' : v === 'priority' ? 'Prioritaire' : 'Dédié' },
    { name: "Accès API", key: 'api', format: (v: boolean) => v ? 'Oui' : 'Non' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  // Mobile: Cards empilées
  if (isMobile) {
    return (
      <div className="space-y-3">
        {allPlans.map((plan) => {
          const isEnterprise = plan.id.startsWith('enterprise');
          const isPro = plan.id.startsWith('pro');
          
          return (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isEnterprise ? 'default' : isPro ? 'secondary' : 'outline'}>
                    {plan.name}
                  </Badge>
                  <span className="text-sm font-bold">
                    {plan.priceMonthly.toFixed(2)}€/mois
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

  // Desktop: Table horizontale scrollable
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[180px]">Fonctionnalités</th>
              {allPlans.map((plan) => {
                const isEnterprise = plan.id.startsWith('enterprise');
                const isPro = plan.id.startsWith('pro');
                
                return (
                  <th key={plan.id} className="p-3 text-center min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={isEnterprise ? 'default' : isPro ? 'secondary' : 'outline'} className="mb-1">
                        {plan.name}
                      </Badge>
                      <span className="text-lg font-bold">{plan.priceMonthly.toFixed(0)}€</span>
                      <span className="text-xs text-muted-foreground">/mois</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr key={index} className="border-b hover:bg-muted/20 transition-colors">
                <td className="p-3 text-sm font-medium sticky left-0 bg-background z-10">
                  {feature.name}
                </td>
                {allPlans.map((plan) => {
                  const value = (plan as Record<string, any>)[feature.key];
                  const displayValue = (feature.format as (v: any) => string)(value);
                  
                  return (
                    <td key={`${plan.id}-${feature.key}`} className="p-3 text-center text-sm">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className={feature.key === 'priceMonthly' || feature.key === 'priceYearly' ? 'font-semibold' : ''}>
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
      <div className="p-4 bg-muted/30 text-xs text-muted-foreground text-center">
        Faites défiler horizontalement pour voir tous les plans
      </div>
    </Card>
  );
};

export default PricingComparison;