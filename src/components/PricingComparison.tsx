import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import React, { useState } from "react";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol } from "@/lib/formatUtils";

const PricingComparison = () => {
  const isMobile = useIsMobile();
  const { language } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const features = [
    {
      category: "Products",
      items: [
        { name: "Maximum products", starter: "100", pro: "1,000 - 50,000", enterprise: "Unlimited" },
        { name: "Shopify Import", starter: true, pro: true, enterprise: true },
        { name: "Multi-store management", starter: "1", pro: "3", enterprise: "5 - 500" },
      ]
    },
    {
      category: "SEO Optimizations",
      items: [
        { name: "Monthly optimizations", starter: "100", pro: "500 - 50,000", enterprise: "2,000 - 200,000" },
        { name: "Automatic optimization", starter: true, pro: true, enterprise: true },
        { name: "Sync to Shopify", starter: true, pro: true, enterprise: true },
        { name: "SEO quality analysis", starter: true, pro: true, enterprise: true },
        { name: "Alt text generation (counts as optimization)", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "AI",
      items: [
        { name: "AI articles per month", starter: "5", pro: "10 - 1,000", enterprise: "100 - 10,000" },
        { name: "AI chat per month", starter: "100", pro: "500 - 50,000", enterprise: "2,000 - 200,000" },
        { name: "AI campaigns Blog", starter: "0", pro: "3 - 300", enterprise: "10 - 1,000" },
        { name: "AI Vision (images)", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Integrations & Tools",
      items: [
        { name: "Google Search Console", starter: true, pro: true, enterprise: true },
        { name: "Google Shopping Feed", starter: true, pro: true, enterprise: true },
        { name: "SEO Audit", starter: true, pro: true, enterprise: true },
        { name: "Product sync", starter: true, pro: true, enterprise: true },
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
    if (typeof value === "boolean") {
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
    const plans = ["starter", "pro", "enterprise"];
    const planNames = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
    const currency = getCurrencySymbol(language);
    const planPrices = billingPeriod === 'monthly' 
      ? { 
          starter: `${currency}9.99/mo`, 
          pro: `${currency}49 - ${currency}4,900/mo`, 
          enterprise: `${currency}199 - ${currency}19,900/mo` 
        }
      : {
          starter: `${currency}7.99/mo`,
          pro: `${currency}39 - ${currency}3,920/mo`,
          enterprise: `${currency}159 - ${currency}15,920/mo`
        };

    return (
      <div className="space-y-4">
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
              billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <Badge className="absolute -top-2 -right-2 bg-success text-xs">Save 20%</Badge>
          </button>
        </div>

        {plans.map((plan) => (
          <Card key={plan} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={plan === "pro" ? "default" : "outline"}>
                  {planNames[plan as keyof typeof planNames]}
                </Badge>
                <div className="text-right">
                  <span className="text-lg font-bold">{planPrices[plan as keyof typeof planPrices]}</span>
                  {billingPeriod === 'annual' && (
                    <p className="text-xs text-success">Billed annually</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {features.map((category) => (
                <div key={category.category}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">{category.category}</div>
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">{item.name}</span>
                        <div className="flex-shrink-0">{renderValue(item[plan as keyof typeof item])}</div>
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
  const currency = getCurrencySymbol(language);
  
  const getPriceDisplay = () => {
    if (billingPeriod === 'monthly') {
      return {
        starter: { price: `${currency}9.99`, suffix: '/month' },
        pro: { price: `${currency}49 - ${currency}4,900`, suffix: '/month' },
        enterprise: { price: `${currency}199 - ${currency}19,900`, suffix: '/month' }
      };
    } else {
      return {
        starter: { price: `${currency}7.99`, suffix: '/mo', annual: `${currency}95.90/year` },
        pro: { price: `${currency}39 - ${currency}3,920`, suffix: '/mo', annual: 'billed annually' },
        enterprise: { price: `${currency}159 - ${currency}15,920`, suffix: '/mo', annual: 'billed annually' }
      };
    }
  };

  const prices = getPriceDisplay();
  
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-semibold">
                <div className="flex items-center gap-4">
                  <span>Features</span>
                  {/* Billing Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                        billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Annual
                      <Badge className="absolute -top-1 -right-1 bg-success text-[10px] px-1 py-0">-20%</Badge>
                    </button>
                  </div>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline">Starter</Badge>
                  <span className="text-2xl font-bold">{prices.starter.price}</span>
                  <span className="text-xs text-muted-foreground">{prices.starter.suffix}</span>
                  {prices.starter.annual && (
                    <span className="text-xs text-success">{prices.starter.annual}</span>
                  )}
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-primary">Pro</Badge>
                  <span className="text-2xl font-bold">{prices.pro.price}</span>
                  <span className="text-xs text-muted-foreground">{prices.pro.suffix}</span>
                  {prices.pro.annual && (
                    <span className="text-xs text-success">{prices.pro.annual}</span>
                  )}
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-success">Enterprise</Badge>
                  <span className="text-2xl font-bold">{prices.enterprise.price}</span>
                  <span className="text-xs text-muted-foreground">{prices.enterprise.suffix}</span>
                  {prices.enterprise.annual && (
                    <span className="text-xs text-success">{prices.enterprise.annual}</span>
                  )}
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
                  <tr
                    key={`item-${categoryIndex}-${itemIndex}`}
                    className="border-b hover:bg-muted/20 transition-colors"
                  >
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
