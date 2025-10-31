import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import PricingComparison from "@/components/PricingComparison";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
  CreditCard,
  Star,
  ImageIcon,
  Search,
  Tags,
  TrendingUp,
  Play
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4 py-24">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-6 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              🚀 AI-Powered E-commerce Optimization
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight">
              Transform Your Shopify Store Into a{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                Traffic Machine
              </span>{" "}
              With AI
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl text-gray-300">
              Automate SEO optimization, generate high-quality content, and boost your organic traffic. Get your first results in under 5 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="group bg-primary hover:bg-primary/90 shadow-glow" onClick={() => navigate('/auth?mode=signup')}>
                Start Free Trial — 14 Days Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-300 pt-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Setup in 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary text-primary">Process</Badge>
          <h2 className="text-4xl md:text-5xl font-bold">4 Simple Steps to Success</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From installation to results in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-glow">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
              {index < 3 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 bg-gradient-subtle">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-primary text-primary">Key Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">What Our AI Actually Does</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Concrete actions that boost your SEO and drive traffic
            </p>
          </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-primary transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 bg-card"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-success text-success">Testimonials</Badge>
          <h2 className="text-4xl md:text-5xl font-bold">Trusted by E-commerce Stores</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See what store owners say about NewAI
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 space-y-4 border-2 hover:border-primary/30 transition-colors">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {testimonial.author[0]}
                </div>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-24 bg-gradient-subtle">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-success text-success">Results</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Proven results for Shopify stores
            </h2>
            <p className="text-muted-foreground text-lg">
              Join hundreds of sellers who have transformed their store with AI optimization
            </p>
            
            <div className="space-y-4 pt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-6" onClick={() => navigate('/auth?mode=signup')}>
              Start now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
            <Card className="relative p-8 space-y-6 border-2 border-primary/20">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary text-primary">
            <Globe className="w-4 h-4 mr-2" />
            Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">Plans & Pricing</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the plan that fits your store size. All plans include Shopify integration and dedicated support.
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <Badge className="absolute -top-2 -right-2 bg-success text-xs">-20%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {pricingPlans.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            
            return (
              <Card 
                key={index}
                className={`p-8 relative ${plan.featured ? 'border-2 border-primary shadow-primary scale-105' : 'border-2 border-transparent'}`}
              >
                {plan.badge && (
                  <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badgeColor || 'bg-gradient-primary'}`}>
                    {plan.badge}
                  </Badge>
                )}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold">{plan.icon} {plan.name}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">${price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm text-success mt-1">
                        billed annually (i.e. ${plan.yearlyTotal}/year)
                      </p>
                    )}
                    {plan.trial && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.trial}
                      </p>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={plan.featured ? "default" : "outline"}
                    size="lg"
                    onClick={() => navigate('/auth?mode=signup')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  {plan.highlight && (
                    <p className="text-sm text-muted-foreground italic">
                      💡 {plan.highlight}
                    </p>
                  )}

                  <div className="space-y-3 pt-6 border-t">
                    <p className="font-semibold text-sm">Included in the plan:</p>
                    {plan.features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-2">Plan Comparison Table</h3>
            <p className="text-muted-foreground">Compare all features in detail</p>
          </div>
          <PricingComparison />
        </div>

      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to transform your store?
            </h2>
            <p className="text-xl text-gray-300">
              Start your 14-day free trial today.
            </p>
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90" onClick={() => navigate('/auth?mode=signup')}>
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

const howItWorksSteps = [
  {
    icon: ShoppingBag,
    title: "Install from Shopify",
    description: "One-click installation directly from the Shopify App Store"
  },
  {
    icon: Search,
    title: "AI Scans Your Store",
    description: "Our AI analyzes all your products and identifies optimization opportunities"
  },
  {
    icon: Sparkles,
    title: "Get Recommendations",
    description: "Receive actionable AI-powered suggestions to improve your SEO"
  },
  {
    icon: TrendingUp,
    title: "See Results",
    description: "Watch your traffic and rankings improve within days"
  }
];

const features = [
  {
    icon: Search,
    title: "Auto Meta Tag Analysis",
    description: "AI scans and optimizes all your meta titles, descriptions, and keywords for maximum search visibility",
    tags: ["SEO", "Automation", "Analytics"]
  },
  {
    icon: ImageIcon,
    title: "Image ALT Optimization",
    description: "Advanced Vision AI analyzes your product images visually and generates contextual, SEO-optimized ALT text based on actual image content and product details",
    tags: ["Vision AI", "Image Analysis", "Visual Recognition"]
  },
  {
    icon: FileText,
    title: "SEO Content Generation",
    description: "Create high-quality, SEO-optimized product descriptions and blog articles that rank",
    tags: ["Content", "AI Writing", "Blog"]
  },
  {
    icon: Tags,
    title: "Smart Tagging System",
    description: "AI-powered automatic tagging for better product organization and discoverability",
    tags: ["Tags", "Organization"]
  },
  {
    icon: BarChart3,
    title: "Google Merchant Feed",
    description: "Automatic XML feed generation and real-time sync with Google Shopping",
    tags: ["Google", "Shopping", "Feed"]
  },
  {
    icon: Sparkles,
    title: "Full Automation",
    description: "Set it and forget it. AI continuously optimizes your store in the background",
    tags: ["Automation", "AI", "24/7"]
  }
];

const testimonials = [
  {
    quote: "Our organic traffic increased by 180% in just 2 months. The AI does all the heavy lifting!",
    author: "Sarah Chen",
    role: "Fashion Store Owner"
  },
  {
    quote: "I save 15+ hours every week on SEO. The ROI is incredible. Best investment for my store.",
    author: "Marcus Johnson",
    role: "Electronics Retailer"
  },
  {
    quote: "Finally ranked on Google's first page! The AI knew exactly what to optimize. Game changer.",
    author: "Emma Rodriguez",
    role: "Home Decor Shop"
  }
];

const benefits = [
  {
    title: "3x Faster",
    description: "Automate product entry and optimization"
  },
  {
    title: "50% More traffic",
    description: "AI-optimized SEO attracts qualified visitors"
  },
  {
    title: "10h+ saved",
    description: "Automated content creation and management"
  },
  {
    title: "Better Google ranking",
    description: "Structured data and optimized feeds"
  }
];

const stats = [
  { value: "10K+", label: "Products Optimized" },
  { value: "500+", label: "Active Sellers" },
  { value: "95%", label: "Satisfaction Rate" },
  { value: "24/7", label: "AI Support" }
];

const pricingPlans = [
  {
    name: "Starter",
    icon: "🟢",
    description: "For small stores wanting to discover the power of AI",
    priceMonthly: 9.99,
    priceYearly: 7.99,
    yearlyTotal: 95.88,
    trial: "14-day free trial",
    cta: "Start Free Trial",
    featured: false,
    badge: null,
    highlight: "Enjoy the power of AI with essential features and quotas tailored to your start.",
    features: [
      "100 analyzed products",
      "100 AI SEO optimizations / month (titles, meta, ALT, tags)",
      "1 AI article / month",
      "20 Shopify AI searches / month",
      "50 AI Chat responses / month",
      "1 Shopify store connected",
      "Basic automation (SEO + blog + chat)",
      "Email support"
    ]
  },
  {
    name: "Pro",
    icon: "🟠",
    description: "For growing stores",
    priceMonthly: 49,
    priceYearly: 39,
    yearlyTotal: 468,
    trial: null,
    cta: "Try for free",
    featured: true,
    badge: "Most Popular 🔥",
    badgeColor: "bg-primary",
    highlight: "The perfect balance between power, automation, and scalability.",
    features: [
      "1,000 analyzed products",
      "500 AI SEO optimizations / month",
      "5 AI articles / month",
      "3 automatic AI campaigns / month (up to 30 articles/campaign)",
      "300 Shopify AI searches / month",
      "500 AI Chat responses / month",
      "Up to 2 Shopify stores connected",
      "Integrated Google Merchant Center",
      "Full automation (SEO + blog + chat)",
      "24/7 priority support"
    ]
  },
  {
    name: "Enterprise",
    icon: "🔵",
    description: "For large stores and agencies",
    priceMonthly: 199,
    priceYearly: 159,
    yearlyTotal: 1908,
    trial: null,
    cta: "Contact us",
    featured: false,
    badge: null,
    highlight: "Fully managed AI suite with high quotas, API access, and personal support.",
    features: [
      "Unlimited products",
      "2,000 AI SEO optimizations / month",
      "20 AI articles / month",
      "10 automatic AI campaigns / month (up to 30 articles/campaign)",
      "2,000 Shopify AI searches / month",
      "3,000 AI Chat responses / month",
      "Up to 5 Shopify stores connected",
      "Multi-stores & custom API access",
      "Dedicated account manager",
      "Custom training sessions",
      "Guaranteed SLA"
    ]
  }
];

export default Index;