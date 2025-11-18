import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleWizard } from './ArticleWizard';

export function QuickPress() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    loadStoreId();
  }, [user]);

  useEffect(() => {
    if (user?.id && storeId) {
      loadCollections();
    }
  }, [user, storeId]);

  const loadStoreId = async () => {
    try {
      const { data } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (data) setStoreId(data.id);
    } catch (error) {
      console.error('Error loading store:', error);
    }
  };

  const loadCollections = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    try {
      console.log('Loading collections for user:', user?.id, 'store:', storeId);
      
      let query = supabase
        .from('shopify_collections')
        .select('id, title, products_count')
        .eq('user_id', user.id);
      
      // Filter by store if available
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query.order('title');

      console.log('Collections query result:', { data, error, count: data?.length });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('No collections found. Please import from Shopify.');
      }
      
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800 p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Quick Press Pro</h2>
              <p className="text-muted-foreground text-lg mb-4">
                Créez des articles professionnels optimisés SEO en quelques clics
              </p>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
                Notre assistant intelligent vous guide pas à pas : sélection de collection, choix du layout,
                personnalisation des couleurs, sélection des produits, et génération d'un article complet
                avec images, table des matières et galeries interactives.
              </p>
            </div>
            <Button
              onClick={() => setWizardOpen(true)}
              size="lg"
              className="text-lg px-8 py-6"
            >
              <Zap className="w-6 h-6 mr-2" />
              Démarrer l'assistant
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">✨ Design Professionnel</h3>
            <p className="text-sm text-muted-foreground">
              3 layouts et 5 palettes de couleurs inspirés des plus grands magazines
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">📸 Galeries Interactives</h3>
            <p className="text-sm text-muted-foreground">
              Images cliquables et galeries élégantes pour tous vos produits
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">🎯 SEO Optimisé</h3>
            <p className="text-sm text-muted-foreground">
              Mots-clés intelligents, meta descriptions et structure parfaite
            </p>
          </Card>
        </div>
      </div>

      <ArticleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        collections={collections}
        userId={user?.id || ''}
        storeId={storeId}
      />
    </>
  );
}
