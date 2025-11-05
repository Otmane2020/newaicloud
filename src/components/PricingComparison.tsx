import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react';
import { useTranslation } from '@/lib/language';


const PricingComparison = () => {
  const isMobile = useIsMobile();
  const { language } = useTranslation();

  const features = [
    {
      category: "Products",
      items: [
        { name: "Maximum products", starter: "1,000", pro: "5,000 - 320,000", enterprise: "100,000 - 12,800,000" },
        { name: "Shopify Import", starter: true, pro: true, enterprise: true },
        { name: "Multi-store management", starter: "1", pro: "2 - 128", enterprise: "10 - 1,280" },
      ]
    },
    {
      category: "SEO Optimizations",
      items: [
        { name: "Monthly optimizations", starter: "250", pro: "500 - 32,000", enterprise: "5,000 - 640,000" },
        { name: "Automatic optimization", starter: true, pro: true, enterprise: true },
        { name: "Sync to Shopify", starter: true, pro: true, enterprise: true },
        { name: "SEO quality analysis", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "AI",
      items: [
        { name: "AI articles per month", starter: "5", pro: "10 - 640", enterprise: "100 - 12,800" },
        { name: "AI chat per month", starter: "500", pro: "1,000 - 64,000", enterprise: "10,000 - 1,280,000" },
        { name: "Editorial campaigns", starter: "2", pro: "5 - 320", enterprise: "50 - 6,400" },
        { name: "AI Vision (images)", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Netlinking & Blog",
      items: [
        { name: "SEO opportunities", starter: true, pro: true, enterprise: true },
        { name: "Blog sync to Shopify", starter: true, pro: true, enterprise: true },
        { name: "Netlinking analysis", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Support & Performance",
      items: [
        { name: "Email support", starter: true, pro: true, enterprise: true },
        { name: "Priority support", starter: false, pro: true, enterprise: true },
        { name: "Dedicated account manager", starter: false, pro: false, enterprise: true },
        { name: "API Access", starter: false, pro: false, enterprise: true },
      ]
    }
  ];

  const renderValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  // Mobile: Cards empilées
  if (isMobile) {
    const plans = ['starter', 'pro', 'enterprise'];
    const planNames = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    const planPrices = { 
      starter: '$9.99/mois', 
      pro: '$98 - $4,900/mois', 
      enterprise: '$199 - $19,900/mois' 
    };
    
    return (
      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={plan === 'pro' ? 'default' : 'outline'}>
                  {planNames[plan as keyof typeof planNames]}
                </Badge>
                <span className="text-lg font-bold">
                  {planPrices[plan as keyof typeof planPrices]}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {features.map((category) => (
                <div key={category.category}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {category.category}
                  </div>
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">{item.name}</span>
                        <div className="flex-shrink-0">
                          {renderValue(item[plan as keyof typeof item])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Table
  
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-semibold">Features</th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline">Starter</Badge>
                  <span className="text-2xl font-bold">$9.99</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-primary">Pro</Badge>
                  <span className="text-2xl font-bold">$98 - $4,900</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-success">Enterprise</Badge>
                  <span className="text-2xl font-bold">$199 - $19,900</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((category, categoryIndex) => (
              <React.Fragment key={`cat-${categoryIndex}`}>
                <tr className="bg-muted/30">
                  <td colSpan={4} className="p-3 font-semibold text-sm">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, itemIndex) => (
                  <tr key={`item-${categoryIndex}-${itemIndex}`} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm">{item.name}</td>
                    <td className="p-4 text-center">{renderValue(item.starter)}</td>
                    <td className="p-4 text-center">{renderValue(item.pro)}</td>
                    <td className="p-4 text-center">{renderValue(item.enterprise)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PricingComparison;