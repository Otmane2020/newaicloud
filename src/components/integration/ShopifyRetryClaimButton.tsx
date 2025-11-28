import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface ShopifyRetryClaimButtonProps {
  pendingToken?: string;
  onSuccess?: () => void;
}

export function ShopifyRetryClaimButton({ 
  pendingToken: initialPendingToken,
  onSuccess 
}: ShopifyRetryClaimButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleRetryClaim = async () => {
    setIsLoading(true);
    
    try {
      // Try to get pending token from props, URL params, or localStorage
      let pendingToken = initialPendingToken;
      
      if (!pendingToken) {
        const urlParams = new URLSearchParams(window.location.search);
        pendingToken = urlParams.get('shopify_pending') || undefined;
      }
      
      if (!pendingToken) {
        pendingToken = localStorage.getItem('shopify_pending_token') || undefined;
      }

      if (!pendingToken) {
        toast.error(t.shopifyRetryClaim.noPendingConnection, {
          description: t.shopifyRetryClaim.reinstallApp
        });
        setIsLoading(false);
        return;
      }

      console.log('[RETRY-CLAIM] Attempting to claim with token:', pendingToken);

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error(t.shopifyRetryClaim.authRequired, {
          description: t.shopifyRetryClaim.pleaseLogin
        });
        setIsLoading(false);
        return;
      }

      const { data: claimData, error: claimError } = await supabase.functions.invoke(
        'claim-shopify-connection',
        { 
          body: { pendingToken },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (claimError) {
        console.error('[RETRY-CLAIM] Error:', claimError);
        
        const errorMessage = claimError.message || '';
        if (errorMessage.includes('expired') || errorMessage.includes('Token expired')) {
          toast.error(t.shopifyRetryClaim.tokenExpired, {
            description: t.shopifyRetryClaim.reinstallApp
          });
        } else if (errorMessage.includes('Invalid or expired token')) {
          toast.error(t.shopifyRetryClaim.invalidToken, {
            description: t.shopifyRetryClaim.reinstallApp
          });
        } else {
          toast.error(t.shopifyRetryClaim.failedToConnect, {
            description: errorMessage || t.shopifyRetryClaim.tryAgainOrContact
          });
        }
        setIsLoading(false);
        return;
      }

      console.log('[RETRY-CLAIM] Success:', claimData);
      
      // Clear the stored token
      localStorage.removeItem('shopify_pending_token');
      
      toast.success(t.shopifyRetryClaim.storeConnectedSuccess, {
        description: t.shopifyRetryClaim.productsImporting
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to dashboard with trigger flag
        setTimeout(() => {
          window.location.href = '/dashboard?show_shopify_prompt=true';
        }, 1000);
      }

    } catch (error) {
      console.error('[RETRY-CLAIM] Exception:', error);
      toast.error(t.shopifyRetryClaim.connectionFailed, {
        description: error instanceof Error ? error.message : t.shopifyRetryClaim.unexpectedError
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRetryClaim}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? t.shopifyRetryClaim.retrying : t.shopifyRetryClaim.retryConnection}
    </Button>
  );
}