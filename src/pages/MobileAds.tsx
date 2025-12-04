import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, Zap, ShoppingBag, TrendingUp, Clock, Shield, Star, X, Sparkles, BarChart3, Image, MessageSquare, Globe, ChevronRight, Play, Search, FileText, Tags, Home, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { EmbeddedCheckout } from "@/components/mobileads/EmbeddedCheckout";
import phoneHandMockup from "@/assets/phone-hand-mockup.png";
import laptopDashboardMockup from "@/assets/laptop-dashboard-mockup.png";
import { supabase } from "@/integrations/supabase/client";

// Plan interface matching database schema
interface Plan {
  name: string;
  products: string;
  popular?: boolean;
  monthly: { priceId: string; price: number };
  yearly: { priceId: string; price: number; yearlyTotal: number };
}

// Mapping UI plan keys to database plan_ids
const PLAN_DB_MAPPING: Record<string, string> = {
  starter: "starter",      // $9.99/mo, $95.90/year, 100 products
  pro: "pro-500",          // $49/mo, $470.40/year, 1000 products  
  business: "pro-1000",    // $98/mo, $940.80/year, 2000 products
};

// Plan metadata (non-price data)
const PLAN_META: Record<string, { name: string; popular?: boolean }> = {
  starter: { name: "Starter" },
  pro: { name: "Pro", popular: true },
  business: { name: "Business" },
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

// Stats data for hero section
const STATS = [
  { value: "3x", label: "Faster with AI", sublabel: "Automate product entry and optimization" },
  { value: "50%", label: "More Traffic", sublabel: "AI-optimized SEO attracts qualified visitors" },
  { value: "10h+", label: "Saved Weekly", sublabel: "Automated content creation" },
  { value: "Top 10", label: "Google Ranking", sublabel: "Structured data & optimized feeds" },
];

// Real NewAI integration logos
const ShopifyLogo = () => (
  <svg viewBox="0 0 109 124" className="w-6 h-6">
    <path fill="#95BF47" d="M95.6 28.4c-.1-.6-.6-1-1.1-1-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.8-.8-2.3-.5-2.9-.4-.1 0-1.5.5-4 1.2-2.4-6.9-6.6-13.2-14-13.2h-.6c-2.1-2.8-4.7-4-7-4-17.3 0-25.6 21.6-28.2 32.6-6.8 2.1-11.6 3.6-12.2 3.8-3.8 1.2-3.9 1.3-4.4 4.9-.4 2.7-10.3 79.4-10.3 79.4l77.7 14.6 42-9.1S95.7 29 95.6 28.4zM67.3 21.8l-6.5 2c0-1.6 0-3.3-.2-5.2 4.1.6 6.3 3 6.7 3.2zm-11.2-7.4c.2 2.5.2 5.2.1 7.7l-16.8 5.2c3.2-12.6 9.3-18.8 16.7-12.9zm-5.3-7.8c1.1 0 2.1.4 3.1 1.1-8 3.8-16.5 13.3-20.1 32.4l-13.3 4.1C24.8 31.4 34.5 6.6 50.8 6.6z"/>
    <path fill="#5E8E3E" d="M94.5 27.4c-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.3-.3-.7-.4-1.1-.5l-5.9 120.1 42-9.1S95.7 29 95.6 28.4c-.1-.6-.6-1-1.1-1z"/>
    <path fill="#FFF" d="M58 45.8l-5 14.9s-4.4-2.3-9.8-2.3c-7.9.1-8.3 5-8.3 6.2 0 6.8 17.8 9.4 17.8 25.4 0 12.6-8 20.7-18.7 20.7-12.9 0-19.5-8-19.5-8l3.5-11.4s6.8 5.8 12.5 5.8c3.7 0 5.2-2.9 5.2-5.1 0-8.9-14.6-9.3-14.6-23.9 0-12.3 8.8-24.2 26.6-24.2 6.9.1 10.3 1.9 10.3 1.9z"/>
  </svg>
);

// Official Brand Logos
const GoogleMerchantLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#4285F4" d="M22 12l-10 10L2 12l10-10z"/>
    <path fill="#EA4335" d="M12 2L2 12h5l5-5 5 5h5z"/>
    <path fill="#FBBC05" d="M7 12l5 10 5-10H7z"/>
    <path fill="#34A853" d="M12 22l5-10h-5v10z"/>
  </svg>
);

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <defs>
      <linearGradient id="ig-gradient-main" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80"/>
        <stop offset="25%" stopColor="#FCAF45"/>
        <stop offset="50%" stopColor="#F77737"/>
        <stop offset="75%" stopColor="#F56040"/>
        <stop offset="100%" stopColor="#C13584"/>
      </linearGradient>
    </defs>
    <path fill="url(#ig-gradient-main)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

// Only integrations that NewAI actually supports
const INTEGRATIONS = [
  { name: "Shopify", logo: <ShopifyLogo /> },
  { name: "Google Merchant", logo: <GoogleMerchantLogo /> },
  { name: "Facebook", logo: <FacebookLogo /> },
  { name: "Instagram", logo: <InstagramLogo /> },
];

export default function MobileAds() {
  const [showPricing, setShowPricing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "business">("pro");
  const [showCheckout, setShowCheckout] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load plans from database like Onboarding.tsx
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const dbPlanIds = Object.values(PLAN_DB_MAPPING);
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("id, name, price_monthly, price_yearly, max_products, stripe_price_id_monthly, stripe_price_id_yearly")
          .in("id", dbPlanIds);

        if (error) throw error;

        const loadedPlans: Record<string, Plan> = {};
        
        for (const [uiKey, dbId] of Object.entries(PLAN_DB_MAPPING)) {
          const dbPlan = data?.find(p => p.id === dbId);
          if (dbPlan) {
            const yearlyMonthlyEquivalent = dbPlan.price_yearly / 12;
            loadedPlans[uiKey] = {
              name: PLAN_META[uiKey].name,
              products: `${dbPlan.max_products} products`,
              popular: PLAN_META[uiKey].popular,
              monthly: {
                priceId: dbPlan.stripe_price_id_monthly,
                price: dbPlan.price_monthly,
              },
              yearly: {
                priceId: dbPlan.stripe_price_id_yearly,
                price: parseFloat(yearlyMonthlyEquivalent.toFixed(2)),
                yearlyTotal: dbPlan.price_yearly,
              },
            };
          }
        }
        
        setPlans(loadedPlans);
      } catch (error) {
        console.error("Error loading plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

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

  const getCurrentPrice = () => {
    const plan = plans[selectedPlan];
    if (!plan) return 0;
    return billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
  };

  const getYearlyTotal = () => {
    const plan = plans[selectedPlan];
    if (!plan) return 0;
    return plan.yearly.yearlyTotal;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Header with Logo */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              NewAI
            </span>
          </button>
          <Badge className="bg-yellow-400 text-black font-bold text-xs px-2 py-1">
            70% OFF
          </Badge>
        </div>
        {/* Promo Strip */}
        <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">🔥 Black Friday</span>
            <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-xs font-bold">
              {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </header>

      {/* AI-Powered E-commerce Header Section */}
      <section className="py-10 px-4 text-center">
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
        
        <p className="text-gray-400 text-base max-w-md mx-auto">
          AI SEO, smart backgrounds, landing pages & automated marketing. All in one powerful platform.
        </p>
      </section>

      {/* Stats Section - Traffic Machine */}
      <section className="py-8 px-4 bg-gradient-to-b from-violet-900/20 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">
              Traffic Machine{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">With AI</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center hover:border-violet-500/30 transition-colors">
                <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-white mb-0.5">{stat.label}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{stat.sublabel}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <Button 
              onClick={() => setShowPricing(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Now
            </Button>
          </div>
          
          {/* Mini Stats */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            <div className="text-center">
              <div className="text-lg font-bold text-white">10K+</div>
              <div className="text-[10px] text-gray-500">Products Optimized</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">500+</div>
              <div className="text-[10px] text-gray-500">Active Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">95%</div>
              <div className="text-[10px] text-gray-500">Satisfaction Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">24/7</div>
              <div className="text-[10px] text-gray-500">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pt-8 pb-12 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-lg mx-auto">
          {/* Phone Mockup - Hand holding phone */}
          <div className="relative mx-auto w-[280px] sm:w-[320px] mb-8">
            <img 
              src={phoneHandMockup} 
              alt="NewAI App Dashboard" 
              className="w-full drop-shadow-2xl"
            />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[200px] h-[80px] bg-violet-500/30 blur-3xl rounded-full" />
          </div>
          
          <div className="text-center space-y-4">
            <Button 
              onClick={() => setShowPricing(true)}
              size="lg"
              className="w-full max-w-[300px] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-7 rounded-2xl shadow-2xl shadow-violet-500/30 text-base"
            >
              <Zap className="w-5 h-5 mr-2" />
              Get 70% OFF – From $7.99/mo
            </Button>
            
            <Button 
              onClick={() => window.open('https://cal.com/newai/30min?month=2025-01', '_blank')}
              variant="outline"
              size="lg"
              className="w-full max-w-[300px] border-violet-500/50 text-violet-300 hover:bg-violet-500/10 font-bold py-6 rounded-2xl"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book a Demo (30 min)
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> 14-day refund</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations - Phone Mockup Style */}
      <section className="py-12 px-4 border-y border-white/5 bg-gradient-to-b from-transparent via-violet-900/10 to-transparent">
        <p className="text-center text-xs text-gray-500 mb-6 uppercase tracking-wider">Works seamlessly with</p>
        
        {/* Floating logos above phone */}
        <div className="flex justify-center items-center gap-6 flex-wrap mb-8">
          {INTEGRATIONS.map((int, i) => (
            <div key={i} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/30 hover:scale-110 transition-transform">
              {int.logo}
            </div>
          ))}
        </div>

        {/* Phone Mockup with Integrations App */}
        <div className="relative mx-auto w-[260px]">
          {/* Phone Frame */}
          <div className="relative bg-black rounded-[40px] p-2 shadow-2xl shadow-black/50 border border-gray-800">
            {/* Phone Screen */}
            <div className="bg-gradient-to-b from-violet-50 to-white rounded-[32px] overflow-hidden">
              {/* Status Bar */}
              <div className="flex items-center justify-between px-5 py-2 bg-white/80">
                <span className="text-[10px] text-gray-700 font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 bg-gray-700 rounded-sm" />
                </div>
              </div>
              
              {/* Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
              
              {/* App Content */}
              <div className="px-4 pb-6 pt-2">
                {/* App Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-800 text-sm">NewAI</span>
                </div>
                
                <h4 className="font-semibold text-gray-800 text-xs mb-3">Integrations</h4>
                
                {/* Integration Cards Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Shopify", logo: <ShopifyLogo />, status: "Added" },
                    { name: "Google Merchant", logo: <GoogleMerchantLogo />, status: "Added" },
                    { name: "Facebook", logo: <FacebookLogo />, status: "Added" },
                    { name: "Instagram", logo: <InstagramLogo />, status: "Add" },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6">{item.logo}</div>
                        {item.status === "Added" && (
                          <span className="text-[8px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">Added</span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-gray-700">{item.name}</p>
                      {item.status === "Add" && (
                        <button className="mt-1 text-[8px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded">
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Glow effect */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[180px] h-[80px] bg-violet-500/30 blur-3xl rounded-full" />
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

      {/* Before/After Landing Pages */}
      <section className="py-16 px-4 bg-gradient-to-b from-violet-900/10 to-transparent">
        <div className="text-center mb-10">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mb-3">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Magic
          </Badge>
          <h2 className="text-3xl font-bold mb-2">Transform Your Product Pages</h2>
          <p className="text-gray-500">See the difference AI-powered landing pages make</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Before/After Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition" />
              <div className="relative bg-[#0f0f15] rounded-2xl border border-white/10 overflow-hidden">
                <div className="bg-red-500/10 px-4 py-2 border-b border-white/5">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Before</span>
                </div>
                <div className="p-4">
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="w-full h-32 bg-gray-700 rounded-md mb-3 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-500" />
                    </div>
                    <div className="h-3 bg-gray-600 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-600 rounded w-full mb-1" />
                    <div className="h-2 bg-gray-600 rounded w-2/3" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="w-3 h-3 text-red-400" />
                    <span>Plain product page</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <X className="w-3 h-3 text-red-400" />
                    <span>Low conversion rate</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <X className="w-3 h-3 text-red-400" />
                    <span>No SEO optimization</span>
                  </div>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl blur opacity-50 group-hover:opacity-75 transition" />
              <div className="relative bg-[#0f0f15] rounded-2xl border border-green-500/20 overflow-hidden">
                <div className="bg-green-500/10 px-4 py-2 border-b border-green-500/10">
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider">After NewAI</span>
                </div>
                <div className="p-4">
                  <div className="bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 rounded-lg p-3 mb-3">
                    <div className="w-full h-32 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 rounded-md mb-3 flex items-center justify-center border border-violet-500/20">
                      <div className="text-center">
                        <Sparkles className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                        <span className="text-xs text-violet-300">AI Enhanced</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded w-full mb-2" />
                    <div className="h-2 bg-violet-500/50 rounded w-full mb-1" />
                    <div className="h-2 bg-violet-500/30 rounded w-4/5" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Check className="w-3 h-3 text-green-400" />
                    <span>High-converting design</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <Check className="w-3 h-3 text-green-400" />
                    <span>SEO-optimized content</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <Check className="w-3 h-3 text-green-400" />
                    <span>Smart CTAs & trust signals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="text-2xl font-black text-green-400">+180%</div>
              <p className="text-xs text-gray-500 mt-1">Conversion Rate</p>
            </div>
            <div className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="text-2xl font-black text-violet-400">+250%</div>
              <p className="text-xs text-gray-500 mt-1">Organic Traffic</p>
            </div>
            <div className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="text-2xl font-black text-fuchsia-400">5 min</div>
              <p className="text-xs text-gray-500 mt-1">Setup Time</p>
            </div>
          </div>
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
        <div className="max-w-md mx-auto">
          <Button 
            onClick={() => setShowPricing(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold py-6 rounded-xl shadow-xl shadow-violet-500/25 text-base"
          >
            Start Free Trial – 70% OFF
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShopifyLogo />
            <span className="text-xs text-gray-400 font-medium">Built for Shopify</span>
          </div>
        </div>
      </div>

      {/* Pricing Dialog */}
      <Dialog open={showPricing && !showCheckout} onOpenChange={setShowPricing}>
        <DialogContent className="bg-white text-gray-900 max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 border-0 max-h-[95vh] overflow-y-auto gap-0">
          <VisuallyHidden>
            <DialogTitle>Choose Plan</DialogTitle>
            <DialogDescription>Select a subscription plan for NewAI</DialogDescription>
          </VisuallyHidden>
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
              {loadingPlans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              ) : (
                (["starter", "pro", "business"] as const).map((key) => {
                  const plan = plans[key];
                  if (!plan) return null;
                  const price = billingPeriod === "yearly" ? plan.yearly.price : plan.monthly.price;
                  const yearlyTotal = plan.yearly.yearlyTotal;
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
                          {billingPeriod === "yearly" && (
                            <p className="text-[10px] text-gray-400">Billed ${yearlyTotal}/year</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
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
              disabled={loadingPlans || !plans[selectedPlan]}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-base rounded-xl"
            >
              {billingPeriod === "yearly" 
                ? `Continue – $${getYearlyTotal()}/year`
                : `Continue – $${getCurrentPrice()}/mo`
              }
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
          <VisuallyHidden>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Complete your NewAI subscription</DialogDescription>
          </VisuallyHidden>
          
          {plans[selectedPlan] && (
            <EmbeddedCheckout
              selectedPlan={plans[selectedPlan]}
              billingPeriod={billingPeriod}
              onClose={() => {
                setShowCheckout(false);
                setShowPricing(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
