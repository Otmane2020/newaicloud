import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Shield, Truck, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  campaign_type: 'product' | 'collection' | 'store';
  headline: string;
  subheadline: string;
  cta_text: string;
}

interface Product {
  id: string;
  title: string;
  image_url: string;
  seo_description: string;
  vendor: string;
}

interface Collection {
  id: string;
  title: string;
  image_url: string;
  seo_description: string;
}

export default function LandingPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    fetchCampaignData();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('ads_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData as Campaign);

      // Fetch campaign products
      const { data: campaignProducts, error: productsError } = await supabase
        .from('ads_campaign_products')
        .select('product_id')
        .eq('campaign_id', campaignId);

      if (productsError) throw productsError;

      if (campaignProducts && campaignProducts.length > 0) {
        const productIds = campaignProducts.map(cp => cp.product_id);
        const { data: productsData, error: prodError } = await supabase
          .from('shopify_products')
          .select('id, title, image_url, seo_description, vendor')
          .in('id', productIds);

        if (prodError) throw prodError;
        setProducts(productsData || []);
      }

      // Fetch campaign collections
      const { data: campaignCollections, error: collectionsError } = await supabase
        .from('ads_campaign_collections')
        .select('collection_id')
        .eq('campaign_id', campaignId);

      if (collectionsError) throw collectionsError;

      if (campaignCollections && campaignCollections.length > 0) {
        const collectionIds = campaignCollections.map(cc => cc.collection_id);
        const { data: collectionsData, error: collError } = await supabase
          .from('shopify_collections')
          .select('id, title, image_url, seo_description')
          .in('id', collectionIds);

        if (collError) throw collError;
        setCollections(collectionsData || []);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Erreur lors du chargement de la campagne');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Campagne introuvable</h2>
            <p className="text-muted-foreground">
              Cette campagne n'existe pas ou n'est plus disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge className="text-base px-4 py-1">
              {campaign.campaign_type === 'product' && 'Produits Sélectionnés'}
              {campaign.campaign_type === 'collection' && 'Collections Exclusives'}
              {campaign.campaign_type === 'store' && 'Découvrez Notre Boutique'}
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
              {campaign.headline}
            </h1>
            
            {campaign.subheadline && (
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                {campaign.subheadline}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" className="text-lg px-8 gap-2 shadow-lg hover:shadow-xl transition-shadow">
                {campaign.cta_text}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <Shield className="w-8 h-8 text-primary mb-2" />
              <span className="font-semibold">Paiement Sécurisé</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Truck className="w-8 h-8 text-primary mb-2" />
              <span className="font-semibold">Livraison Rapide</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-8 h-8 text-primary mb-2" />
              <span className="font-semibold">Garantie Qualité</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Star className="w-8 h-8 text-primary mb-2" />
              <span className="font-semibold">Service Client</span>
            </div>
          </div>
        </div>
      </section>

      {/* Collections Section */}
      {collections.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Nos Collections</h2>
              <p className="text-xl text-muted-foreground">
                Découvrez nos sélections exclusives
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {collections.map((collection) => (
                <Card key={collection.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="aspect-video relative overflow-hidden">
                    {collection.image_url && (
                      <img
                        src={collection.image_url}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2">{collection.title}</h3>
                    {collection.seo_description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {collection.seo_description}
                      </p>
                    )}
                    <Button variant="outline" className="w-full gap-2">
                      Voir la collection
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Produits Sélectionnés</h2>
              <p className="text-xl text-muted-foreground">
                Nos meilleures offres du moment
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="aspect-square relative overflow-hidden">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <CardContent className="p-6">
                    {product.vendor && (
                      <Badge variant="secondary" className="mb-2">
                        {product.vendor}
                      </Badge>
                    )}
                    <h3 className="text-xl font-bold mb-2">{product.title}</h3>
                    {product.seo_description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {product.seo_description}
                      </p>
                    )}
                    <Button className="w-full gap-2">
                      {campaign.cta_text}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Prêt à découvrir nos produits ?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Profitez de nos offres exceptionnelles dès maintenant
              </p>
              <Button size="lg" className="text-lg px-8 gap-2 shadow-lg">
                {campaign.cta_text}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
