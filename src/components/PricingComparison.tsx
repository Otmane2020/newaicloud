import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";

const PricingComparison = () => {
  const isMobile = useIsMobile();
  const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "annual">("monthly");

  const pricing = {
    starter: {
      monthly: 9.99,
      annual: 95.90
    },
    pro: {
      monthly: 49,
      annual: 470
    },
    enterprise: {
      monthly: 199,
      annual: 1912
    }
  };

  const features = [
    {
      category: "Products",
      items: [
        { name: "Maximum products", starter: "1,000", pro: "10,000", enterprise: "Unlimited" },
        { name: "Shopify Import", starter: true, pro: true, enterprise: true },
        { name: "Multi-store management", starter: "1 store", pro: "5 stores", enterprise: "Unlimited" },
      ],
    },
    {
      category: "SEO Optimizations",
      items: [
        { name: "Monthly optimizations", starter: "250", pro: "2,500", enterprise: "Unlimited" },
        { name: "Automatic optimization", starter: true, pro: true, enterprise: true },
        { name: "Sync to Shopify", starter: true, pro: true, enterprise: true },
        { name: "SEO quality analysis", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "AI",
      items: [
        { name: "AI articles per month", starter: "5", pro: "50", enterprise: "500" },
        { name: "AI chat messages", starter: "500", pro: "5,000", enterprise: "Unlimited" },
        { name: "Editorial campaigns", starter: "2", pro: "20", enterprise: "Unlimited" },
        { name: "AI Vision (images)", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "Netlinking & Blog",
      items: [
        { name: "SEO opportunities", starter: true, pro: true, enterprise: true },
        { name: "Blog sync to Shopify", starter: true, pro: true, enterprise: true },
        { name: "Netlinking analysis", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "Support & Performance",
      items: [
        { name: "Email support", starter: true, pro: true, enterprise: true },
        { name: "Priority support", starter: false, pro: true, enterprise: true },
        { name: "Dedicated account manager", starter: false, pro: false, enterprise: true },
        { name: "API Access", starter: false, pro: false, enterprise: true },
      ],
    },
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

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingPeriod === "annual"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Annual
            <span className="ml-1 text-xs">(Save 20%)</span>
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
                  <div className="text-lg font-bold">
                    ${pricing[plan as keyof typeof pricing][billingPeriod]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /{billingPeriod === "monthly" ? "mo" : "yr"}
                  </div>
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
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-center gap-2 p-4 border-b bg-muted/20">
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            billingPeriod === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingPeriod("annual")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            billingPeriod === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Annual
          <span className="ml-2 text-xs">(Save 20%)</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-semibold">Features</th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline">Starter</Badge>
                  <span className="text-2xl font-bold">
                    ${pricing.starter[billingPeriod]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-primary">Pro</Badge>
                  <span className="text-2xl font-bold">
                    ${pricing.pro[billingPeriod]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-success">Enterprise</Badge>
                  <span className="text-2xl font-bold">
                    ${pricing.enterprise[billingPeriod]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
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
