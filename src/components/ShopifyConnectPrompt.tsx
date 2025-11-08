import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Zap, TrendingUp } from 'lucide-react';
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
        <DialogContent className="sm:max-w-2xl border-0 p-0 overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary via-primary/80 to-secondary p-12 text-center">
            <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
            
            <div className="relative space-y-6">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              </div>
              
              <div className="space-y-3">
                <DialogTitle className="text-4xl font-bold text-white">
                  Welcome to NewAI APP
                </DialogTitle>
                <DialogDescription className="text-xl text-white/90 max-w-lg mx-auto">
                  Let's start optimizing your store and boost your sales with powerful AI-driven SEO tools
                </DialogDescription>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <Zap className="w-6 h-6 text-white mx-auto mb-2" />
                  <p className="text-xs text-white/90 font-medium">AI Powered</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <TrendingUp className="w-6 h-6 text-white mx-auto mb-2" />
                  <p className="text-xs text-white/90 font-medium">Boost Sales</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <Sparkles className="w-6 h-6 text-white mx-auto mb-2" />
                  <p className="text-xs text-white/90 font-medium">SEO Magic</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-4 bg-background">
            <Button 
              onClick={handleBegin} 
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-xl hover:shadow-2xl transition-all"
              size="lg"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={handleSkip} 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
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
