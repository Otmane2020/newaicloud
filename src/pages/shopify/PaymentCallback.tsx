import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ShopifyPaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalisation du paiement...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const shop = searchParams.get('shop');
        const userId = searchParams.get('user_id');
        const plan = searchParams.get('plan');
        const subscriptionStatus = searchParams.get('subscription');
        const error = searchParams.get('error');

        console.log('[PaymentCallback] Params:', { shop, userId, plan, subscriptionStatus, error });

        // Handle error redirect
        if (error) {
          setStatus('error');
          setMessage(`Erreur: ${error}`);
          setTimeout(() => navigate('/app/setup-wizard?error=' + error), 2000);
          return;
        }

        // Check if already authenticated
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log('[PaymentCallback] Already authenticated, redirecting to dashboard');
          setStatus('success');
          setMessage('Redirection vers le tableau de bord...');
          setTimeout(() => navigate('/dashboard-light?subscription=active&plan=' + plan), 500);
          return;
        }

        // Need to create session via quick-login
        if (!shop || !userId) {
          console.error('[PaymentCallback] Missing shop or user_id');
          setStatus('error');
          setMessage('Paramètres manquants');
          setTimeout(() => navigate('/app/setup-wizard?error=missing_params'), 2000);
          return;
        }

        setMessage('Authentification en cours...');

        // Call quick-login to get session tokens
        const { data, error: loginError } = await supabase.functions.invoke('shopify-quick-login', {
          body: { shop, user_id: userId }
        });

        if (loginError || !data?.success) {
          console.error('[PaymentCallback] Quick login failed:', loginError || data?.error);
          setStatus('error');
          setMessage('Erreur d\'authentification');
          setTimeout(() => navigate('/app/setup-wizard?error=auth_failed'), 2000);
          return;
        }

        // Set the session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          console.error('[PaymentCallback] Failed to set session:', sessionError);
          setStatus('error');
          setMessage('Erreur de session');
          setTimeout(() => navigate('/app/setup-wizard?error=session_failed'), 2000);
          return;
        }

        console.log('[PaymentCallback] ✅ Session created successfully');
        setStatus('success');
        setMessage('Paiement confirmé ! Redirection...');

        // Small delay for session to propagate
        await new Promise(resolve => setTimeout(resolve, 200));

        // Redirect to dashboard
        navigate('/dashboard-light?subscription=active&plan=' + plan, { replace: true });

      } catch (err) {
        console.error('[PaymentCallback] Exception:', err);
        setStatus('error');
        setMessage('Une erreur est survenue');
        setTimeout(() => navigate('/app/setup-wizard?error=unexpected'), 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        )}
        {status === 'success' && (
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        )}
        {status === 'error' && (
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
