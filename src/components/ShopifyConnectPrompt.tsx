import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Zap, TrendingUp, ImagePlus, FileText, ShoppingCart, BarChart3 } from 'lucide-react';
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
        <DialogContent className="sm:max-w-3xl border-0 p-0 overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary">
          <div className="relative p-12">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse"></div>
            
            <div className="relative space-y-8">
              {/* Header with icon */}
              <div className="text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center animate-scale-in">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <DialogTitle className="text-5xl font-bold text-white drop-shadow-lg animate-fade-in">
                    Welcome to NewAI App
                  </DialogTitle>
                  <DialogDescription className="text-xl text-white font-medium drop-shadow-md">
                    Transform Your E-commerce with AI-Powered Optimization
                  </DialogDescription>
                </div>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">Landing Page Optimization</p>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <ImagePlus className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">AI Background Generation</p>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">Advanced SEO Tools</p>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <FileText className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">Automated Blogging</p>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <ShoppingCart className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">Google Shopping Feed</p>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-white">
                  <BarChart3 className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground text-center">
                    <span className="block">Increase Traffic</span>
                    <Badge className="mt-1 bg-success text-success-foreground">+70%</Badge>
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3 pt-4">
                <Button 
                  onClick={handleBegin} 
                  className="w-full h-16 text-xl font-bold bg-white text-primary hover:bg-white/90 shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
                  size="lg"
                >
                  <Sparkles className="w-6 h-6 mr-3" />
                  Start Optimizing Now
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
                <Button 
                  onClick={handleSkip} 
                  variant="ghost" 
                  className="w-full text-white hover:text-white hover:bg-white/10"
                >
                  I'll connect my store later
                </Button>
              </div>
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
