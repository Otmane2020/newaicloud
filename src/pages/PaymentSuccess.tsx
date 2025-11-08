import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleManualSync = async () => {
    if (!user?.id) return;
    
    setSyncing(true);
    try {
      console.log('🔄 Manually syncing subscription with Stripe...');
      
      const { data, error } = await supabase.functions.invoke('fix-subscription-sync');
      
      if (error) throw error;
      
      console.log('✅ Sync result:', data);
      
      if (data.success) {
        toast.success(data.message || 'Synchronisation réussie !');
        // Wait a bit then redirect
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        toast.error(data.message || 'Échec de la synchronisation');
      }
    } catch (err) {
      console.error('❌ Sync error:', err);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds (15 x 2s)

    const checkSubscription = async () => {
      try {
        console.log(`🔄 Checking subscription status (attempt ${attempts + 1}/${maxAttempts})...`);
        
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching profile:', fetchError);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkSubscription, 2000);
          } else {
            setError(true);
            setChecking(false);
          }
          return;
        }

        console.log('✅ Profile data:', {
          status: data?.subscription_status,
          plan: data?.current_plan_id,
          attempt: attempts + 1
        });

        if (data?.subscription_status === 'active' || 
            data?.subscription_status === 'trialing') {
          console.log('🎉 Active subscription found! Redirecting to dashboard...');
          toast.success("Abonnement activé ! Redirection...");
          navigate('/dashboard');
        } else if (attempts >= maxAttempts) {
          console.log('⏱️ Timeout reached, showing error message');
          setError(true);
          setChecking(false);
        } else {
          attempts++;
          setTimeout(checkSubscription, 2000);
        }
      } catch (err) {
        console.error('💥 Unexpected error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSubscription, 2000);
        } else {
          setError(true);
          setChecking(false);
        }
      }
    };

    checkSubscription();
  }, [user?.id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8">
        {checking && !error && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">
              🎉 Paiement confirmé !
            </h2>
            <p className="text-muted-foreground">
              Activation de votre abonnement en cours...
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Cela ne devrait prendre que quelques secondes.
            </p>
          </div>
        )}
        
        {error && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold">
              Problème de synchronisation
            </h2>
            <p className="text-muted-foreground">
              Votre paiement a été accepté sur Stripe mais la synchronisation avec votre compte prend plus de temps que prévu.
            </p>
            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleManualSync}
                disabled={syncing}
                className="w-full"
                size="lg"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchronisation en cours...
                  </>
                ) : (
                  '🔄 Synchroniser avec Stripe'
                )}
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
                disabled={syncing}
              >
                Aller au tableau de bord
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              Si le problème persiste, contactez le support avec votre email : {user?.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
