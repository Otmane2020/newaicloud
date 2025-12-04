import { useState, useEffect } from "react";
import { Check, Zap, ShoppingBag, TrendingUp, Clock, Shield, Star, X, Sparkles, BarChart3, Image, MessageSquare, Globe, ChevronRight, Play, Search, FileText, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmbeddedCheckout } from "@/components/mobileads/EmbeddedCheckout";
import phoneHandMockup from "@/assets/phone-hand-mockup.png";
import laptopDashboardMockup from "@/assets/laptop-dashboard-mockup.png";

// Real NewAI Plans with correct Stripe Price IDs
interface Plan {
  name: string;
  products: string;
  popular?: boolean;
  monthly: { priceId: string; price: number };
  yearly: { priceId: string; price: number };
}

const PLANS: Record<string, Plan> = {
  starter: {
    name: "Starter",
    products: "100 products",
    monthly: { priceId: "price_1SXVN5Efti9t9nN9wL9xUjmb", price: 9.99 },
    yearly: { priceId: "price_1SXVN6Efti9t9nN9bWUlHe3G", price: 7.99 },
  },
  pro: {
    name: "Pro",
    products: "1000 products",
    popular: true,
    monthly: { priceId: "price_1SXVN9Efti9t9nN95KliUmU2", price: 49 },
    yearly: { priceId: "price_1SXVNAEfti9t9nN9CuRAwfu9", price: 39.20 },
  },
  business: {
    name: "Business",
    products: "2000 products",
    monthly: { priceId: "price_1SXVNBEfti9t9nN9iNDQENRN", price: 98 },
    yearly: { priceId: "price_1SXVNDEfti9t9nN9cVja1zy7", price: 78.40 },
  }
};

const FEATURES = [
  { icon: Search, title: "AI SEO Optimization", desc: "Boost rankings with AI-generated titles, descriptions & meta tags optimized for Google" },
  { icon: Image, title: "Smart Backgrounds", desc: "Transform product photos with professional AI-generated backgrounds in seconds" },
  { icon: FileText, title: "Landing Pages", desc: "Auto-generate high-converting product landing pages that drive sales" },
  { icon: Tags, title: "Smart Tags & Categories", desc: "AI-powered product tagging and categorization for better organization" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track your store performance with detailed SEO and conversion analytics" },
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "24/7 customer support automation that answers questions and sells" },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Shopify Merchant", text: "NewAI doubled my organic traffic in just 2 months. The AI SEO is incredible!", rating: 5 },
  { name: "Marc D.", role: "E-commerce Owner", text: "The smart backgrounds saved me $500/month in photo editing costs. Game changer!", rating: 5 },
  { name: "Julie P.", role: "Store Manager", text: "Setup took 5 minutes and I saw ROI within 2 weeks. Highly recommend!", rating: 5 },
];

const INTEGRATIONS = [
  { name: "Shopify", icon: "🛒" },
  { name: "Google Merchant", icon: "📊" },
  { name: "Facebook", icon: "📘" },
  { name: "Instagram", icon: "📸" },
  { name: "Google Ads", icon: "📢" },
];

export default function MobileAds() {
  const [showPricing, setShowPricing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "business">("pro");
  const [showCheckout, setShowCheckout] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentPrice = () => {
    const plan = PLANS[selectedPlan];
    return billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 py-2.5 px-4 text-center sticky top-0 z-50">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">🔥 Black Friday Sale</span>
          <Badge className="bg-yellow-400 text-black font-bold">70% OFF</Badge>
          <span className="text-sm">ends in</span>
          <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-sm font-bold">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Hero Section - Phone in Hand Style */}
      <section className="relative px-4 pt-8 pb-12 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-lg mx-auto">
          <div className="text-center mb-6">
            <Badge className="bg-white/10 border-white/20 text-white mb-4">
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI-Powered E-commerce
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] mb-4">
              Automate Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
                Store Success
              </span>
            </h1>
            
            <p className="text-gray-400 text-base mb-6 max-w-sm mx-auto">
              AI SEO, smart backgrounds, landing pages & automated marketing. All in one powerful platform.
            </p>
          </div>

          {/* Phone Mockup - Hand holding phone */}
          <div className="relative mx-auto w-[280px] sm:w-[320px] mb-8">
            <img 
              src={phoneHandMockup} 
              alt="NewAI App Dashboard" 
              className="w-full drop-shadow-2xl"
            />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[200px] h-[80px] bg-violet-500/30 blur-3xl rounded-full" />
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => setShowPricing(true)}
              size="lg"
              className="w-full max-w-[300px] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-7 rounded-2xl shadow-2xl shadow-violet-500/30 text-base"
            >
              <Zap className="w-5 h-5 mr-2" />
              Get 70% OFF – From $7.99/mo
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> 14-day refund</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Logos */}
      <section className="py-8 px-4 border-y border-white/5">
        <p className="text-center text-xs text-gray-500 mb-4">Works seamlessly with</p>
        <div className="flex justify-center items-center gap-6 flex-wrap">
          {INTEGRATIONS.map((int, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
              <span className="text-lg">{int.icon}</span>
              <span className="text-sm text-gray-300 font-medium">{int.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="text-center mb-10">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 mb-3">Features</Badge>
          <h2 className="text-3xl font-bold mb-2">Everything You Need</h2>
          <p className="text-gray-500">to dominate e-commerce with AI</p>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-3">
                <f.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview - Laptop */}
      <section className="py-16 px-4 bg-gradient-to-b from-violet-900/20 to-transparent">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Powerful Dashboard</h2>
          <p className="text-gray-500">Manage everything from one place</p>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <img 
            src={laptopDashboardMockup} 
            alt="NewAI Dashboard" 
            className="w-full rounded-lg shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="text-center mb-10">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mb-3">Testimonials</Badge>
          <h2 className="text-3xl font-bold mb-2">Loved by 10,000+ Merchants</h2>
          <p className="text-gray-500">See what our customers say</p>
        </div>
        
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4 text-gray-300">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 pb-40">
        <div className="flex justify-center gap-12 max-w-md mx-auto">
          <div className="text-center">
            <Shield className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Secure<br />Payment</p>
          </div>
          <div className="text-center">
            <Clock className="w-10 h-10 text-violet-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">5 Minute<br />Setup</p>
          </div>
          <div className="text-center">
            <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Instant<br />Results</p>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent pt-10 pb-6 px-4 z-40">
        <Button 
          onClick={() => setShowPricing(true)}
          className="w-full max-w-md mx-auto block bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold py-6 rounded-xl shadow-xl shadow-violet-500/25 text-base"
        >
          Get 70% OFF – From $7.99/mo
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>

      {/* Pricing Dialog */}
      <Dialog open={showPricing && !showCheckout} onOpenChange={setShowPricing}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 border-0 max-h-[95vh] overflow-y-auto gap-0">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-bold text-violet-600">NewAI</span>
                <span className="text-gray-400 ml-2">Choose Plan</span>
              </div>
              <button onClick={() => setShowPricing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-5 py-4">
            {/* Billing Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "yearly" ? "bg-white shadow text-violet-600" : "text-gray-600"
                }`}
              >
                Yearly <span className="text-green-600 text-xs font-bold ml-1">-20%</span>
              </button>
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "monthly" ? "bg-white shadow text-violet-600" : "text-gray-600"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Plans */}
            <div className="space-y-3">
              {(["starter", "pro", "business"] as const).map((key) => {
                const plan = PLANS[key];
                const price = billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                      selectedPlan === key 
                        ? "border-violet-500 bg-violet-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2.5 right-3 bg-gradient-to-r from-violet-600 to-fuchsia-600">
                        MOST POPULAR
                      </Badge>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPlan === key ? "border-violet-500 bg-violet-500" : "border-gray-300"
                        }`}>
                          {selectedPlan === key && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <h4 className="font-bold">{plan.name}</h4>
                          <p className="text-xs text-gray-500">{plan.products}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black">${price}</span>
                        <span className="text-gray-500 text-sm">/mo</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Features Included */}
            <div className="mt-5 pt-5 border-t">
              <p className="text-xs font-bold text-gray-500 mb-3">ALL PLANS INCLUDE:</p>
              <div className="grid grid-cols-2 gap-2">
                {["AI SEO Optimization", "Smart Backgrounds", "Landing Pages", "Google Merchant", "Facebook & Instagram", "Priority Support"].map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="sticky bottom-0 bg-white p-5 border-t shadow-lg">
            <Button 
              onClick={() => setShowCheckout(true)}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-base rounded-xl"
            >
              Continue – ${getCurrentPrice()}/mo
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <p className="text-center text-xs text-gray-500 mt-3">
              🔒 Secure payment • 14-day money-back guarantee
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 border-0 max-h-[95vh] overflow-hidden gap-0">
          <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-bold text-violet-600">NewAI</span>
                <span className="text-gray-400 ml-2">Checkout</span>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <EmbeddedCheckout 
            selectedPlan={PLANS[selectedPlan]}
            billingPeriod={billingPeriod}
            onClose={() => {
              setShowCheckout(false);
              setShowPricing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
