import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      if (!campaignId) return;

      const { data: campaignData, error } = await supabase
        .from('ads_campaigns')
        .select(`
          *,
          ads_campaign_collections(
            collection:shopify_collections(*)
          ),
          ads_campaign_products(
            product:shopify_products(*)
          )
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      setCampaign(campaignData);
      setCollections(campaignData.ads_campaign_collections?.map((c: any) => c.collection) || []);
      setProducts(campaignData.ads_campaign_products?.map((p: any) => p.product) || []);
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campagne introuvable</h1>
          <p className="text-muted-foreground">Cette landing page n'existe pas ou a été supprimée.</p>
        </div>
      </div>
    );
  }

  const highlights = campaign.highlights as any[] || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              {campaign.headline || campaign.name}
            </h1>
            
            {campaign.subheadline && (
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                {campaign.subheadline}
              </p>
            )}

            {campaign.store_summary && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic">
                {campaign.store_summary}
              </p>
            )}
            
            <div className="pt-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
              >
                {campaign.cta_text || 'Découvrir'}
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-primary/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      {highlights.length > 0 && (
        <section className="py-20 bg-secondary/5">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {highlights.map((highlight: any, index: number) => (
                <Card 
                  key={index} 
                  className="p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card/50 backdrop-blur"
                >
                  <div className="text-4xl mb-4">
                    {index === 0 && '⭐'}
                    {index === 1 && '🏪'}
                    {index === 2 && '🚚'}
                    {index === 3 && '✨'}
                    {index > 3 && '💎'}
                  </div>
                  <p className="font-semibold text-sm">{highlight.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collections Section */}
      {collections.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Nos Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {collections.map((collection: any) => (
                <Card 
                  key={collection.id}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  {collection.image_url && (
                    <div className="aspect-square overflow-hidden">
                      <img 
                        src={collection.image_url} 
                        alt={collection.image_alt || collection.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{collection.title}</h3>
                    {collection.body_html && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {collection.body_html.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Voir la collection
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <section className="py-20 bg-secondary/5">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Nos Produits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {products.slice(0, 8).map((product: any) => (
                <Card 
                  key={product.id}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  {product.image_url && (
                    <div className="aspect-square overflow-hidden bg-secondary/20">
                      <img 
                        src={product.image_url} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-2 text-sm">{product.title}</h3>
                    {product.price && (
                      <p className="text-primary font-bold text-lg mb-3">
                        {product.price} {product.currency || 'EUR'}
                      </p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      {campaign.cta_text || 'Voir le produit'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section */}
      <section className="py-32 bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Prêt à découvrir nos produits ?
            </h2>
            <p className="text-xl text-primary-foreground/90">
              Ne manquez pas cette opportunité exclusive
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-12 py-6 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105"
            >
              {campaign.cta_text || 'Découvrir maintenant'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}