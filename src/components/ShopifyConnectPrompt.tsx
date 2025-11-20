import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShopifyConnectionWizard } from './integration/ShopifyConnectionWizard';

export function ShopifyConnectPrompt() {
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const checkShopifyConnection = async () => {
      // CONDITION 1: User must be logged in
      if (!user) {
        console.log('⏭️ User not logged in, skipping Shopify prompt');
        return;
      }

      // Check for URL parameter to force show
      const searchParams = new URLSearchParams(location.search);
      const forceShow = searchParams.get('show_shopify_prompt') === 'true';

      // Session-based check to avoid spamming (1 hour cooldown)
      const skipKey = `shopify_prompt_checked_${user.id}`;
      const lastCheck = sessionStorage.getItem(skipKey);
      
      if (!forceShow && lastCheck && Date.now() - parseInt(lastCheck) < 3600000) {
        return;
      }

      // Show on important pages where users might need Shopify, but NOT on onboarding/checkout
      const allowedPaths = ['/dashboard', '/products', '/seo', '/integration'];
      const excludedPaths = ['/onboarding'];
      const isAllowedPath = allowedPaths.includes(location.pathname);
      const isExcludedPath = excludedPaths.includes(location.pathname);
      
      if ((!isAllowedPath || isExcludedPath) && !forceShow) {
        return;
      }

      try {
        // CONDITION 2: Check if store is connected
        const { data: stores } = await supabase
          .from('shopify_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Only show if NO store connected
        if (!stores || stores.length === 0) {
          console.log('✅ User logged in + No store connected → showing popup');
          setOpen(true);
        } else {
          console.log('ℹ️ Shopify store already connected, skipping popup');
        }
        
        sessionStorage.setItem(skipKey, Date.now().toString());
      } catch (error) {
        console.error('❌ Error checking Shopify connection:', error);
        sessionStorage.setItem(skipKey, Date.now().toString());
      }
    };

    checkShopifyConnection();
  }, [user, location.pathname, location.search]);

  const handleBegin = () => {
    setOpen(false);
    setWizardOpen(true);
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md border border-border bg-background">
          <div className="flex flex-col items-center text-center space-y-6 py-6">
            {/* Shopify Logo/Icon */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-8 h-8 text-primary" />
            </div>
            
            {/* Title */}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold">
                Connectez votre boutique Shopify
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Synchronisez vos produits et commencez à optimiser votre e-commerce avec l'IA
              </DialogDescription>
            </DialogHeader>

            {/* Actions */}
            <div className="w-full space-y-3 pt-2">
              <Button 
                onClick={handleBegin} 
                className="w-full bg-[#5C6AC4] hover:bg-[#4E5AB5] text-white"
                size="lg"
              >
                Connecter ma boutique
              </Button>
              <Button 
                onClick={handleSkip} 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Plus tard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShopifyConnectionWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
      />
    </>
  );
}
