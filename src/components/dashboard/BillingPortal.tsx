import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

export function BillingPortal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Error",
        description: "Unable to open billing portal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Portal</CardTitle>
        <CardDescription>
          Manage your payment methods, view invoices, and update billing information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleOpenPortal}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Billing Portal
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          You will be redirected to Stripe's secure portal
        </p>
      </CardContent>
    </Card>
  );
}