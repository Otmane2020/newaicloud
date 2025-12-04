import { useState, useEffect } from "react";
import { Check, Zap, ShoppingBag, TrendingUp, Bot, Clock, Shield, Star, ChevronDown, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// Stripe Price IDs - Yearly plans (default)
const PRICE_IDS = {
  yearly: {
    usd: "price_1SXVNXEfti9t9nN9UlFZWukM", // ~$152.83/year = $12.74/month
    eur: "price_1SXVNXEfti9t9nN9h9qzwtxW"
  },
  monthly: {
    usd: "price_1SXVNWEfti9t9nN91PsPoSZo", // $15.92/month
    eur: "price_1SXVNWEfti9t9nN9hRUP9ILe"
  }
};

const FEATURES = [
  { icon: ShoppingBag, title: "Shopify Integration", desc: "Sync your entire catalog instantly" },
  { icon: TrendingUp, title: "SEO Optimization", desc: "AI-powered titles & descriptions" },
  { icon: Bot, title: "AI Chat Assistant", desc: "24/7 customer support automation" },
  { icon: Sparkles, title: "Product Backgrounds", desc: "Generate stunning visuals" },
];

const INTEGRATIONS = [
  "Shopify", "Google Merchant", "Facebook Ads", "Instagram", "Google Ads"
];

export default function MobileAds() {
  const [showPricing, setShowPricing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });

  // Countdown timer
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
      const priceId = PRICE_IDS[billingPeriod].usd;
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/mobileads`
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const yearlyPrice = 12.74;
  const monthlyPrice = 15.92;
  const savings = Math.round(((monthlyPrice * 12 - yearlyPrice * 12) / (monthlyPrice * 12)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 py-2 px-4 text-center sticky top-0 z-50">
        <p className="text-sm font-medium">
          🔥 Black Friday Sale – <span className="text-yellow-300 font-bold">up to 70% OFF</span>
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="px-4 pt-8 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">AI-Powered E-commerce</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 leading-tight">
            Boost Your Store with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">NewAI</span>
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Transform your Shopify store with AI SEO, smart backgrounds, and automated marketing.
          </p>
          
          <Button 
            onClick={() => setShowPricing(true)}
            className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold py-6 rounded-xl shadow-lg shadow-purple-500/25"
          >
            <Zap className="w-5 h-5 mr-2" />
            Get 70% OFF Now
          </Button>
          
          <p className="text-xs text-gray-500 mt-3">14-day money-back guarantee</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">Everything you need</h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <feature.icon className="w-8 h-8 text-purple-400 mb-2" />
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="px-4 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">Integrations</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {INTEGRATIONS.map((name, i) => (
            <span key={i} className="bg-gray-800 px-3 py-1.5 rounded-full text-xs">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 pb-12">
        <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 border border-purple-500/20 rounded-xl p-6 text-center">
          <div className="flex justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-sm mb-3">"NewAI doubled my organic traffic in 2 months!"</p>
          <p className="text-xs text-gray-400">— Sarah M., Shopify Merchant</p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-4 pb-32">
        <div className="flex justify-center gap-6 text-center">
          <div>
            <Shield className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Secure</p>
          </div>
          <div>
            <Check className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">14-day Refund</p>
          </div>
          <div>
            <Zap className="w-6 h-6 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Instant Setup</p>
          </div>
        </div>
      </section>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-4 z-40">
        <Button 
          onClick={() => setShowPricing(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-purple-500/30"
        >
          Redeem 70% OFF
        </Button>
        <p className="text-center text-xs text-gray-500 mt-2">14-day money-back guarantee</p>
      </div>

      {/* Pricing Popup */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 gap-0 border-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold">Pricing options</DialogTitle>
              <button onClick={() => setShowPricing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="px-6 space-y-3">
            {/* Yearly Option - Default Selected */}
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                billingPeriod === "yearly" 
                  ? "border-purple-500 bg-purple-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 line-through text-sm">$42</span>
                    <span className="font-bold text-lg">${yearlyPrice}/month</span>
                    <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                      {savings}% OFF
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Pay yearly.</p>
                </div>
                {billingPeriod === "yearly" && (
                  <Check className="w-5 h-5 text-purple-600" />
                )}
              </div>
            </button>

            {/* Monthly Option */}
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                billingPeriod === "monthly" 
                  ? "border-purple-500 bg-purple-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 line-through text-sm">$53</span>
                    <span className="font-bold text-lg">${monthlyPrice}/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Pay monthly.</p>
                </div>
                {billingPeriod === "monthly" && (
                  <Check className="w-5 h-5 text-purple-600" />
                )}
              </div>
            </button>
          </div>

          <div className="p-6 pt-4">
            <Button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-6 rounded-xl"
            >
              {isLoading ? "Loading..." : `Get NewAI for $${billingPeriod === "yearly" ? yearlyPrice : monthlyPrice}/m`}
            </Button>
            <p className="text-center text-xs text-gray-500 mt-3">
              You will be redirected to checkout. All purchases are backed by our unconditional 14-day money-back guarantee.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
