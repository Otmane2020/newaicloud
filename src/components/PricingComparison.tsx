import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import React, { useState } from "react";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol } from "@/lib/formatUtils";

const PricingComparison = () => {
  const isMobile = useIsMobile();
  const { language, t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const features = [
    {
      category: t.landing.pricing.comparison.features.categories.products,
      items: [
        { name: t.landing.pricing.comparison.features.items.maximumProducts, trial: "10", starter: "100", pro: "1,000 - 50,000", enterprise: "Unlimited" },
        { name: t.landing.pricing.comparison.features.items.shopifyImport, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.multiStoreManagement, trial: "1", starter: "1", pro: "3", enterprise: "5 - 500" },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.seoOptimizations,
      items: [
        { name: t.landing.pricing.comparison.features.items.monthlyOptimizations, trial: "50", starter: "100", pro: "500 - 50,000", enterprise: "2,000 - 200,000" },
        { name: t.landing.pricing.comparison.features.items.automaticOptimization, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.syncToShopify, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.seoQualityAnalysis, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.altTextGeneration, trial: true, starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.aiImageGeneration,
      items: [
        { name: t.landing.pricing.comparison.features.items.altImageVision, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.landingProductPage, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.imageWhiteBackground, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.generateBackground, trial: true, starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.ai,
      items: [
        { name: t.landing.pricing.comparison.features.items.aiArticlesPerMonth, trial: "1", starter: "5", pro: "10 - 1,000", enterprise: "100 - 10,000" },
        { name: t.landing.pricing.comparison.features.items.aiChatPerMonth, trial: "50", starter: "100", pro: "500 - 50,000", enterprise: "2,000 - 200,000" },
        { name: t.landing.pricing.comparison.features.items.aiCampaignsBlog, trial: "0", starter: "0", pro: "3 - 300", enterprise: "10 - 1,000" },
        { name: t.landing.pricing.comparison.features.items.aiVisionImages, trial: true, starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.integrationsTools,
      items: [
        { name: t.landing.pricing.comparison.features.items.googleSearchConsole, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.googleShoppingFeed, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.seoAudit, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.productSync, trial: true, starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.netlinkingBlog,
      items: [
        { name: t.landing.pricing.comparison.features.items.seoOpportunities, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.blogSyncToShopify, trial: true, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.netlinkingAnalysis, trial: true, starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t.landing.pricing.comparison.features.categories.supportPerformance,
      items: [
        { name: t.landing.pricing.comparison.features.items.emailSupport, starter: true, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.prioritySupport, starter: false, pro: true, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.dedicatedAccountManager, starter: false, pro: false, enterprise: true },
        { name: t.landing.pricing.comparison.features.items.apiAccess, starter: false, pro: false, enterprise: true },
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
    const planNames = { 
      starter: t.landing.pricing.plans.starter.name, 
      pro: t.landing.pricing.plans.pro.name, 
      enterprise: t.landing.pricing.plans.enterprise.name 
    };
    const currency = getCurrencySymbol(language);
    const planPrices = billingPeriod === 'monthly' 
      ? { 
          starter: `${currency}9.99${t.landing.pricing.perMonth}`, 
          pro: `${currency}49 - ${currency}4,900${t.landing.pricing.perMonth}`, 
          enterprise: `${currency}199 - ${currency}19,900${t.landing.pricing.perMonth}` 
        }
      : {
          starter: `${currency}7.99${t.landing.pricing.perMonthShort}`,
          pro: `${currency}39 - ${currency}3,920${t.landing.pricing.perMonthShort}`,
          enterprise: `${currency}159 - ${currency}15,920${t.landing.pricing.perMonthShort}`
        };

    return (
      <div className="py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.landing.pricing.comparison.monthly}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.landing.pricing.comparison.annual}
              <Badge className="absolute -top-2 -right-2 bg-success text-xs">{t.landing.pricing.comparison.save20}</Badge>
            </button>
          </div>

          {/* Trial Plan Card - Mobile */}
          <Card className="border-2 border-success bg-success/5">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{t.trial.title}</h3>
                <Badge className="bg-success text-success-foreground">{t.trial.free}</Badge>
              </div>
              <Badge variant="outline" className="border-success text-success w-fit">{t.trial.noCreditCard}</Badge>
              <div className="text-3xl font-bold mt-4">0{currency}</div>
              <p className="text-sm text-muted-foreground">{t.trial.duration}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((category) => (
                <div key={category.category}>
                  <h4 className="font-semibold mb-2">{category.category}</h4>
                  {category.items.map((item) => (
                    <div key={item.name} className="flex items-start gap-2 mb-2">
                      {typeof item.trial === 'boolean' ? (
                        item.trial ? (
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        )
                      ) : (
                        <span className="text-sm font-medium text-success">{item.trial}</span>
                      )}
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              ))}
              <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => window.location.href = '/auth?mode=signup&plan=trial'}>
                {t.trial.startButton}
              </Button>
            </CardContent>
          </Card>

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
                    <p className="text-xs text-success">{t.landing.pricing.comparison.billedAnnually}</p>
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
        starter: { price: `${currency}9.99`, suffix: t.landing.pricing.perMonth },
        pro: { price: `${currency}49 - ${currency}4,900`, suffix: t.landing.pricing.perMonth },
        enterprise: { price: `${currency}199 - ${currency}19,900`, suffix: t.landing.pricing.perMonth }
      };
    } else {
      return {
        starter: { price: `${currency}7.99`, suffix: t.landing.pricing.perMonthShort, annual: `${currency}95.90${t.landing.pricing.perYear}` },
        pro: { price: `${currency}39 - ${currency}3,920`, suffix: t.landing.pricing.perMonthShort, annual: t.landing.pricing.comparison.billedAnnually },
        enterprise: { price: `${currency}159 - ${currency}15,920`, suffix: t.landing.pricing.perMonthShort, annual: t.landing.pricing.comparison.billedAnnually }
      };
    }
  };

  const prices = getPriceDisplay();
  
  return (
    <div className="space-y-6">
      {/* Billing Toggle Above Table */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.landing.pricing.comparison.monthly}
        </button>
        <button
          onClick={() => setBillingPeriod('annual')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors relative ${
            billingPeriod === 'annual' ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.landing.pricing.comparison.annual}
          <Badge className="absolute -top-2 -right-2 bg-success text-xs">{t.landing.pricing.comparison.save20}</Badge>
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-semibold">{t.landing.pricing.comparison.featuresLabel}</th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline">{t.landing.pricing.plans.starter.name}</Badge>
                  <span className="text-2xl font-bold">{prices.starter.price}</span>
                  <span className="text-xs text-muted-foreground">{prices.starter.suffix}</span>
                  {prices.starter.annual && (
                    <span className="text-xs text-success">{prices.starter.annual}</span>
                  )}
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-primary">{t.landing.pricing.plans.pro.name}</Badge>
                  <span className="text-2xl font-bold">{prices.pro.price}</span>
                  <span className="text-xs text-muted-foreground">{prices.pro.suffix}</span>
                  {prices.pro.annual && (
                    <span className="text-xs text-success">{prices.pro.annual}</span>
                  )}
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-success">{t.landing.pricing.plans.enterprise.name}</Badge>
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
                  <td key={item.name + '-trial'} className="p-4 text-center">
                    {typeof item.trial === 'boolean' ? (
                      item.trial ? (
                        <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-medium">{item.trial}</span>
                    )}
                  </td>
                  <td key={item.name + '-starter'} className="p-4 text-center">
                    {typeof item.starter === 'boolean' ? (
                      item.starter ? (
                        <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-medium">{item.starter}</span>
                    )}
                  </td>
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
    </div>
  );
};

export default PricingComparison;
