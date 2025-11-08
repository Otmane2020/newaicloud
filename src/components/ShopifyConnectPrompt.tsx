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
        // Check if user has already seen the welcome prompt (localStorage)
        const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.id}`);
        if (hasSeenWelcome) {
          setHasChecked(true);
          return;
        }

        // Simple logic: if no store connected, show popup
        const { data: stores } = await supabase
          .from('shopify_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!stores || stores.length === 0) {
          console.log('✅ No Shopify store found, showing welcome popup');
          setOpen(true);
          // Mark as seen in localStorage
          localStorage.setItem(`welcome_seen_${user.id}`, 'true');
        } else {
          console.log('ℹ️ Shopify store already connected, skipping popup');
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('❌ Error checking Shopify connection:', error);
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
        <DialogContent className="sm:max-w-3xl border-0 p-0 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="relative p-12">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_50%)] animate-pulse"></div>
            
            <div className="relative space-y-8">
              {/* Header with icon */}
              <div className="text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl flex items-center justify-center animate-scale-in">
                  <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <DialogTitle className="text-5xl font-bold text-gray-800 drop-shadow-sm animate-fade-in">
                    Welcome to NewAI App
                  </DialogTitle>
                  <DialogDescription className="text-xl text-gray-600 font-medium">
                    Transform Your E-commerce with AI-Powered Optimization
                  </DialogDescription>
                </div>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-blue-100">
                  <Zap className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">Landing Page Optimization</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-indigo-100">
                  <ImagePlus className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">AI Background Generation</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-purple-100">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">Advanced SEO Tools</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-blue-100">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">Automated Blogging</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-indigo-100">
                  <ShoppingCart className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">Google Shopping Feed</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:scale-105 border border-purple-100">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 text-center">
                    <span className="block">Increase Traffic</span>
                    <Badge className="mt-1 bg-green-100 text-green-700 border-green-200">+70%</Badge>
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3 pt-4">
                <Button 
                  onClick={handleBegin} 
                  className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  size="lg"
                >
                  <Sparkles className="w-6 h-6 mr-3" />
                  Start Optimizing Now
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
                <Button 
                  onClick={handleSkip} 
                  variant="ghost" 
                  className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100"
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
