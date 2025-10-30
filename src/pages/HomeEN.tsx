import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const HomeEN = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <div className="flex justify-center mb-6">
              <LanguageSwitcher />
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Optimize your Shopify store
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Boost your visibility with our AI-powered SEO optimization platform
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Start for free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/features')}>
                Learn more
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-background rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Automated SEO</h3>
                <p className="text-muted-foreground">
                  Automatically optimize your products for search engines
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Google Shopping</h3>
                <p className="text-muted-foreground">
                  Sync your products with Google Merchant Center
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">SEO Blog</h3>
                <p className="text-muted-foreground">
                  Create optimized content to improve your rankings
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomeEN;
