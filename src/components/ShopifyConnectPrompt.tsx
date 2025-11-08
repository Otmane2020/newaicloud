import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function ShopifyConnectPrompt() {
  const [open, setOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkShopifyConnection = async () => {
      if (!user || hasChecked) return;

      // Vérifier si on a déjà montré ce popup
      const hasSeenPrompt = localStorage.getItem('hasSeenShopifyPrompt');
      if (hasSeenPrompt) {
        setHasChecked(true);
        return;
      }

      try {
        const { data: stores } = await supabase
          .from('shopify_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!stores || stores.length === 0) {
          setOpen(true);
          localStorage.setItem('hasSeenShopifyPrompt', 'true');
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking Shopify connection:', error);
        setHasChecked(true);
      }
    };

    checkShopifyConnection();
  }, [user, hasChecked]);

  const handleConnect = () => {
    setOpen(false);
    navigate('/account?tab=integrations');
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Connecter votre boutique Shopify</DialogTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="pt-4">
            Pour profiter pleinement de Wope SEO, connectez votre boutique Shopify et commencez à optimiser vos produits.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          <Button onClick={handleConnect} className="w-full" size="lg">
            <Store className="w-4 h-4 mr-2" />
            Connecter ma boutique
          </Button>
          <Button onClick={handleSkip} variant="ghost" className="w-full">
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
