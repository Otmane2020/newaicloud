import { useState, useEffect } from "react";
import { Check, Zap, ShoppingBag, TrendingUp, Bot, Clock, Shield, Star, X, Sparkles, BarChart3, Image, MessageSquare, Globe, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import phoneMockupHero from "@/assets/phone-mockup-hero.png";
import phoneMockupFeatures from "@/assets/phone-mockup-features.png";

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
  { icon: TrendingUp, title: "AI SEO Optimization", desc: "Boost your Google rankings with AI-generated titles, descriptions & meta tags" },
  { icon: Image, title: "Smart Backgrounds", desc: "Transform product photos with AI-generated professional backgrounds" },
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "24/7 customer support automation that sells while you sleep" },
  { icon: Globe, title: "Google Merchant Feed", desc: "Auto-sync optimized products to Google Shopping" },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Shopify Merchant", text: "NewAI doubled my organic traffic in 2 months!", rating: 5 },
  { name: "Marc D.", role: "E-commerce Owner", text: "The AI backgrounds saved me $500/month in photo editing costs.", rating: 5 },
  { name: "Julie P.", role: "Store Manager", text: "Setup took 5 minutes. ROI was visible in 2 weeks.", rating: 5 },
];

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

  const getYearlyTotal = () => {
    const plan = PLANS[selectedPlan];
    return (plan.yearly.price * 12).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 py-2.5 px-4 text-center sticky top-0 z-50">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">🔥 Black Friday Sale</span>
          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">70% OFF</span>
          <span className="text-sm">ends in</span>
          <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-sm font-bold">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-8 pb-4">
        {/* Glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-600/30 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative text-center max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-gray-300">AI-Powered E-commerce</span>
          </div>
          
          <h1 className="text-[2.5rem] leading-[1.1] font-black mb-4 tracking-tight">
            Automate Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              Store Success
            </span>
          </h1>
          
          <p className="text-gray-400 text-sm mb-6 max-w-[280px] mx-auto leading-relaxed">
            AI SEO, smart product backgrounds, merchant feeds & automated marketing. All in one.
          </p>

          {/* Phone Mockup */}
          <div className="relative mx-auto w-[240px] mb-6">
            <img 
              src={phoneMockupHero} 
              alt="NewAI App" 
              className="w-full drop-shadow-2xl"
            />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[180px] h-[60px] bg-violet-500/20 blur-2xl rounded-full" />
          </div>
          
          <Button 
            onClick={() => setShowPricing(true)}
            size="lg"
            className="w-full max-w-[280px] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-7 rounded-2xl shadow-2xl shadow-violet-500/30 text-base"
          >
            <Zap className="w-5 h-5 mr-2" />
            Get 70% OFF Now
          </Button>
          
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> 14-day refund</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Integrations Bar */}
      <section className="py-6 px-4 border-y border-white/5">
        <p className="text-center text-xs text-gray-500 mb-3">Works with your favorite tools</p>
        <div className="flex justify-center gap-4 flex-wrap">
          {["Shopify", "Google Merchant", "Facebook", "Instagram", "Google Ads"].map((name, i) => (
            <span key={i} className="text-xs text-gray-400 font-medium">{name}</span>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 px-4">
        <h2 className="text-2xl font-bold text-center mb-2">Everything you need</h2>
        <p className="text-gray-500 text-sm text-center mb-8">to dominate e-commerce</p>
        
        <div className="space-y-4 max-w-md mx-auto">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-10 px-4 bg-gradient-to-b from-violet-900/20 to-transparent">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">See it in action</h2>
          <p className="text-gray-500 text-sm">Transform your store in minutes</p>
        </div>
        
        <div className="relative mx-auto w-[200px]">
          <img 
            src={phoneMockupFeatures} 
            alt="NewAI Features" 
            className="w-full drop-shadow-2xl"
          />
          <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-10 px-4">
        <h2 className="text-2xl font-bold text-center mb-6">Trusted by 10,000+ merchants</h2>
        
        <div className="space-y-3 max-w-md mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className="flex gap-0.5 mb-2">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-3">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-10 px-4 pb-36">
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Secure<br />Payment</p>
          </div>
          <div className="text-center">
            <Clock className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">5 Minute<br />Setup</p>
          </div>
          <div className="text-center">
            <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Instant<br />Results</p>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent pt-8 pb-5 px-4 z-40">
        <Button 
          onClick={() => setShowPricing(true)}
          className="w-full max-w-md mx-auto block bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold py-6 rounded-xl shadow-xl shadow-violet-500/25 text-base"
        >
          Get 70% OFF – From $2.55/mo
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>

      {/* Pricing/Checkout Dialog */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 border-0 max-h-[95vh] overflow-y-auto gap-0">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b">
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-sm font-bold text-violet-600">NewAI</span>
                <span className="text-sm text-gray-400 ml-1">Checkout</span>
              </div>
              <button onClick={() => setShowPricing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="px-5 py-4 border-b">
            <h3 className="font-bold text-sm mb-3">1. Select Your Plan</h3>
            
            {/* Billing Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "yearly" ? "bg-white shadow text-violet-600" : "text-gray-600"
                }`}
              >
                Yearly <span className="text-green-600 text-xs font-bold">SAVE 20%</span>
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

            {/* Plans */}
            <div className="space-y-2">
              {(["starter", "pro", "business"] as const).map((key) => {
                const plan = PLANS[key];
                const price = billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all relative ${
                      selectedPlan === key 
                        ? "border-violet-500 bg-violet-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        POPULAR
                      </span>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPlan === key ? "border-violet-500 bg-violet-500" : "border-gray-300"
                        }`}>
                          {selectedPlan === key && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{plan.name}</h4>
                          <p className="text-xs text-gray-500">{plan.products}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black">${price}</span>
                        <span className="text-gray-500 text-xs">/mo</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Summary */}
          <div className="px-5 py-4 border-b bg-gray-50">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{PLANS[selectedPlan].name} Plan</span>
              <span className="text-gray-400 line-through">${(getCurrentPrice() * 3.33).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Black Friday Discount</span>
              <span className="text-green-600">-70%</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
              <span>Total</span>
              <span className="text-violet-600">
                ${getCurrentPrice()}/mo
                {billingPeriod === "yearly" && (
                  <span className="text-xs text-gray-500 font-normal ml-1">(${getYearlyTotal()}/yr)</span>
                )}
              </span>
            </div>
          </div>

          {/* Features Included */}
          <div className="px-5 py-4 border-b">
            <p className="text-xs font-semibold text-gray-500 mb-2">INCLUDES:</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
              {["AI SEO Optimization", "Smart Backgrounds", "Shopify Integration", "Google Merchant", "Facebook & Instagram", "24/7 AI Support"].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Button */}
          <div className="sticky bottom-0 bg-white p-5 border-t shadow-lg">
            <Button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-6 rounded-xl text-base"
            >
              {isLoading ? "Processing..." : `Continue to Payment →`}
            </Button>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Shield className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">
                Secure checkout • 14-day money-back guarantee
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
