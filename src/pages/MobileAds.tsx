import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Zap,
  ShoppingBag,
  TrendingUp,
  Clock,
  Shield,
  Star,
  X,
  Sparkles,
  BarChart3,
  Image,
  MessageSquare,
  Globe,
  ChevronRight,
  Play,
  Search,
  FileText,
  Tags,
  Home,
  Calendar,
  Loader2,
  ArrowRight,
  Truck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { EmbeddedCheckout } from "@/components/mobileads/EmbeddedCheckout";
import phoneHandMockup from "@/assets/phone-hand-mockup.png";
import laptopDashboardMockup from "@/assets/laptop-dashboard-mockup.png";
import sofaWhiteBgImage from "@/assets/sofa-white-background.jpg";
import sofaWithBgImage from "@/assets/sofa-with-background.jpg";
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
  starter: "starter", // $9.99/mo, $95.90/year, 100 products
  pro: "pro-500", // $49/mo, $470.40/year, 1000 products
  enterprise: "enterprise-2000", // $199/mo, $1910.40/year, 2000 optimizations
};

// Plan metadata (non-price data)
const PLAN_META: Record<string, { name: string; popular?: boolean }> = {
  starter: { name: "Starter" },
  pro: { name: "Pro", popular: true },
  enterprise: { name: "Enterprise" },
};

const FEATURES = [
  {
    icon: Search,
    title: "AI SEO Optimization",
    desc: "Boost rankings with AI-generated titles, descriptions & meta tags optimized for Google",
  },
  {
    icon: Image,
    title: "Smart Backgrounds",
    desc: "Transform product photos with professional AI-generated backgrounds in seconds",
  },
  {
    icon: FileText,
    title: "Landing Pages",
    desc: "Auto-generate high-converting product landing pages that drive sales",
  },
  {
    icon: Tags,
    title: "Smart Tags & Categories",
    desc: "AI-powered product tagging and categorization for better organization",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track your store performance with detailed SEO and conversion analytics",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    desc: "24/7 customer support automation that answers questions and sells",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Shopify Merchant",
    text: "NewAI doubled my organic traffic in just 2 months. The AI SEO is incredible!",
    rating: 5,
  },
  {
    name: "Marc D.",
    role: "E-commerce Owner",
    text: "The smart backgrounds saved me $500/month in photo editing costs. Game changer!",
    rating: 5,
  },
  {
    name: "Julie P.",
    role: "Store Manager",
    text: "Setup took 5 minutes and I saw ROI within 2 weeks. Highly recommend!",
    rating: 5,
  },
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
    <path
      fill="#95BF47"
      d="M95.6 28.4c-.1-.6-.6-1-1.1-1-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.8-.8-2.3-.5-2.9-.4-.1 0-1.5.5-4 1.2-2.4-6.9-6.6-13.2-14-13.2h-.6c-2.1-2.8-4.7-4-7-4-17.3 0-25.6 21.6-28.2 32.6-6.8 2.1-11.6 3.6-12.2 3.8-3.8 1.2-3.9 1.3-4.4 4.9-.4 2.7-10.3 79.4-10.3 79.4l77.7 14.6 42-9.1S95.7 29 95.6 28.4zM67.3 21.8l-6.5 2c0-1.6 0-3.3-.2-5.2 4.1.6 6.3 3 6.7 3.2zm-11.2-7.4c.2 2.5.2 5.2.1 7.7l-16.8 5.2c3.2-12.6 9.3-18.8 16.7-12.9zm-5.3-7.8c1.1 0 2.1.4 3.1 1.1-8 3.8-16.5 13.3-20.1 32.4l-13.3 4.1C24.8 31.4 34.5 6.6 50.8 6.6z"
    />
    <path
      fill="#5E8E3E"
      d="M94.5 27.4c-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.3-.3-.7-.4-1.1-.5l-5.9 120.1 42-9.1S95.7 29 95.6 28.4c-.1-.6-.6-1-1.1-1z"
    />
    <path
      fill="#FFF"
      d="M58 45.8l-5 14.9s-4.4-2.3-9.8-2.3c-7.9.1-8.3 5-8.3 6.2 0 6.8 17.8 9.4 17.8 25.4 0 12.6-8 20.7-18.7 20.7-12.9 0-19.5-8-19.5-8l3.5-11.4s6.8 5.8 12.5 5.8c3.7 0 5.2-2.9 5.2-5.1 0-8.9-14.6-9.3-14.6-23.9 0-12.3 8.8-24.2 26.6-24.2 6.9.1 10.3 1.9 10.3 1.9z"
    />
  </svg>
);

// Official Brand Logos
const GoogleMerchantLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#4285F4" d="M22 12l-10 10L2 12l10-10z" />
    <path fill="#EA4335" d="M12 2L2 12h5l5-5 5 5h5z" />
    <path fill="#FBBC05" d="M7 12l5 10 5-10H7z" />
    <path fill="#34A853" d="M12 22l5-10h-5v10z" />
  </svg>
);

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <defs>
      <linearGradient id="ig-gradient-main" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#FCAF45" />
        <stop offset="50%" stopColor="#F77737" />
        <stop offset="75%" stopColor="#F56040" />
        <stop offset="100%" stopColor="#C13584" />
      </linearGradient>
    </defs>
    <path
      fill="url(#ig-gradient-main)"
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
    />
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
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "enterprise">("pro");
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
          .select(
            "id, name, price_monthly, price_yearly, max_products, stripe_price_id_monthly, stripe_price_id_yearly",
          )
          .in("id", dbPlanIds);

        if (error) throw error;

        const loadedPlans: Record<string, Plan> = {};

        for (const [uiKey, dbId] of Object.entries(PLAN_DB_MAPPING)) {
          const dbPlan = data?.find((p) => p.id === dbId);
          if (dbPlan) {
            const yearlyMonthlyEquivalent = dbPlan.price_yearly / 12;
            // Custom labels for each plan
            const productLabels: Record<string, string> = {
              starter: "100 products",
              pro: "1,000 products",
              enterprise: "2,000 optimizations/month",
            };
            loadedPlans[uiKey] = {
              name: PLAN_META[uiKey].name,
              products: productLabels[uiKey] || `${dbPlan.max_products} products`,
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
      setCountdown((prev) => {
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
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Header with Logo */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
              NewAI
            </span>
          </button>
          <Badge className="bg-yellow-400 text-black font-bold text-xs px-2 py-1">70% OFF</Badge>
        </div>
        {/* Promo Strip */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 py-2 px-4 text-center text-white">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">🔥 Hot Sales </span>
            <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-xs font-bold">
              {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:
              {String(countdown.seconds).padStart(2, "0")}
            </span>
          </div>
        </div>
      </header>

      {/* AI-Powered E-commerce Header Section */}
      <section className="py-10 px-4 text-center bg-gradient-to-b from-violet-50 to-white">
        <Badge className="bg-violet-100 border-violet-200 text-violet-700 mb-4">
          <Sparkles className="w-3 h-3 mr-1.5" />
          AI-Powered E-commerce
        </Badge>

        <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] mb-4 text-gray-900">
          Automate Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500">
            Store Success
          </span>
        </h1>

        <p className="text-gray-600 text-base max-w-md mx-auto">
          AI SEO, smart backgrounds, landing pages & automated marketing. All in one powerful platform.
        </p>
      </section>

      {/* Stats Section - Traffic Machine */}
      <section className="py-8 px-4 bg-gradient-to-b from-violet-50/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-gray-900">
              Traffic Machine{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">
                With AI
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-violet-300 transition-colors shadow-sm"
              >
                <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-gray-900 mb-0.5">{stat.label}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Button
              onClick={() => setShowPricing(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Now
            </Button>
          </div>

          {/* Mini Stats */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">10K+</div>
              <div className="text-[10px] text-gray-500">Products Optimized</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">500+</div>
              <div className="text-[10px] text-gray-500">Active Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">95%</div>
              <div className="text-[10px] text-gray-500">Satisfaction Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">24/7</div>
              <div className="text-[10px] text-gray-500">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Search Traffic Progression with Growth Curve */}
      <section className="py-10 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Google Search{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">
                Traffic Growth
              </span>
            </h2>
          </div>

          {/* Growth Curve Chart */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-5 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Search Console Impressions
              </span>
              <Badge className="bg-green-100 text-green-700 text-xs">+500%</Badge>
            </div>

            {/* SVG Growth Curve */}
            <div className="relative h-40 w-full">
              <svg viewBox="0 0 400 160" className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="40" x2="400" y2="40" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="80" x2="400" y2="80" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />

                {/* Gradient definition */}
                <defs>
                  <linearGradient id="growthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                  d="M0,140 L0,140 Q50,138 80,135 Q120,130 160,120 Q200,100 240,70 Q280,40 320,25 Q360,15 400,10 L400,160 L0,160 Z"
                  fill="url(#areaGradient)"
                />

                {/* Growth curve line */}
                <path
                  d="M0,140 Q50,138 80,135 Q120,130 160,120 Q200,100 240,70 Q280,40 320,25 Q360,15 400,10"
                  fill="none"
                  stroke="url(#growthGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Data points */}
                <circle cx="0" cy="140" r="4" fill="#3b82f6" />
                <circle cx="80" cy="135" r="4" fill="#3b82f6" />
                <circle cx="160" cy="120" r="4" fill="#60a5fa" />
                <circle cx="240" cy="70" r="4" fill="#4ade80" />
                <circle cx="320" cy="25" r="4" fill="#22c55e" />
                <circle cx="400" cy="10" r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 -ml-1">
                <span>10K</span>
                <span>5K</span>
                <span>1K</span>
                <span>200</span>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-2">
              <span>Month 1</span>
              <span>Month 2</span>
              <span>Month 3</span>
              <span>Month 4</span>
              <span>Month 5</span>
              <span>Month 6</span>
            </div>
          </div>

          {/* Before/After comparison */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Before NewAI</div>
              <div className="text-2xl font-black text-gray-400">~200</div>
              <div className="text-xs text-gray-500">visits/month</div>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-xl p-4 text-center border border-green-200">
              <div className="text-xs text-green-600 mb-1">After 6 months</div>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                10K+
              </div>
              <div className="text-xs text-green-600">visits/month</div>
            </div>
          </div>

          {/* Google benefits */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <Search className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs font-semibold text-gray-900">Rich Snippets</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs font-semibold text-gray-900">SEO Optimized</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl">
              <Star className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-xs font-semibold text-gray-900">Top Rankings</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pt-8 pb-12 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-200/50 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-lg mx-auto">
          {/* Phone Mockup - Hand holding phone */}
          <div className="relative mx-auto w-[280px] sm:w-[320px] mb-8">
            <img src={phoneHandMockup} alt="NewAI App Dashboard" className="w-full drop-shadow-2xl" />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[200px] h-[80px] bg-violet-400/30 blur-3xl rounded-full" />
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
              onClick={() => window.open("https://cal.com/new-ai-isgo1m/30min?overlayCalendar=true", "_blank")}
              variant="outline"
              size="lg"
              className="w-full max-w-[300px] border-violet-400 text-violet-600 hover:bg-violet-50 font-bold py-6 rounded-2xl"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book a Demo (30 min)
            </Button>

            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" /> 14-day refund
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations - Phone Mockup Style */}
      <section className="py-12 px-4 border-y border-gray-200 bg-gradient-to-b from-transparent via-violet-50/30 to-transparent">
        <p className="text-center text-xs text-gray-500 mb-6 uppercase tracking-wider">Works seamlessly with</p>

        {/* Floating logos above phone */}
        <div className="flex justify-center items-center gap-6 flex-wrap mb-8">
          {INTEGRATIONS.map((int, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200 hover:scale-110 transition-transform"
            >
              {int.logo}
            </div>
          ))}
        </div>

        {/* Phone Mockup with Integrations App */}
        <div className="relative mx-auto w-[260px]">
          {/* Phone Frame */}
          <div className="relative bg-gray-900 rounded-[40px] p-2 shadow-2xl border border-gray-700">
            {/* Phone Screen */}
            <div className="bg-gradient-to-b from-violet-50 to-white rounded-[32px] overflow-hidden">
              {/* Status Bar */}
              <div className="flex items-center justify-between px-5 py-2 bg-white/80">
                <span className="text-[10px] text-gray-900 font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 bg-gray-900 rounded-sm" />
                </div>
              </div>

              {/* Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full" />

              {/* App Content */}
              <div className="px-4 pb-6 pt-2">
                {/* App Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">NewAI</span>
                </div>

                <h4 className="font-semibold text-gray-900 text-xs mb-3">Integrations</h4>

                {/* Integration Cards Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Shopify", logo: <ShopifyLogo />, status: "Added" },
                    { name: "Google Merchant", logo: <GoogleMerchantLogo />, status: "Added" },
                    { name: "Facebook", logo: <FacebookLogo />, status: "Added" },
                    { name: "Instagram", logo: <InstagramLogo />, status: "Add" },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6">{item.logo}</div>
                        {item.status === "Added" && (
                          <span className="text-[8px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                            Added
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-gray-900">{item.name}</p>
                      {item.status === "Add" && (
                        <button className="mt-1 text-[8px] text-violet-600 font-semibold bg-violet-100 px-2 py-0.5 rounded">
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
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[180px] h-[80px] bg-violet-400/30 blur-3xl rounded-full" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="text-center mb-10">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 mb-3">Features</Badge>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Everything You Need</h2>
          <p className="text-gray-500">to dominate e-commerce with AI</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-violet-300 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mb-3">
                <f.icon className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="font-bold mb-1 text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before/After Landing Pages - Home Page Style */}
      <section className="py-16 px-4 bg-gradient-to-b from-violet-50/50 to-white">
        <div className="text-center mb-10">
          <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0 mb-3">
            <Eye className="w-3 h-3 mr-1" />
            AI Magic
          </Badge>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Transform Your Product Pages</h2>
          <p className="text-gray-500">See the difference AI-powered landing pages make</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Before/After Cards - Same style as home page */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border shadow-sm text-xs">
                  Before
                </Badge>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
                {/* Product Image - White/Studio Background */}
                <div className="aspect-[16/10] bg-white overflow-hidden relative">
                  <img
                    src={sofaWhiteBgImage}
                    alt="Product on white background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-muted-foreground text-[10px] backdrop-blur-sm shadow border"
                    >
                      White Background
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Premium Velvet Sofa</h3>
                    <p className="text-gray-500 text-sm">Modern Design Collection</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">$1,299</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shadow-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Buy Now
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-500 text-sm font-mono bg-gray-50 p-3 rounded-lg leading-relaxed">
                      Gray velvet sofa, 3 seats, wooden legs, 220x85x90cm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0 shadow-lg text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  After NewAI
                </Badge>
              </div>
              <div className="rounded-xl border-2 border-violet-300 bg-white shadow-xl overflow-hidden h-full ring-4 ring-violet-100">
                {/* Product Image - Generated Background */}
                <div className="aspect-[16/10] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
                  <img
                    src={sofaWithBgImage}
                    alt="Premium Velvet Sofa with AI generated background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] backdrop-blur-sm shadow border-0">
                      <Sparkles className="w-3 h-3 mr-1" /> AI Generated
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs mb-2">
                      <Sparkles className="w-3 h-3 mr-1" /> Premium
                    </Badge>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Premium Velvet Sofa</h3>
                    <p className="text-gray-500 text-sm">Modern Design Collection</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">$1,299</span>
                    <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow">
                      Buy Now
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-lg p-4 border border-violet-100">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Discover exceptional comfort with our Premium Velvet Sofa. Elegant curves, premium velvet, and
                      expert craftsmanship.
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <Truck className="w-3 h-3" /> Free Shipping
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" /> 5-Year Warranty
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" /> Best Seller
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-2xl font-black text-green-600">+180%</div>
              <p className="text-xs text-gray-500 mt-1">Conversion Rate</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-2xl font-black text-violet-600">+250%</div>
              <p className="text-xs text-gray-500 mt-1">Organic Traffic</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-2xl font-black text-fuchsia-600">5 min</div>
              <p className="text-xs text-gray-500 mt-1">Setup Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview - Laptop */}
      <section className="py-16 px-4 bg-gradient-to-b from-violet-50/50 to-transparent">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Powerful Dashboard</h2>
          <p className="text-gray-500">Manage everything from one place</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <img src={laptopDashboardMockup} alt="NewAI Dashboard" className="w-full rounded-lg shadow-2xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="text-center mb-10">
          <Badge className="bg-green-100 text-green-700 border-green-200 mb-3">Testimonials</Badge>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Loved by 10,000+ Merchants</h2>
          <p className="text-gray-500">See what our customers say</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4 text-gray-500">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
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
            <Shield className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              Secure
              <br />
              Payment
            </p>
          </div>
          <div className="text-center">
            <Clock className="w-10 h-10 text-violet-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              5 Minute
              <br />
              Setup
            </p>
          </div>
          <div className="text-center">
            <Zap className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              Instant
              <br />
              Results
            </p>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4 z-40">
        <div className="max-w-md mx-auto">
          <Button
            onClick={() => setShowPricing(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-bold py-6 rounded-xl shadow-xl shadow-violet-500/25 text-base text-white"
          >
            Start Free Trial – 70% OFF
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShopifyLogo />
            <span className="text-xs text-gray-500 font-medium">Built for Shopify</span>
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
                (["starter", "pro", "enterprise"] as const).map((key) => {
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
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedPlan === key ? "border-violet-500 bg-violet-500" : "border-gray-300"
                            }`}
                          >
                            {selectedPlan === key && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <h4 className="font-bold">{plan.name}</h4>
                            <p className="text-xs text-gray-500">{plan.products}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black">${price.toFixed(2)}</span>
                          <span className="text-gray-500 text-sm">/mo</span>
                          {billingPeriod === "yearly" && (
                            <p className="text-[10px] text-gray-400">Billed ${yearlyTotal.toFixed(2)}/year</p>
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
                {[
                  "AI SEO Optimization",
                  "Smart Backgrounds",
                  "Landing Pages",
                  "Google Merchant",
                  "Facebook & Instagram",
                  "Priority Support",
                ].map((f, i) => (
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
                ? `Continue – $${getYearlyTotal().toFixed(2)}/year`
                : `Continue – $${getCurrentPrice().toFixed(2)}/mo`}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <p className="text-center text-xs text-gray-500 mt-3">🔒 Secure payment • 14-day money-back guarantee</p>
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
