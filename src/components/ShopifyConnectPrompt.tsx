import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShopifyConnectionWizard } from './integration/ShopifyConnectionWizard';

export function ShopifyConnectPrompt() {
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkShopifyConnection = async () => {
      if (!user || hasChecked) return;

      try {
        const { data: stores } = await supabase
          .from('shopify_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!stores || stores.length === 0) {
          setOpen(true);
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking Shopify connection:', error);
        setHasChecked(true);
      }
    };

    checkShopifyConnection();
  }, [user, hasChecked]);

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
        <DialogContent className="sm:max-w-lg border-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome to Wope SEO! 🎉
              </DialogTitle>
              <DialogDescription className="text-base">
                Let's start optimizing your store and boost your sales with powerful SEO tools
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-3 pt-6">
            <Button 
              onClick={handleBegin} 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              Begin Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={handleSkip} 
              variant="ghost" 
              className="w-full"
            >
              I'll do this later
            </Button>
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
