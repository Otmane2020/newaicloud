import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

const Demo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'error' | 'redirecting'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const initDemoSession = async () => {
      try {
        console.log('[Demo] Initiating demo login...');
        
        // Call the demo-login edge function
        const { data, error } = await supabase.functions.invoke('demo-login', {
          body: {}
        });

        if (error) {
          console.error('[Demo] Error from edge function:', error);
          setStatus('error');
          setErrorMessage(error.message || 'Failed to start demo session');
          return;
        }

        if (data?.verifyUrl) {
          console.log('[Demo] Redirecting to verification URL...');
          setStatus('redirecting');
          
          // Redirect to the magic link URL
          window.location.href = data.verifyUrl;
        } else {
          console.error('[Demo] No verification URL received');
          setStatus('error');
          setErrorMessage('Failed to generate demo session');
        }

      } catch (err) {
        console.error('[Demo] Unexpected error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Unexpected error');
      }
    };

    initDemoSession();
  }, []);

  useEffect(() => {
    if (status === 'error') {
      toast.error(t.demo?.error?.title || "Demo Error", {
        description: errorMessage || t.demo?.error?.message || "Could not start demo session"
      });
      
      // Redirect to homepage after error
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [status, errorMessage, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && (t.demo?.loading?.title || "Starting Demo...")}
            {status === 'redirecting' && (t.demo?.redirecting?.title || "Redirecting...")}
            {status === 'error' && (t.demo?.error?.title || "Demo Error")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {(status === 'loading' || status === 'redirecting') && (
            <div className="space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">
                {status === 'loading' 
                  ? (t.demo?.loading?.message || "Preparing your demo experience...")
                  : (t.demo?.redirecting?.message || "Taking you to the dashboard...")
                }
              </p>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-destructive">{errorMessage}</p>
              <p className="text-muted-foreground text-sm">
                {t.demo?.error?.redirect || "Redirecting to homepage..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Demo;
