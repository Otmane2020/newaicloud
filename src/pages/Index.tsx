import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import PricingComparison from "@/components/PricingComparison";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { DemoSeoComparison } from "@/components/demo/DemoSeoComparison";
import { CalBookingEmbed } from "@/components/CalBookingEmbed";

import { ReferralSystem } from "@/components/dashboard/ReferralSystem";
import { ContactForm } from "@/components/ContactForm";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { formatPrice } from "@/lib/formatUtils";
import { useEffect, useState } from "react";
import { AIAssistant } from "@/components/AIAssistant";
import { LandingPageVisionShowcase } from "@/components/landing/LandingPageVisionShowcase";
import { SHOW_TRIAL_PLAN } from "@/config/features";
import { GoogleTrafficGrowth } from "@/components/landing/GoogleTrafficGrowth";
import { GoogleShoppingSection } from "@/components/landing/GoogleShoppingSection";
import { GooglePhoneMockups } from "@/components/landing/GooglePhoneMockups";
import {
  Zap,
  ShoppingBag,
  BarChart3,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Globe,
  Star,
  ImageIcon,
  Tags,
  TrendingUp,
  Play,
  Clock,
  Shield,
} from "lucide-react";

// Official Integration Logos
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

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
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
      <linearGradient id="ig-gradient-index" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#FCAF45" />
        <stop offset="50%" stopColor="#F77737" />
        <stop offset="75%" stopColor="#F56040" />
        <stop offset="100%" stopColor="#C13584" />
      </linearGradient>
    </defs>
    <path
      fill="url(#ig-gradient-index)"
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
    />
  </svg>
);

const INTEGRATIONS = [
  { name: "Shopify", logo: <ShopifyLogo /> },
  { name: "Google", logo: <GoogleLogo /> },
  { name: "Facebook", logo: <FacebookLogo /> },
  { name: "Instagram", logo: <InstagramLogo /> },
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

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <PublicHeader />

      {/* Hero Section - Impact First */}
      <section id="hero" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Badges Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t.landing.hero.badge}
              </Badge>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-xs text-white/80">Built for</span>
                <img src="/shopify-logo.svg" alt="Shopify e-commerce platform logo" className="h-5 brightness-0 invert" />
              </div>
            </div>

            {/* Main Title - Stronger Message */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t.landing.hero.title}{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                {t.landing.hero.titleHighlight}
              </span>{" "}
              {t.landing.hero.titleEnd}
            </h1>

            {/* Subtitle - More Direct */}
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">{t.landing.hero.subtitle}</p>

            {/* CTA Buttons - Result-Oriented */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                size="lg"
                className="group bg-success hover:bg-success/90 shadow-lg shadow-success/30 text-success-foreground w-full sm:w-auto"
                onClick={() => navigate("/auth?mode=signup")}
              >
                {t.landing.hero.ctaPrimary}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10 w-full sm:w-auto"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="mr-2 w-4 h-4" />
                {t.demo?.button?.label || "Demo"}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>{t.landing.hero.setupTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>{t.landing.hero.noCommitment}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle gradient orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Issues Detected Section - Problem Showing */}
      <section className="py-10 bg-gradient-to-b from-slate-900 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">
                {language === "fr" ? "La plupart des boutiques Shopify souffrent de :" : "Most Shopify stores suffer from:"}
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                language === "fr" ? "Titres et descriptions manquants" : "Missing meta titles & descriptions",
                language === "fr" ? "Images sans texte ALT" : "Images without ALT text",
                language === "fr" ? "Produits non éligibles Google Shopping" : "Products not eligible for Google Shopping",
                language === "fr" ? "Structure SEO interne défaillante" : "Poor internal SEO structure",
              ].map((issue, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="text-destructive text-lg">✗</span>
                  <span className="text-sm text-foreground">{issue}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">
                {language === "fr" ? "NewAI corrige tout ça automatiquement." : "NewAI fixes all of this automatically."}
              </p>
            </div>
          </div>
          
          {/* Social Proof - Compact */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-10 flex-wrap">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">+180%</div>
              <div className="text-[10px] text-muted-foreground">
                {language === "fr" ? "Trafic organique" : "Organic Traffic"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">10K+</div>
              <div className="text-[10px] text-muted-foreground">
                {language === "fr" ? "Produits optimisés" : "Products Optimized"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">500+</div>
              <div className="text-[10px] text-muted-foreground">
                {language === "fr" ? "Boutiques actives" : "Active Stores"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Phone Mockups - Visual Impact */}
      <GooglePhoneMockups />

      {/* Google Shopping Ready */}
      <GoogleShoppingSection />

      {/* Google Traffic Growth */}
      <GoogleTrafficGrowth />

      {/* How It Works - Clean Steps */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-primary text-primary">
              {t.landing.howItWorks.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">{t.landing.howItWorks.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.landing.howItWorks.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {t.landing.howItWorks.steps.map((step: any, index: number) => {
              const icons = [ShoppingBag, Zap, Sparkles, TrendingUp];
              const StepIcon = icons[index];
              return (
                <div key={index} className="relative group">
                  <div className="text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
                    <div className="relative inline-block mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
                        <StepIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features - Clean Cards */}
      <section id="features" className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-primary text-primary">
              {t.landing.features.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">{t.landing.features.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.landing.features.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {t.landing.features.items.map((feature: any, index: number) => {
              const icons = [Zap, ImageIcon, FileText, Tags, BarChart3, Sparkles];
              const FeatureIcon = icons[index];
              return (
                <Card
                  key={index}
                  className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-primary/20"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mb-4 shadow-md shadow-primary/20">
                    <FeatureIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo SEO Comparison Section */}
      <DemoSeoComparison />

      {/* Landing Page Vision AI Showcase */}
      <LandingPageVisionShowcase />

      {/* Book a Demo Section */}
      <section id="demo" className="py-12 sm:py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 space-y-2">
            <Badge variant="outline" className="border-primary text-primary">
              {language === "fr" ? "Découvrir NewAI" : "Discover NewAI"}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">
              {language === "fr" ? "Réservez votre démo gratuite" : "Book your free demo"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {language === "fr"
                ? "30 minutes pour découvrir comment NewAI peut transformer votre boutique"
                : "30 minutes to discover how NewAI can transform your store"}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{language === "fr" ? "Lun-Ven, 10h30-16h30 " : "Mon-Fri, 10:30AM-4:30PM"}</span>
            </div>
          </div>
          <div className="max-w-2xl mx-auto">
            <CalBookingEmbed minimal />
          </div>
        </div>
      </section>

      {/* Benefits Section - Side by Side */}
      <section id="benefits" className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
            <div className="space-y-5">
              <Badge variant="outline" className="border-success text-success">
                {t.landing.benefits.badge}
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold">{t.landing.benefits.title}</h2>
              <p className="text-muted-foreground">{t.landing.benefits.subtitle}</p>

              <div className="space-y-3 pt-2">
                {t.landing.benefits.items.map((benefit: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-background transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button size="lg" className="mt-4" onClick={() => navigate("/auth?mode=signup")}>
                {t.landing.benefits.cta}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-2xl" />
              <Card className="relative p-6 border-2 border-primary/20">
                <div className="grid grid-cols-2 gap-6">
                  {t.landing.benefits.stats.map((stat: any, index: number) => (
                    <div key={index} className="text-center p-4 rounded-xl bg-muted/50">
                      <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Clean Design */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-success text-success">
              {t.landing.testimonials.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">{t.landing.testimonials.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.landing.testimonials.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {t.landing.testimonials.items.map((testimonial: any, index: number) => (
              <Card key={index} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Bar */}
      <section className="py-8 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <span className="text-sm font-medium">{language === "fr" ? "Intégrations" : "Integrations"}:</span>
            <div className="flex items-center gap-6">
              {INTEGRATIONS.map((int, i) => (
                <div key={i} className="flex items-center gap-2">
                  {int.logo}
                  <span className="text-sm font-medium hidden sm:inline">{int.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-primary text-primary">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              {t.landing.pricing.badge}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">{t.landing.pricing.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.landing.pricing.subtitle}</p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.landing.pricing.monthly}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors relative ${
                  billingCycle === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.landing.pricing.yearly}
                <Badge className="absolute -top-2 -right-2 bg-success text-[10px] px-1.5">
                  -20%
                </Badge>
              </button>
            </div>
          </div>

          <div className={`grid sm:grid-cols-2 ${SHOW_TRIAL_PLAN ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5 max-w-6xl mx-auto mb-12`}>
            {[
              ...(SHOW_TRIAL_PLAN ? [{
                key: "trial",
                priceMonthly: 0,
                priceYearly: 0,
                yearlyTotal: 0,
                icon: "🎁",
                featured: false,
                isTrial: true,
                hasPromo: false,
              }] : []),
              {
                key: "starter",
                priceMonthly: 9.99,
                priceYearly: 7.99,
                yearlyTotal: 95.88,
                icon: "🟢",
                featured: false,
                hasPromo: false,
              },
              {
                key: "pro",
                priceMonthly: 49,
                priceYearly: 39,
                yearlyTotal: 468,
                icon: "🟠",
                featured: true,
                hasPromo: false,
              },
              {
                key: "enterprise",
                priceMonthly: 199,
                priceYearly: 159,
                yearlyTotal: 1908,
                icon: "🔵",
                featured: false,
                hasPromo: false,
              },
            ].map((planConfig, index) => {
              const plan = t.landing.pricing.plans[planConfig.key as "trial" | "starter" | "pro" | "enterprise"];
              const price = billingCycle === "monthly" ? planConfig.priceMonthly : planConfig.priceYearly;

              return (
                <Card
                  key={index}
                  className={`p-5 relative ${planConfig.featured ? "border-2 border-primary shadow-lg shadow-primary/10 lg:scale-105" : "border border-border"}`}
                >
                  {plan.badge && (
                    <Badge
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs ${planConfig.featured ? "bg-primary" : "bg-gradient-to-r from-primary to-primary-dark"}`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {planConfig.icon} {plan.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        {!planConfig.isTrial && billingCycle === "yearly" ? (
                          <>
                            <span className="text-3xl font-bold">{formatPrice(planConfig.yearlyTotal, language)}</span>
                            <span className="text-xs text-muted-foreground">{t.landing.pricing.perYear}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">{formatPrice(price, language)}</span>
                            <span className="text-xs text-muted-foreground">{t.landing.pricing.perMonth}</span>
                          </>
                        )}
                      </div>
                      {planConfig.isTrial && (
                        <p className="text-xs text-success mt-1 font-semibold">{t.trial.duration}</p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      variant={planConfig.featured ? "default" : "outline"}
                      onClick={() =>
                        navigate(planConfig.isTrial ? "/auth?mode=signup&plan=trial" : "/auth?mode=signup")
                      }
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>

                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <p className="font-semibold text-xs">{language === "fr" ? "Inclus" : "Included"}:</p>
                      {plan.features.slice(0, 5).map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Detailed Pricing Comparison */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-bold mb-2">{t.landing.pricing.comparisonTitle || "Compare Plans"}</h3>
              <p className="text-sm text-muted-foreground">
                {t.landing.pricing.comparisonSubtitle || "See all features"}
              </p>
            </div>
            <PricingComparison />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <ContactForm />
        </div>
      </section>

      {/* Referral Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <ReferralSystem />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t.landing.cta.title}</h2>
            <p className="text-gray-400">{t.landing.cta.subtitle}</p>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate("/auth?mode=signup")}
            >
              {t.landing.cta.button}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default Index;
