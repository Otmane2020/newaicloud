import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  ShoppingBag, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4 py-24">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-6 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Shopify Optimization
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight">
              Optimize Your Store with{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                AI Intelligence
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl text-gray-300">
              Automate SEO, manage products, create content, and boost sales with intelligent AI tools designed for modern e-commerce.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="group">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary text-primary">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-bold">Everything You Need to Scale</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful tools built for Shopify sellers who want to grow faster
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
                {feature.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-success text-success">Results</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Proven Results for Shopify Stores
            </h2>
            <p className="text-muted-foreground text-lg">
              Join hundreds of sellers who've transformed their stores with AI-powered optimization
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

            <Button size="lg" className="mt-6">
              Start Optimizing Now
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

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to Transform Your Store?
            </h2>
            <p className="text-xl text-gray-300">
              Start your free trial today. No credit card required.
            </p>
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const features = [
  {
    icon: ShoppingBag,
    title: "Product Management",
    description: "Manage products with variants, GTIN generation, and Google Shopping integration",
    tags: ["Multi-vendor", "Variants", "Google"]
  },
  {
    icon: BarChart3,
    title: "Google Merchant Center",
    description: "Generate XML feeds automatically and sync with Google Shopping",
    tags: ["XML Feeds", "Auto-sync"]
  },
  {
    icon: FileText,
    title: "AI Blog SEO",
    description: "Create SEO-optimized blog posts automatically with product linking",
    tags: ["AI Content", "Auto-post"]
  },
  {
    icon: Zap,
    title: "SEO Optimization",
    description: "AI-powered optimization for meta tags, descriptions, and keywords",
    tags: ["Meta Tags", "Keywords"]
  },
  {
    icon: MessageSquare,
    title: "Smart Chat",
    description: "AI assistant for product recommendations and customer support",
    tags: ["AI Chat", "Support"]
  },
  {
    icon: Sparkles,
    title: "Campaign Automation",
    description: "Schedule and automate content creation campaigns",
    tags: ["Automation", "Scheduling"]
  }
];

const benefits = [
  {
    title: "3x Faster Product Listing",
    description: "Automate product data entry and optimization"
  },
  {
    title: "50% More Organic Traffic",
    description: "AI-optimized SEO drives quality visitors"
  },
  {
    title: "Save 10+ Hours Weekly",
    description: "Automated content creation and management"
  },
  {
    title: "Better Google Rankings",
    description: "Structured data and optimized feeds"
  }
];

const stats = [
  { value: "10K+", label: "Products Optimized" },
  { value: "500+", label: "Active Sellers" },
  { value: "95%", label: "Satisfaction Rate" },
  { value: "24/7", label: "AI Support" }
];

export default Index;
