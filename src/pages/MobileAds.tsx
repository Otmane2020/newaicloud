import { useState, useEffect } from "react";
import { Check, Zap, ShoppingBag, TrendingUp, Bot, Clock, Shield, Star, X, Sparkles, BarChart3, Image, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// 3 Plans with Stripe Price IDs
const PLANS: Record<string, { name: string; products: string; popular?: boolean; monthly: { usd: string; price: number }; yearly: { usd: string; price: number } }> = {
  starter: {
    name: "Starter",
    products: "100 products",
    monthly: { usd: "price_1SXVNYEfti9t9nN9rLPoX47O", price: 3.18 },
    yearly: { usd: "price_1SXVNZEfti9t9nN94DUSEydX", price: 2.55 },
  },
  pro: {
    name: "Pro",
    products: "500 products",
    popular: true,
    monthly: { usd: "price_1SXVNWEfti9t9nN91PsPoSZo", price: 15.92 },
    yearly: { usd: "price_1SXVNXEfti9t9nN9UlFZWukM", price: 12.74 },
  },
  business: {
    name: "Business",
    products: "2000 products",
    monthly: { usd: "price_1SXVNbEfti9t9nN9jsQWZ5VG", price: 63.68 },
    yearly: { usd: "price_1SXVNcEfti9t9nN9Odk0dDrl", price: 50.94 },
  }
};

const FEATURES = [
  { icon: ShoppingBag, title: "Shopify Sync", desc: "Import your entire catalog" },
  { icon: TrendingUp, title: "AI SEO", desc: "Boost your rankings" },
  { icon: Image, title: "Smart Backgrounds", desc: "Pro product photos" },
  { icon: MessageSquare, title: "AI Chat", desc: "24/7 support bot" },
  { icon: BarChart3, title: "Analytics", desc: "Track performance" },
  { icon: Sparkles, title: "Auto Optimize", desc: "Set & forget" },
];

const INTEGRATIONS = ["Shopify", "Google Merchant", "Facebook Ads", "Instagram", "Google Ads", "Meta Pixel"];

export default function MobileAds() {
  const [showPricing, setShowPricing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "business">("pro");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const plan = PLANS[selectedPlan];
      const priceId = billingPeriod === "yearly" ? plan.yearly.usd : plan.monthly.usd;
      
      const { data, error } = await supabase.functions.invoke("create-mobile-checkout", {
        body: { 
          priceId,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/mobileads`
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPrice = () => {
    const plan = PLANS[selectedPlan];
    return billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2 px-4 text-center sticky top-0 z-50">
        <p className="text-sm font-semibold">
          🔥 Flash Sale – <span className="text-yellow-300">70% OFF</span> ends in{" "}
          <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </p>
      </div>

      {/* Hero */}
      <section className="px-4 pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-3 py-1 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">AI-Powered E-commerce</span>
        </div>
        
        <h1 className="text-4xl font-black mb-3 leading-tight tracking-tight">
          10x Your Store<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
            With NewAI
          </span>
        </h1>
        
        <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
          AI SEO, smart backgrounds, automated marketing. Works with Shopify, Facebook & Google.
        </p>
        
        <Button 
          onClick={() => setShowPricing(true)}
          size="lg"
          className="w-full max-w-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-7 rounded-2xl shadow-2xl shadow-violet-500/30 text-lg"
        >
          <Zap className="w-5 h-5 mr-2" />
          Get 70% OFF Now
        </Button>
        
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> 14-day refund</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Cancel anytime</span>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-3.5">
              <f.icon className="w-7 h-7 text-violet-400 mb-2" />
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="px-4 pb-10">
        <h2 className="text-lg font-bold text-center mb-4">Works with your tools</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {INTEGRATIONS.map((name, i) => (
            <span key={i} className="bg-gray-800/80 border border-gray-700/50 px-3 py-1.5 rounded-full text-xs font-medium">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 pb-10">
        <div className="bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex justify-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-sm text-center mb-2">"NewAI doubled my organic traffic in just 2 months. The AI backgrounds are incredible!"</p>
          <p className="text-xs text-gray-400 text-center">— Sarah M., Shopify Merchant</p>
        </div>
      </section>

      {/* Trust */}
      <section className="px-4 pb-36">
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <Shield className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Secure</p>
          </div>
          <div className="text-center">
            <Clock className="w-6 h-6 text-violet-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">5min Setup</p>
          </div>
          <div className="text-center">
            <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Instant</p>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-5 px-4 z-40">
        <Button 
          onClick={() => setShowPricing(true)}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold py-6 rounded-xl shadow-xl shadow-violet-500/25 text-base"
        >
          Redeem 70% OFF – From $2.55/mo
        </Button>
      </div>

      {/* Pricing Dialog */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 border-0 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 p-5 pb-3 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Choose your plan</h2>
              <button onClick={() => setShowPricing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Billing Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mt-3">
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "yearly" ? "bg-white shadow text-violet-600" : "text-gray-600"
                }`}
              >
                Yearly <span className="text-green-600 text-xs">-20%</span>
              </button>
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "monthly" ? "bg-white shadow text-violet-600" : "text-gray-600"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="p-5 space-y-3">
            {(["starter", "pro", "business"] as const).map((key) => {
              const plan = PLANS[key];
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
                  <span className="absolute -top-2.5 left-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    Most Popular
                  </span>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.products}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">
                        ${billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price}
                      </span>
                      <span className="text-gray-500 text-sm">/mo</span>
                    </div>
                    {billingPeriod === "yearly" && (
                      <p className="text-xs text-green-600">Save 20%</p>
                    )}
                  </div>
                </div>
                {selectedPlan === key && (
                  <Check className="absolute top-4 right-4 w-5 h-5 text-violet-600" />
                )}
              </button>
              );
            })}
          </div>

          {/* Features List */}
          <div className="px-5 pb-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">ALL PLANS INCLUDE:</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
              {["AI SEO Optimization", "Smart Backgrounds", "Shopify Integration", "Google Merchant Feed", "Facebook & Instagram", "24/7 AI Chat"].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Button */}
          <div className="sticky bottom-0 bg-white p-5 pt-3 border-t">
            <Button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-6 rounded-xl text-base"
            >
              {isLoading ? "Loading..." : `Get ${PLANS[selectedPlan].name} – $${getCurrentPrice()}/mo`}
            </Button>
            <p className="text-center text-xs text-gray-500 mt-2">
              14-day money-back guarantee • Cancel anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
